import type { HealthCheckQueueItem } from "~/clients/backend-client.server";
import { Truncate } from "~/routes/queue/components/truncate/truncate";
import { Badge, Icon } from "~/components/ui";

export type HealthTableProps = {
    isEnabled: boolean,
    healthCheckItems: HealthCheckQueueItem[],
}

export function HealthTable({ isEnabled, healthCheckItems }: HealthTableProps) {

    return (
        <section className="w-full overflow-hidden rounded-lg border border-slate-700/70 bg-gray-800 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6">
                <h2 className="text-xl font-semibold text-white">Schedule</h2>
                <Badge className="px-3 py-1 text-xs text-slate-400">
                    Only {healthCheckItems.length} shown
                </Badge>
            </div>

            {!isEnabled ? (
                <div className="px-5 py-14 text-center text-slate-400">
                    <Icon name="health_and_safety" className="mb-4 !text-[48px] text-blue-400/70" />
                    <div className="mb-2 text-base font-semibold text-slate-200">Enable Repairs In Settings</div>
                    <div className="mx-auto max-w-md text-sm leading-relaxed">
                        Once you enable repairs, all mounted usenet files will be queued for continuous health monitoring
                    </div>
                </div>
            ) : healthCheckItems.length === 0 ? (
                <div className="px-5 py-14 text-center text-slate-400">
                    <Icon name="health_and_safety" className="mb-4 !text-[48px] text-blue-400/70" />
                    <div className="mb-2 text-base font-semibold text-slate-200">No Items To Health-Check</div>
                    <div className="mx-auto max-w-md text-sm leading-relaxed">
                        Once you begin processing nzbs, the mounted usenet files will be queued for continuous health monitoring
                    </div>
                </div>
            ) : (
                <div className="min-h-[200px] overflow-x-auto">
                    <table className="m-0 w-full border-collapse text-slate-300">
                        <thead className="max-[899px]:hidden">
                            <tr>
                                <th className="w-1/2 bg-slate-900/70 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Name</th>
                                <th className="w-[100px] whitespace-nowrap bg-slate-900/70 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Created</th>
                                <th className="w-[100px] whitespace-nowrap bg-slate-900/70 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Last Check</th>
                                <th className="w-[100px] whitespace-nowrap bg-slate-900/70 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Next Check</th>
                            </tr>
                        </thead>
                        <tbody>
                            {healthCheckItems.map(item => (
                                <tr key={item.id} className="border-b border-slate-700/50 last:border-b-0">
                                    <td className="max-w-[200px] px-6 py-4 align-middle max-[899px]:max-w-none max-[899px]:p-6">
                                        <div className="flex min-w-0 flex-col gap-1">
                                            <div className="break-all text-sm font-medium leading-snug text-slate-200"><Truncate>{item.name}</Truncate></div>
                                            <div className="break-all text-xs italic leading-snug text-slate-500"><Truncate>{item.path}</Truncate></div>
                                            <div className="hidden max-[899px]:block">
                                                <DateDetailsTable item={item} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="max-w-[200px] px-3 py-4 text-center text-xs text-slate-400 max-[899px]:hidden">
                                        {formatDateBadge(item.releaseDate, 'Unknown', 'info')}
                                    </td>
                                    <td className="max-w-[200px] px-3 py-4 text-center text-xs text-slate-400 max-[899px]:hidden">
                                        {formatDateBadge(item.lastHealthCheck, 'Never', 'warning')}
                                    </td>
                                    <td className="max-w-[200px] px-3 py-4 text-center text-xs text-slate-400 max-[899px]:hidden">
                                        {item.progress > 0
                                            ? <HealthProgressBadge percentage={item.progress} />
                                            : formatDateBadge(item.nextHealthCheck, 'ASAP', 'success')
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function DateDetailsTable({ item }: { item: HealthCheckQueueItem }) {
    return (
        <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-900/50 p-3">
            <div className="flex items-center justify-between border-b border-slate-700/50 py-2 first:pt-0">
                <div className="min-w-20 text-[11px] font-medium uppercase tracking-wide text-slate-400">Created</div>
                <div className="ml-3 flex-1 text-right text-xs text-slate-200">
                    {formatDateBadge(item.releaseDate, 'Unknown', 'info')}
                </div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-700/50 py-2">
                <div className="min-w-20 text-[11px] font-medium uppercase tracking-wide text-slate-400">Last Health Check</div>
                <div className="ml-3 flex-1 text-right text-xs text-slate-200">
                    {formatDateBadge(item.lastHealthCheck, 'Never', 'warning')}
                </div>
            </div>
            <div className="flex items-center justify-between pt-2">
                <div className="min-w-20 text-[11px] font-medium uppercase tracking-wide text-slate-400">Next Health Check</div>
                <div className="ml-3 flex-1 text-right text-xs text-slate-200">
                    {item.progress > 0
                        ? <HealthProgressBadge percentage={item.progress} />
                        : formatDateBadge(item.nextHealthCheck, 'ASAP', 'success')
                    }
                </div>
            </div>
        </div>
    );
}

function formatDate(dateString: string | null, fallback: string) {
    try {
        if (!dateString) return fallback;
        const now = new Date();
        const datetime = new Date(dateString);
        return isSameDate(datetime, now)
            ? datetime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : datetime.toLocaleDateString();
    } catch {
        return 'Unknown';
    }
};

function formatDateBadge(dateString: string | null, fallback: string, variant: 'info' | 'warning' | 'success') {
    const dateText = formatDate(dateString, fallback);
    const variantClass = {
        info: "!border-blue-500/40 !bg-blue-500/15 !text-blue-200",
        warning: "!border-amber-500/40 !bg-amber-500/15 !text-amber-200",
        success: "!border-emerald-500/40 !bg-emerald-500/15 !text-emerald-200",
    }[variant];
    return <Badge className={`inline-block w-[85px] font-mono text-xs ${variantClass}`}>{dateText}</Badge>;
};

function HealthProgressBadge({ percentage }: { percentage: number }) {
    const progress = Math.max(0, Math.min(percentage, 100));
    return (
        <span className="relative inline-block w-[85px] overflow-hidden rounded-full border border-blue-500/40 bg-slate-700/70 px-1.5 py-0.5 font-mono text-xs text-blue-100">
            <span className="absolute inset-y-0 left-0 bg-blue-500/40" style={{ width: `${progress}%` }} />
            <span className="relative">{percentage}%</span>
        </span>
    );
}

function isSameDate(one: Date, two: Date) {
    return (
        one.getFullYear() === two.getFullYear() &&
        one.getMonth() === two.getMonth() &&
        one.getDate() === two.getDate()
    );
}