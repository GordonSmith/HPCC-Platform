import * as React from "react";
import { Dropdown, IStackItemStyles, IStackStyles, IStackTokens, Overlay, Spinner, SpinnerSize, Stack, Text } from "@fluentui/react";
import { Card } from "@fluentui/react-cards";
import { useConst } from "@fluentui/react-hooks";
import Chip from "@material-ui/core/Chip";
import * as Memory from "dojo/store/Memory";
import * as Observable from "dojo/store/Observable";
import { WorkunitsService, WUQuery } from "@hpcc-js/comms";
import { Column, Pie, Bar } from "@hpcc-js/chart";
import { chain, filter, group, map, sort } from "@hpcc-js/dataflow";
import * as ESPWorkunit from "src/ESPWorkunit";
import nlsHPCC from "src/nlsHPCC";
import { pushParamExact } from "../util/history";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { Workunits } from "./Workunits";

const service = new WorkunitsService({ baseUrl: "" });

// Utility  ---
const wuidToDate = (wuid: string) => `${wuid.substr(1, 4)}-${wuid.substr(5, 2)}-${wuid.substr(7, 2)}`;

const undefinedOrEquals = <T extends unknown>(item: T, compare: T) => item === undefined || item === compare;

const toSeconds = (timeStr: string): number => {
    const [timeStr2, milliSec] = timeStr.split(".");
    const timeParts = timeStr2.split(":");
    let seconds = Number(milliSec) / 1000;
    timeParts.forEach((row, i) => {
        seconds += Number(row) * (i * 60);
    });
    return seconds;
};

const durationBuckets = row => {
    if (row.duration < 60) {
        return 0;
    } else if (row.duration < 5 * 60) {
        return 1;
    } else if (row.duration < 10 * 60) {
        return 2;
    } else if (row.duration < 30 * 60) {
        return 3;
    } else if (row.duration < 60 * 60) {
        return 4;
    } else if (row.duration < 2 * 60 * 60) {
        return 5;
    } else if (row.duration < 3 * 60 * 60) {
        return 6;
    }
    return 7;
};

const defaultDurationBuckets = [
    ["<1m", 0],
    ["<5m", 0],
    ["<10m", 0],
    ["<30m", 0],
    ["<60m", 0],
    ["<1h", 0],
    ["<2h", 0],
    ["<3h", 0],
    [">=3h", 0]
];

interface WorkunitEx extends WUQuery.ECLWorkunit {
    Day: string;
}

const stackStyles: IStackStyles = {
    root: {
        height: "100%",
    },
};
const stackItemStyles: IStackItemStyles = {
    root: {
        minHeight: 240
    },
};
const outerStackTokens: IStackTokens = { childrenGap: 5 };
const innerStackTokens: IStackTokens = {
    childrenGap: 5,
    padding: 10,
};

export interface WorkunitsDashboardFilter {
    lastNDays?: number;
    cluster?: string;
    owner?: string;
    state?: string;
    protected?: string;
    day?: string;
}

export interface WorkunitsDashboardProps {
    filterProps?: WorkunitsDashboardFilter;
}

