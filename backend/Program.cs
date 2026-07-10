using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NWebDav.Server;
using NWebDav.Server.Stores;
using NzbWebDAV.Api.SabControllers;
using NzbWebDAV.Auth;
using NzbWebDAV.Clients.Rclone;
using NzbWebDAV.Clients.Usenet;
using NzbWebDAV.Config;
using NzbWebDAV.Database;
using NzbWebDAV.Extensions;
using NzbWebDAV.Middlewares;
using NzbWebDAV.Queue;
using NzbWebDAV.Services;
using NzbWebDAV.Utils;
using NzbWebDAV.WebDav;
using NzbWebDAV.WebDav.Base;
using NzbWebDAV.Websocket;
using Serilog;
using Serilog.Events;
using Serilog.Templates;
using Serilog.Templates.Themes;

namespace NzbWebDAV;

class Program
{
    static async Task Main(string[] args)
    {
        // Update thread-pool
        var coreCount = Environment.ProcessorCount;
        var minThreads = Math.Max(coreCount * 2, 50); // 2x cores, minimum 50
        var maxThreads = Math.Max(coreCount * 50, 1000); // 50x cores, minimum 1000
        ThreadPool.SetMinThreads(minThreads, minThreads);
        ThreadPool.SetMaxThreads(maxThreads, maxThreads);

        // Initialize logger
        var defaultLevel = LogEventLevel.Information;
        var envLevel = EnvironmentUtil.GetEnvironmentVariable("LOG_LEVEL");
        var level = Enum.TryParse<LogEventLevel>(envLevel, true, out var parsed) ? parsed : defaultLevel;
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Is(level)
            .MinimumLevel.Override("NWebDAV", AtLeast(level, LogEventLevel.Warning))
            .MinimumLevel.Override("Microsoft", AtLeast(level, LogEventLevel.Information))
            .MinimumLevel.Override("Microsoft.AspNetCore.Hosting", AtLeast(level, LogEventLevel.Warning))
            .MinimumLevel.Override("Microsoft.AspNetCore.Mvc", AtLeast(level, LogEventLevel.Warning))
            .MinimumLevel.Override("Microsoft.AspNetCore.Routing", AtLeast(level, LogEventLevel.Warning))
            .MinimumLevel.Override("Microsoft.AspNetCore.DataProtection", AtLeast(level, LogEventLevel.Error))
            .WriteTo.Console(new ExpressionTemplate(
                "[{@t:HH:mm:ss} {@l:u3}] " +
                "{#if SourceContext is not null}" +
                "{Substring(SourceContext, LastIndexOf(SourceContext, '.') + 1)}: " +
                "{#end}{@m}\n{@x}",
                theme: TemplateTheme.Code))
            .CreateLogger();

        try
        {
            Log.Information(
                "Starting NzbDav {Version} with config at {ConfigPath}; minimum log level is {LogLevel}",
                ConfigManager.AppVersion,
                DavDatabaseContext.ConfigPath,
                level);

            // Block upgrades to version 0.6.x
            BlockUpgradesToV06X();

            // initialize database
            await using var databaseContext = new DavDatabaseContext();
            await databaseContext.Database
                .ExecuteSqlRawAsync(
                    "PRAGMA journal_mode = WAL;",
                    SigtermUtil.GetCancellationToken())
                .ConfigureAwait(false);

            // run database migration, if necessary.
            if (args.Contains("--db-migration"))
            {
                var argIndex = args.ToList().IndexOf("--db-migration");
                var targetMigration = args.Length > argIndex + 1 ? args[argIndex + 1] : null;
                Log.Information(
                    "Applying database migrations{Target}",
                    targetMigration is null ? string.Empty : $" through {targetMigration}");
                await databaseContext.Database
                    .MigrateAsync(targetMigration, SigtermUtil.GetCancellationToken())
                    .ConfigureAwait(false);
                Log.Information("Database migrations completed");
                await PerformDatabaseVacuumIfEnabled();
                return;
            }

            // initialize the config-manager
            var configManager = new ConfigManager();
            await configManager.LoadConfig().ConfigureAwait(false);

            // initialize rclone client
            RcloneClient.Initialize(configManager);

            // initialize websocket-manager
            var websocketManager = new WebsocketManager();

            // initialize webapp
            var builder = WebApplication.CreateBuilder(args);
            var maxRequestBodySize = EnvironmentUtil.GetLongVariable("MAX_REQUEST_BODY_SIZE") ?? 100 * 1024 * 1024;
            builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maxRequestBodySize);
            builder.Host.UseSerilog();
            builder.Services.AddControllers();
            builder.Services.AddHealthChecks();
            builder.Services
                .AddWebdavBasicAuthentication(configManager)
                .AddSingleton(configManager)
                .AddSingleton(websocketManager)
                .AddSingleton<UsenetStreamingClient>()
                .AddSingleton<QueueManager>()
                .AddHostedService<HealthCheckService>()
                .AddHostedService<ArrMonitoringService>()
                .AddHostedService<BlobCleanupService>()
                .AddHostedService<NzbBlobCleanupService>()
                .AddHostedService<HistoryCleanupService>()
                .AddHostedService<DavCleanupService>()
                .AddHostedService<UsenetFileToBlobstoreMigrationService>()
                .AddHostedService<RemoveOrphanedFilesSchedulerService>()
                .AddScoped<DavDatabaseContext>()
                .AddScoped<DavDatabaseClient>()
                .AddScoped<DatabaseStore>()
                .AddScoped<IStore, DatabaseStore>()
                .AddScoped<GetAndHeadHandlerPatch>()
                .AddScoped<SabApiController>()
                .AddNWebDav(opts =>
                {
                    opts.Handlers["GET"] = typeof(GetAndHeadHandlerPatch);
                    opts.Handlers["HEAD"] = typeof(GetAndHeadHandlerPatch);
                    opts.Filter = opts.GetFilter();
                    opts.RequireAuthentication = !WebApplicationAuthExtensions
                        .IsWebdavAuthDisabled();
                });

            // run
            var app = builder.Build();
            _ = app.Services.GetRequiredService<QueueManager>();
            app.UseMiddleware<ExceptionMiddleware>();
            app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });
            app.MapHealthChecks("/health");
            app.Map("/ws", websocketManager.HandleRoute);
            app.MapControllers();
            app.UseWebdavBasicAuthentication();
            app.UseNWebDav();
            app.Lifetime.ApplicationStopping.Register(SigtermUtil.Cancel);
            await app.RunAsync().ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            Log.Fatal(exception, "NzbDav terminated unexpectedly");
            throw;
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }

    private static LogEventLevel AtLeast(LogEventLevel configured, LogEventLevel minimum)
    {
        return configured > minimum ? configured : minimum;
    }

    private static void BlockUpgradesToV06X()
    {
        // If the database file doesn't exist.
        // Then this is a new installation.
        // Do nothing.
        if (!File.Exists(DavDatabaseContext.DatabaseFilePath)) return;

        // If there is no pending database migration,
        // Then the user has already upgraded.
        // Do nothing.
        using var databaseContext = new DavDatabaseContext();
        const string migration = "20260226053712_Add-NzbBlobId-And-NzbNames";
        var hasPendingMigration = databaseContext.Database.GetPendingMigrations().Contains(migration);
        if (!hasPendingMigration) return;

        // If the user has set the UPGRADE env variable,
        // Then they have acknowledged the upgrade message.
        // Do nothing.
        var upgradeEnv = EnvironmentUtil.GetEnvironmentVariable("UPGRADE");
        if (upgradeEnv == "0.6.0") return;

        // Otherwise, display the upgrade message, and exit.
        Log.Fatal(
            """
            Version 0.6.0 of nzbdav is NOT backwards compatible.
            You can upgrade, but you won't be able to downgrade.
            Make a backup of your entire /config directory prior to upgrading.
            The only way to downgrade back to a previous version is by restoring this backup.
            To acknowledge this message and continue upgrading, set the env variable UPGRADE=0.6.0
            """
        );
        Log.CloseAndFlush();
        Environment.Exit(1);
    }

    private static async Task PerformDatabaseVacuumIfEnabled()
    {
        var configManager = new ConfigManager();
        await configManager.LoadConfig().ConfigureAwait(false);
        if (configManager.IsDatabaseStartupVacuumEnabled())
        {
            Log.Information("Performing database vacuum");
            await using var databaseContext = new DavDatabaseContext();
            await databaseContext.Database.ExecuteSqlRawAsync("VACUUM;");
            Log.Information("Database vacuum completed");
        }
    }
}