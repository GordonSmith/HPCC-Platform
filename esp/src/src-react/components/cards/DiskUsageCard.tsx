import * as React from "react";
import { Text, Tooltip, ToolbarButton, makeStyles, tokens, OverflowItem } from "@fluentui/react-components";
import { useConst } from "@fluentui/react-hooks";
import { FolderOpen16Regular, Storage20Regular } from "@fluentui/react-icons";
import { Gauge } from "@hpcc-js/chart";
import { ClusterGauge as ClusterGaugeWidget } from "src/DiskUsage";
import { convertedSize } from "src/Utility";
import nlsHPCC from "src/nlsHPCC";
import { AutosizeHpccJSComponent } from "../../layouts/HpccJSAdapter";
import { pushUrl } from "../../util/history";
import { ComponentAggregateStats, useAllClustersDiskUsage, useClusterDiskUsage, useTargetClusterUsageEx } from "../../hooks/diskUsage";
import { GenericCard } from "./GenericCard";
import { CardGroup } from "./CardGroup";

const useStyles = makeStyles({
    content: {
        // Fill the card content area and let AutosizeHpccJSComponent stretch
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
        minHeight: 0,
        overflow: "hidden"
    },
    details: {
        padding: tokens.spacingHorizontalM,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        minHeight: 0,
        flex: 1,
        overflow: "hidden"
    },
    meterWrap: {
        width: "100%",
        height: "10px",
        background: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
        overflow: "hidden"
    },
    meterFillGreen: { background: tokens.colorStatusSuccessForeground1, height: "100%" },
    meterFillOrange: { background: tokens.colorStatusWarningForeground1, height: "100%" },
    meterFillRed: { background: tokens.colorStatusDangerForeground1, height: "100%" }
});

function meterClass(styles: ReturnType<typeof useStyles>, percent: number) {
    if (percent <= 70) return styles.meterFillGreen;
    if (percent < 80) return styles.meterFillOrange;
    return styles.meterFillRed;
}

