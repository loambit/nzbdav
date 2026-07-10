using Microsoft.AspNetCore.Http;
using NzbWebDAV.Api.SabControllers.AddFile;
using NzbWebDAV.Config;
using NzbWebDAV.Extensions;
using NzbWebDAV.Utils;
using System.Net;
using System.Net.Sockets;

namespace NzbWebDAV.Api.SabControllers.AddUrl;

public class AddUrlRequest() : AddFileRequest
{
    private static readonly HttpClient HttpClientInstance = InitializeHttpClient();
    private const int MaxAutomaticRedirections = 10;

    public static async Task<AddUrlRequest> New(HttpContext context, ConfigManager configManager)
    {
        var nzbUrl = context.GetRequestParam("name");
        var nzbName = context.GetRequestParam("nzbname");
        var userAgent = configManager.GetUserAgent();
        var nzbFile = await GetNzbFile(nzbUrl, nzbName, userAgent, context.RequestAborted).ConfigureAwait(false);
        return new AddUrlRequest()
        {
            FileName = nzbFile.FileName,
            ContentType = nzbFile.ContentType,
            NzbFileStream = nzbFile.FileStream,
            Category = context.GetRequestParam("cat") ?? configManager.GetManualUploadCategory(),
            Priority = MapPriorityOption(context.GetRequestParam("priority")),
            PostProcessing = MapPostProcessingOption(context.GetRequestParam("pp")),
            CancellationToken = context.RequestAborted
        };
    }

    private static async Task<NzbFileResponse> GetNzbFile(
        string? url,
        string? nzbName,
        string userAgent,
        CancellationToken cancellationToken
    )
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
                throw new Exception($"The url is invalid.");

            var response = await GetAsync(url, userAgent, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                response.Dispose();
                throw new Exception($"Received status code {response.StatusCode}.");
            }

            var contentType = response.Content.Headers.ContentType?.MediaType;

            var fileName = AddNzbExtension(nzbName)
                           ?? GetFilenameFromResponseHeader(response)
                           ?? GetFilenameFromUrl(url)
                           ?? throw new Exception("Nzb filename could not be determined.");

