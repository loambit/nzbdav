import type { HealthCheckStats } from "~/clients/backend-client.server";
import { Badge, Icon } from "~/components/ui";

export type HealthStatsProps = {
    stats: HealthCheckStats[];
}

enum HealthResult {
    Healthy = 0,
    Unhealthy = 1,
}

enum RepairAction {
    None = 0,
    Repaired = 1,
    Deleted = 2,
    ActionNeeded = 3,
}

export function HealthStats({ stats }: HealthStatsProps) {
    // Calculate totals from HealthCheckStats array
    const totalChecked = stats
        .reduce((sum, stat) => sum + stat.count, 0);
    const healthy = stats
        .filter(stat => stat.result === HealthResult.Healthy)
        .reduce((sum, stat) => sum + stat.count, 0);
    const repaired = stats
        .filter(stat => stat.repairStatus === RepairAction.Repaired)
        .reduce((sum, stat) => sum + stat.count, 0);
    const deleted = stats
        .filter(stat => stat.repairStatus === RepairAction.Deleted)
        .reduce((sum, stat) => sum + stat.count, 0);

    const getPercentage = (count: number) => {
        return totalChecked > 0 ? Math.round((count / totalChecked) * 100) : 0;
    };

    return (
        <section className="w-full rounded-lg border border-slate-700/70 bg-gray-800 p-4 shadow-md md:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">Overview</h2>
                <Badge className="px-3 py-1 text-xs text-slate-400">Last 30 Days</Badge>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-slate-700/70 max-[370px]:grid-cols-1 min-[601px]:grid-cols-4">
                <div className="bg-gray-800 p-4 text-center md:p-5">
                    <Icon name="fact_check" className="mb-2 !text-[22px] text-slate-400" />
                    <div className="font-mono text-3xl font-bold leading-none text-white md:text-4xl">{totalChecked}</div>
                    <div className="mt-2 text-xs font-medium text-slate-400">Total Checked</div>
                </div>

                <div className="bg-gray-800 p-4 text-center md:p-5">
                    <Icon name="check_circle" filled className="mb-2 !text-[22px] text-emerald-400" />
                    <div className="font-mono text-3xl font-bold leading-none text-emerald-400 md:text-4xl">{healthy}</div>
                    <div className="mt-2 text-xs font-medium text-slate-400">Healthy ({getPercentage(healthy)}%)</div>
                </div>

                <div className="bg-gray-800 p-4 text-center md:p-5">
                    <Icon name="build_circle" filled className="mb-2 !text-[22px] text-blue-400" />
                    <div className="font-mono text-3xl font-bold leading-none text-blue-400 md:text-4xl">{repaired}</div>
                    <div className="mt-2 text-xs font-medium text-slate-400">Repaired ({getPercentage(repaired)}%)</div>
                </div>

                <div className="bg-gray-800 p-4 text-center md:p-5">
                    <Icon name="delete" filled className="mb-2 !text-[22px] text-red-400" />
                    <div className="font-mono text-3xl font-bold leading-none text-red-400 md:text-4xl">{deleted}</div>
                    <div className="mt-2 text-xs font-medium text-slate-400">Deleted ({getPercentage(deleted)}%)</div>
                </div>
            </div>
        </section>
    );
}