interface DiskUsageCardProps {
    cluster?: string;
    // Optional precomputed metrics (if omitted, will fetch on demand when maximizing)
    percentUsed?: number;
    machines?: number;
    disks?: number;
    inUseStr?: string;
    totalStr?: string;
    defaultMinimized?: boolean;
    /** If true, when maximizing the card will span 2x2 cells in a 160px grid to grow width and height */
    expandInGrid?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const DiskUsageCard: React.FC<DiskUsageCardProps> = ({
    cluster,
    percentUsed,
    machines,
    disks,
    inUseStr,
    totalStr,
    defaultMinimized = true,
    expandInGrid = false,
    className,
    style
}) => {
    const styles = useStyles();
    const [minimized, setMinimized] = React.useState<boolean>(defaultMinimized);
    const [metrics, setMetrics] = React.useState<{ percentUsed: number; machines: number; disks: number; inUseStr: string; totalStr: string } | undefined>(() => {
        if (percentUsed !== undefined && machines !== undefined && disks !== undefined && inUseStr !== undefined && totalStr !== undefined) {
            return { percentUsed, machines, disks, inUseStr, totalStr };
        }
        return undefined;
    });

    // Fetch raw usage for this cluster; simpler than manual MachineService calls
    const { data: usage, loading: usageLoading } = useTargetClusterUsageEx(cluster);

    const gauge = React.useMemo(() => {
        const w = new ClusterGaugeWidget(cluster || "");
        w.on("click", () => {
            if (cluster) {
                pushUrl(`/operations/clusters/${cluster}/usage`);
            }
        });
        return w.refresh(false);
    }, [cluster]);

    // Derive metrics from hook data when expanded (or when props provided)
    React.useEffect(() => {
        if (!cluster) return;
        if (percentUsed !== undefined && machines !== undefined && disks !== undefined && inUseStr !== undefined && totalStr !== undefined) {
            // Metrics supplied via props; keep as-is
            return;
        }
        if (!minimized && usage) {
            const tc = usage.find(u => u?.Name === cluster);
            if (!tc) return;
            const perIP = new Map<string, { inUse: number; total: number; disks: number; seen: Set<string> }>();
            tc.ComponentUsages?.forEach(cu => {
                cu.MachineUsages?.forEach(mu => {
                    const ip = mu?.Name ?? "";
                    if (!ip) return;
                    if (!perIP.has(ip)) perIP.set(ip, { inUse: 0, total: 0, disks: 0, seen: new Set<string>() });
                    const acc = perIP.get(ip)!;
                    mu.DiskUsages?.forEach(du => {
                        const key = `${du.Name ?? ""}|${du.Path ?? ""}`;
                        if (acc.seen.has(key)) return;
                        acc.seen.add(key);
                        acc.inUse += du.InUse || 0;
                        acc.total += du.Total || 0;
                        acc.disks += 1;
                    });
                });
            });
            let totalInUse = 0;
            let totalTotal = 0;
            let diskCount = 0;
            perIP.forEach(v => { totalInUse += v.inUse; totalTotal += v.total; diskCount += v.disks; });
            const percent = totalTotal > 0 ? Math.round((totalInUse / totalTotal) * 100) : 0;
            setMetrics({
                percentUsed: percent,
                machines: perIP.size,
                disks: diskCount,
                inUseStr: convertedSize(totalInUse),
                totalStr: convertedSize(totalTotal)
            });
        }
    }, [cluster, minimized, usage, percentUsed, machines, disks, inUseStr, totalStr]);

    const openBtn = <OverflowItem id="open-usage">
        <ToolbarButton
            icon={<FolderOpen16Regular />}
            aria-label={nlsHPCC.Open}
            title={nlsHPCC.Open}
            onClick={() => { if (cluster) pushUrl(`#/operations/clusters/${encodeURIComponent(cluster)}/usage`); }}
        />
    </OverflowItem>;

    const percent = metrics?.percentUsed ?? 0;
    const widthStyle = { width: `${Math.min(100, Math.max(0, percent))}%` } as React.CSSProperties;

    return <GenericCard
        className={className}
        style={style}
        expandInGrid={expandInGrid}
        headerOverlay={minimized}
        headerIcon={!minimized ? (
            <Tooltip content={nlsHPCC.DiskUsage} relationship="label">
                <Storage20Regular />
            </Tooltip>
        ) : undefined}
        headerText={!minimized && cluster ? (
            <Tooltip content={cluster} relationship="label">
                <Text weight="semibold">{cluster}</Text>
            </Tooltip>
        ) : undefined}
        minimizable
        minimized={minimized}
        onToggleMinimize={() => setMinimized(m => !m)}
        headerActions={minimized ? (<></>) : (<>{openBtn}</>)}
        contentClassName={minimized ? styles.content : styles.details}
        footerText={!minimized && metrics ? `${metrics.machines} ${nlsHPCC.Machines ?? "machines"} • ${metrics.disks} disks` : undefined}
    >
        {minimized ? (
            <AutosizeHpccJSComponent widget={gauge} padding={6} />
        ) : (
            metrics ? (
                <>
                    <Text weight="semibold">{percent}%</Text>
                    <div className={styles.meterWrap}>
                        <div className={meterClass(styles, percent)} style={widthStyle} />
                    </div>
                    <div>
                        <Text>{nlsHPCC.InUse}: {metrics.inUseStr}</Text>
                    </div>
                    <div>
                        <Text>{nlsHPCC.Total}: {metrics.totalStr}</Text>
                    </div>
                </>
            ) : (
                <Text>{usageLoading ? nlsHPCC.FetchingData : ""}</Text>
            )
        )}
    </GenericCard>;
};

export const DiskUsageCards: React.FC<DiskUsageCardsProps> = ({
    refreshToken
}) => {
    const { data, loading, refresh } = useAllClustersDiskUsage();

    React.useEffect(() => {
        if (refreshToken !== undefined) {
            refresh();
        }
    }, [refreshToken, refresh]);

    return <CardGroup minColumnWidth={140} autoRows={140} columnGap={tokens.spacingHorizontalS} rowGap={tokens.spacingHorizontalS} paddingInline={tokens.spacingHorizontalS} paddingBlock={tokens.spacingVerticalS} style={{ gridTemplateColumns: "repeat(auto-fit, 140px)", justifyContent: "center", justifyItems: "stretch", alignItems: "stretch" }}>
        {data.map(d => <DiskUsageCard key={d.name} cluster={d.name} expandInGrid />)}
        {data.length === 0 && (loading ? <Text>{nlsHPCC.FetchingData}</Text> : <Text />)}
    </CardGroup>;
};

//  ---------------------------------------------------------------------------

interface FolderDiskUsageCardProps {
    folder: string;
    stats: ComponentAggregateStats;
    className?: string;
    style?: React.CSSProperties;
    expandInGrid?: boolean;
}

const FolderDiskUsageCard: React.FC<FolderDiskUsageCardProps> = ({
    folder,
    stats,
    className,
    style,
    expandInGrid = false
}) => {
    const styles = useStyles();

    const inUsePercent = stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0;
    const meanPercent = stats.totalMean > 0 ? Math.round((stats.inUseMean / stats.totalMean) * 100) : 0;

    const gauge = useConst(() => {
        return new Gauge()
            .showTick(true)
            ;
    });

    React.useEffect(() => {
        gauge
            .title(folder)
            .value(inUsePercent / 100)
            .valueDescription(`${inUsePercent}%`)
            .tickValue(meanPercent / 100)
            .lazyRender()
            ;
    }, [folder, gauge, inUsePercent, meanPercent]);

    return <GenericCard className={className} style={style} expandInGrid={expandInGrid} minimizable={false} minimized={true} contentClassName={styles.content}>
        <AutosizeHpccJSComponent widget={gauge} padding={6} />
    </GenericCard>;
};

interface FolderUsageCardsProps {
    cluster: string;
    refreshToken?: number;
}

export const FolderUsageCards: React.FC<FolderUsageCardsProps> = ({
    cluster,
    refreshToken
}) => {
    const { data, loading, refresh } = useClusterDiskUsage(cluster);

    React.useEffect(() => {
        if (refreshToken !== undefined) {
            refresh();
        }
    }, [refreshToken, refresh]);

    return <CardGroup minColumnWidth={140} autoRows={140} columnGap={tokens.spacingHorizontalS} rowGap={tokens.spacingHorizontalS} paddingInline={tokens.spacingHorizontalS} paddingBlock={tokens.spacingVerticalS} style={{ gridTemplateColumns: "repeat(auto-fit, 140px)", justifyContent: "center", justifyItems: "stretch", alignItems: "stretch" }}     >
        {data.map(d => <FolderDiskUsageCard key={d.name} folder={d.name} stats={d.stats} expandInGrid />)}
        {(data?.length ?? 0) === 0 && (loading ? <Text>{nlsHPCC.FetchingData}</Text> : <Text />)}
    </CardGroup>;
};

interface DiskUsageCardsProps {
    refreshToken?: number;
}