            var fileStream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);

            return new NzbFileResponse
            {
                FileName = fileName,
                ContentType = contentType,
                FileStream = fileStream
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new BadHttpRequestException($"Failed to fetch nzb-file url `{url}`: {ex.Message}");
        }
    }

    private static string? AddNzbExtension(string? nzbName)
    {
        return nzbName == null ? null
            : nzbName.ToLower().EndsWith("nzb") ? nzbName
            : $"{nzbName}.nzb";
    }

    private static async Task<HttpResponseMessage> GetAsync(
        string url,
        string userAgent,
        CancellationToken cancellationToken
    )
    {
        var currentUri = ValidateHttpUri(url);

        for (var redirectCount = 0; ; redirectCount++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, currentUri);
            if (!string.IsNullOrWhiteSpace(userAgent))
                request.Headers.TryAddWithoutValidation("User-Agent", userAgent);

            var response = await HttpClientInstance.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            ).ConfigureAwait(false);

            if (!IsRedirect(response) || response.Headers.Location is null)
                return response;

            if (redirectCount >= MaxAutomaticRedirections)
            {
                response.Dispose();
                throw new HttpRequestException($"The maximum number of redirects ({MaxAutomaticRedirections}) was exceeded.");
            }

            Uri redirectUri;
            try
            {
                redirectUri = response.Headers.Location.IsAbsoluteUri
                    ? ValidateHttpUri(response.Headers.Location)
                    : ValidateHttpUri(new Uri(currentUri, response.Headers.Location));

                if (
                    currentUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
                    && redirectUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                    && !EnvironmentUtil.IsVariableTrue("ALLOW_HTTPS_TO_HTTP_REDIRECTS")
                )
                {
                    throw new HttpRequestException("Redirecting from HTTPS to HTTP is not allowed.");
                }
            }
            catch
            {
                response.Dispose();
                throw;
            }

            response.Dispose();
            currentUri = redirectUri;
        }
    }

    private static HttpClient InitializeHttpClient()
    {
        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false,
            ConnectCallback = ConnectToValidatedAddress,
        };
        return new HttpClient(handler);
    }

    private static async ValueTask<Stream> ConnectToValidatedAddress(
        SocketsHttpConnectionContext context,
        CancellationToken cancellationToken
    )
    {
        var host = context.DnsEndPoint.Host;
        IPAddress[] addresses;

        if (IPAddress.TryParse(host, out var literalAddress))
        {
            addresses = [literalAddress];
        }
        else
        {
            addresses = await Dns.GetHostAddressesAsync(host, cancellationToken).ConfigureAwait(false);
        }

        if (addresses.Length == 0)
            throw new HttpRequestException($"The host `{host}` did not resolve to an IP address.");

        if (addresses.Any(address => !IsPublicAddress(address)))
            throw new HttpRequestException($"The host `{host}` resolved to a non-public IP address.");

        Exception? lastException = null;
        foreach (var address in addresses.Distinct())
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp)
            {
                NoDelay = true
            };

            try
            {
                await socket.ConnectAsync(
                    new IPEndPoint(address, context.DnsEndPoint.Port),
                    cancellationToken
                ).ConfigureAwait(false);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                lastException = ex;
                socket.Dispose();
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        }

        throw new HttpRequestException($"Could not connect to the host `{host}`.", lastException);
    }

    private static Uri ValidateHttpUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            throw new HttpRequestException("The URL is invalid.");

        return ValidateHttpUri(uri);
    }

    private static Uri ValidateHttpUri(Uri uri)
    {
        if (
            !uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new HttpRequestException("Only HTTP and HTTPS URLs are allowed.");
        }

        if (string.IsNullOrWhiteSpace(uri.Host) || uri.HostNameType == UriHostNameType.Unknown)
            throw new HttpRequestException("The URL host is invalid.");

        return uri;
    }

    private static bool IsRedirect(HttpResponseMessage response)
    {
        return (int)response.StatusCode is 301 or 302 or 303 or 307 or 308;
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            return bytes[0] switch
            {
                0 or 10 or 127 => false,
                100 when bytes[1] is >= 64 and <= 127 => false,
                169 when bytes[1] == 254 => false,
                172 when bytes[1] is >= 16 and <= 31 => false,
                192 when bytes[1] == 0 && bytes[2] == 0 => bytes[3] is 9 or 10,
                192 when bytes[1] == 0 && bytes[2] == 2 => false,
                192 when bytes[1] == 88 && bytes[2] == 99 => false,
                192 when bytes[1] == 168 => false,
                198 when bytes[1] is 18 or 19 => false,
                198 when bytes[1] == 51 && bytes[2] == 100 => false,
                203 when bytes[1] == 0 && bytes[2] == 113 => false,
                >= 224 => false,
                _ => true
            };
        }

        if (address.AddressFamily != AddressFamily.InterNetworkV6)
            return false;

        // Globally routable IPv6 unicast is currently allocated from 2000::/3.
        if ((bytes[0] & 0xe0) != 0x20)
            return false;

        if (HasPrefix(bytes, [0x20, 0x01, 0x00, 0x00], 32)) // Teredo
            return false;
        if (HasPrefix(bytes, [0x20, 0x01, 0x00, 0x02, 0x00, 0x00], 48)) // Benchmarking
            return false;
        if (HasPrefix(bytes, [0x20, 0x01, 0x00, 0x10], 28)) // ORCHID
            return false;
        if (HasPrefix(bytes, [0x20, 0x01, 0x00, 0x20], 28)) // ORCHIDv2
            return false;
        if (HasPrefix(bytes, [0x20, 0x01, 0x0d, 0xb8], 32)) // Documentation
            return false;
        if (HasPrefix(bytes, [0x20, 0x02], 16)) // 6to4
            return false;
        if (HasPrefix(bytes, [0x3f, 0xff, 0x00], 20)) // Documentation
            return false;

        return true;
    }

    private static bool HasPrefix(byte[] address, byte[] prefix, int prefixLength)
    {
        var wholeBytes = prefixLength / 8;
        for (var index = 0; index < wholeBytes; index++)
        {
            if (address[index] != prefix[index])
                return false;
        }

        var remainingBits = prefixLength % 8;
        if (remainingBits == 0)
            return true;

        var mask = (byte)(0xff << (8 - remainingBits));
        return (address[wholeBytes] & mask) == (prefix[wholeBytes] & mask);
    }

    private static string? GetFilenameFromResponseHeader(HttpResponseMessage response)
    {
        var contentDisposition = response.Content.Headers.ContentDisposition;
        var filename = contentDisposition?.FileName?.Trim('"');
        return StringUtil.EmptyToNull(filename);
    }

    private static string? GetFilenameFromUrl(string url)
    {
        try
        {
            var filename = Path.GetFileName(new Uri(url).AbsolutePath);
            if (string.IsNullOrWhiteSpace(filename)) return null;
            filename = Uri.UnescapeDataString(filename);
            filename = AddNzbExtension(filename);
            return filename;
        }
        catch
        {
            return null;
        }
    }

    private class NzbFileResponse
    {
        public required string FileName { get; init; }
        public required string? ContentType { get; init; }
        public required Stream FileStream { get; init; }
    }
}