export const WorkunitsDashboard: React.FunctionComponent<WorkunitsDashboardProps> = ({
    filterProps
}) => {
    filterProps = {
        lastNDays: 7,
        cluster: undefined,
        owner: undefined,
        state: undefined,
        protected: undefined,
        day: undefined,
        ...filterProps
    };

    const [loading, setLoading] = React.useState(false);
    const [workunits, setWorkunits] = React.useState<WorkunitEx[]>([]);

    React.useEffect(() => {
        setLoading(true);
        setWorkunits([]);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - filterProps.lastNDays);
        service.WUQuery({
            StartDate: start.toISOString(),
            EndDate: end.toISOString(),
            PageSize: 999999
        }).then(response => {
            setWorkunits([...map(response.Workunits.ECLWorkunit, (row: WUQuery.ECLWorkunit) => ({ ...row, Day: wuidToDate(row.Wuid) }))]);
            setLoading(false);
        });
    }, [filterProps.lastNDays]);

    //  State Chart ---
    const stateChart = useConst(
        new Pie()
            .columns(["State", "Count"])
            .on("click", (row, col, sel) => pushParamExact("state", sel ? row.State : undefined))
    );

    React.useEffect(() => {
        const statePipeline = chain(
            filter(row => undefinedOrEquals(filterProps.day, row.Day)),
            filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
            filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
            filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
            group((row: WUQuery.ECLWorkunit) => row.State),
            map(row => [row.key, row.value.length])
        );

        stateChart
            .data([...statePipeline(workunits)])
            ;
    }, [filterProps.cluster, filterProps.day, filterProps.owner, filterProps.protected, stateChart, workunits]);

    //  Day Chart ---
    const dayChart = useConst(
        new Column()
            .columns(["Day", "Count"])
            .xAxisType("time")
            .xAxisOverlapMode("hide")
            // .interpolate("cardinal")
            // .xAxisTypeTimePattern("")
            .on("click", (row, col, sel) => pushParamExact("day", sel ? row.Day : undefined))
    );

    React.useEffect(() => {
        const dayPipeline = chain(
            filter(row => undefinedOrEquals(filterProps.state, row.State)),
            filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
            filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
            filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
            group(row => row.Day),
            map(row => [row.key, row.value.length] as [string, number]),
            sort((l, r) => l[0].localeCompare(r[0])),
        );

        dayChart
            .data([...dayPipeline(workunits)])
            ;
    }, [dayChart, filterProps.cluster, filterProps.owner, filterProps.protected, filterProps.state, workunits]);

    //  Protected Chart ---
    const protectedChart = useConst(
        new Pie()
            .columns(["Protected", "Count"])
            .on("click", (row, col, sel) => pushParamExact("protected", sel ? row.Protected === "true" : undefined))
    );

    React.useEffect(() => {
        const protectedPipeline = chain(
            filter(row => undefinedOrEquals(filterProps.state, row.State)),
            filter(row => undefinedOrEquals(filterProps.day, row.Day)),
            filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
            filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
            group((row: WorkunitEx) => "" + row.Protected),
            map(row => [row.key, row.value.length])
        );

        protectedChart
            .data([...protectedPipeline(workunits)])
            ;
    }, [filterProps.cluster, filterProps.day, filterProps.owner, filterProps.state, protectedChart, workunits]);

    //  Owner Chart ---
    const ownerChart = useConst(
        new Column()
            .columns(["Owner", "Count"])
            .on("click", (row, col, sel) => pushParamExact("owner", sel ? row.Owner : undefined))
    );

    React.useEffect(() => {
        const ownerPipeline = chain(
            filter(row => undefinedOrEquals(filterProps.state, row.State)),
            filter(row => undefinedOrEquals(filterProps.day, row.Day)),
            filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
            filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
            group((row: WUQuery.ECLWorkunit) => row.Owner),
            map(row => [row.key, row.value.length] as [string, number]),
            sort((l, r) => l[0].localeCompare(r[0])),
        );

        ownerChart
            .data([...ownerPipeline(workunits)])
            ;
    }, [filterProps.cluster, filterProps.day, filterProps.protected, filterProps.state, ownerChart, workunits]);

    //  Cluster Chart ---
    const clusterChart = useConst(
        new Bar()
            .columns(["Cluster", "Count"])
            .on("click", (row, col, sel) => pushParamExact("cluster", sel ? row.Cluster : undefined))
    );

    React.useEffect(() => {
        const clusterPipeline = chain(
            filter(row => undefinedOrEquals(filterProps.state, row.State)),
            filter(row => undefinedOrEquals(filterProps.day, row.Day)),
            filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
            filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
            group((row: WUQuery.ECLWorkunit) => row.Cluster),
            map(row => [row.key, row.value.length] as [string, number]),
            sort((l, r) => l[0].localeCompare(r[0])),
        );

        clusterChart
            .data([...clusterPipeline(workunits)])
            ;
    }, [clusterChart, filterProps.day, filterProps.owner, filterProps.protected, filterProps.state, workunits]);

    //  WU Histogram ---
    const histogramChart = useConst(
        new Column()
            .columns(["Duration", "Count"])
        // .on("click", (row, col, sel) => pushParamExact("cluster", sel ? row.Cluster : undefined))
    );

    React.useEffect(() => {
        const histogramPipeline = chain(
            filter(row => undefinedOrEquals(filterProps.state, row.State)),
            filter(row => undefinedOrEquals(filterProps.day, row.Day)),
            filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
            filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
            filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
            map((row: WUQuery.ECLWorkunit) => ({ ...row, duration: toSeconds(row.TotalClusterTime) })),
            group(durationBuckets)
        );
        const data = [...defaultDurationBuckets];
        for (const row of histogramPipeline(workunits)) {
            data[row.key][1] = row.value.length;
        }

        histogramChart
            .data(data)
            ;
    }, [filterProps.cluster, filterProps.day, filterProps.owner, filterProps.protected, filterProps.state, histogramChart, workunits]);

    //  Table ---
    const workunitsStore = useConst(Observable(new Memory({ idProperty: "Wuid", data: [] })));

    //  Won't work inside a "useEffect"  ---
    const tablePipeline = chain(
        filter(row => undefinedOrEquals(filterProps.state, row.State)),
        filter(row => undefinedOrEquals(filterProps.day, row.Day)),
        filter(row => undefinedOrEquals(filterProps.protected, row.Protected)),
        filter(row => undefinedOrEquals(filterProps.owner, row.Owner)),
        filter(row => undefinedOrEquals(filterProps.cluster, row.Cluster)),
        map(row => ESPWorkunit.Get(row.Wuid, row))
    );
    workunitsStore.setData([...tablePipeline(workunits)]);

    return <>
        <Stack tokens={outerStackTokens} styles={{ root: { height: "100%" } }}>
            <Stack styles={stackStyles} tokens={innerStackTokens}>
                <Stack.Item styles={stackItemStyles}>
                    <Stack horizontal tokens={{ childrenGap: 16 }}  >
                        <Stack.Item align="start" styles={{ root: { width: "25%", height: "100%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%", minHeight: "100%" }}>
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.State}</Text>
                                        {filterProps.state !== undefined && <Chip label={filterProps.state} clickable color="primary" onDelete={() => pushParamExact("state", undefined)} />}
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={stateChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                        <Stack.Item align="center" styles={{ root: { width: "50%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%" }} >
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.Day}</Text>
                                        {filterProps.day !== undefined && <Chip label={filterProps.day} clickable color="primary" onDelete={() => pushParamExact("day", undefined)} />}
                                        <Dropdown onChange={(evt, opt, idx) => { pushParamExact("lastNDays", opt.key); }}
                                            options={[
                                                { key: 1, text: "1 Day", selected: filterProps.lastNDays === 1 },
                                                { key: 2, text: "2 Days", selected: filterProps.lastNDays === 2 },
                                                { key: 3, text: "3 Days", selected: filterProps.lastNDays === 3 },
                                                { key: 7, text: "1 Week", selected: filterProps.lastNDays === 7 },
                                                { key: 14, text: "2 Weeks", selected: filterProps.lastNDays === 14 },
                                                { key: 21, text: "3 Weeks", selected: filterProps.lastNDays === 21 },
                                                { key: 31, text: "1 Month", selected: filterProps.lastNDays === 31 }
                                            ]}
                                        />
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={dayChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                        <Stack.Item align="end" styles={{ root: { width: "25%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%" }}>
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.Protected}</Text>
                                        {filterProps.protected !== undefined && <Chip label={"" + filterProps.protected} clickable color="primary" onDelete={() => pushParamExact("protected", undefined)} />}
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={protectedChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                    </Stack>
                </Stack.Item>
                <Stack.Item styles={stackItemStyles}>
                    <Stack horizontal tokens={{ childrenGap: 16 }} >
                        <Stack.Item align="start" styles={{ root: { width: "40%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%" }}>
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.Owner}</Text>
                                        {filterProps.owner !== undefined && <Chip label={filterProps.owner} clickable color="primary" onDelete={() => pushParamExact("owner", undefined)} />}
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={ownerChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                        <Stack.Item align="start" styles={{ root: { width: "40%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%" }}>
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.Duration}</Text>
                                        {filterProps.owner !== undefined && <Chip label={filterProps.owner} clickable color="primary" onDelete={() => pushParamExact("owner", undefined)} />}
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={histogramChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                        <Stack.Item align="center" styles={{ root: { width: "20%" } }}>
                            <Card tokens={{ childrenMargin: 12, minWidth: "100%" }} >
                                <Card.Item>
                                    <Stack horizontal horizontalAlign="space-between">
                                        <Text variant="large" nowrap block styles={{ root: { fontWeight: "bold" } }}>{nlsHPCC.Cluster}</Text>
                                        {filterProps.cluster !== undefined && <Chip label={filterProps.cluster} clickable color="primary" onDelete={() => pushParamExact("cluster", undefined)} />}
                                    </Stack>
                                </Card.Item>
                                <Card.Item>
                                    <AutosizeHpccJSComponent widget={clusterChart} fixedHeight="240px" />
                                </Card.Item>
                            </Card>
                        </Stack.Item>
                    </Stack>
                </Stack.Item>
                <Stack.Item grow={5} styles={stackItemStyles}>
                    <Card tokens={{ childrenMargin: 4, minWidth: "100%", height: "100%" }}>
                        <Card.Section tokens={{}} styles={{ root: { height: "100%" } }}>
                            <Workunits store={workunitsStore} />
                        </Card.Section>
                    </Card>
                </Stack.Item>
            </Stack>
        </Stack>
        {loading && <Overlay styles={{ root: { display: "flex", justifyContent: "center" } }}>
            <Spinner label={nlsHPCC.Loading} size={SpinnerSize.large} />
        </Overlay>}
    </>;
};