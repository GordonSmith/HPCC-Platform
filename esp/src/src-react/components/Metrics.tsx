import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { DockPanel } from "@hpcc-js/phosphor";
import { Table } from "@hpcc-js/dgrid";
import { graphviz } from "@hpcc-js/wasm";
import nlsHPCC from "src/nlsHPCC";
import { WUTimelinePatched } from "src/Timings";
import { useWorkunitMetrics } from "../hooks/Workunit";
import { HolyGrail } from "../layouts/HolyGrail";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { createGraph, graphTpl, MetricGraph } from "../util/metricGraph";
import { ShortVerticalDivider } from "./Common";

const defaultUIState = {
    hasSelection: false
};

interface MetricsProps {
    wuid: string;
}

export const Metrics: React.FunctionComponent<MetricsProps> = ({
    wuid
}) => {

    const [uiState, _setUIState] = React.useState({ ...defaultUIState });
    const [timelineFilter, setTimelineFilter] = React.useState("");
    const [graph] = React.useState(createGraph([]));
    const [metrics, _columns, _activities, _properties, _measures, _scopeTypes, _scopes] = useWorkunitMetrics(wuid);

    //  Command Bar  ---
    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => { }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
        {
            key: "open", text: nlsHPCC.Open, disabled: !uiState.hasSelection, iconProps: { iconName: "WindowEdit" },
            onClick: () => {
            }
        },
    ];

    const rightButtons: ICommandBarItemProps[] = [
        // ...createCopyDownloadSelection(grid, selection, "sourcefiles.csv")
    ];

    //  Timeline ---
    const timeline = useConst(() => new WUTimelinePatched()
        .maxZoom(Number.MAX_SAFE_INTEGER)
        .overlapTolerence(1)
        .baseUrl("")
        .wuid(wuid)
        .request({
            ScopeFilter: {
                MaxDepth: 3,
                ScopeTypes: []
            },
            NestedFilter: {
                Depth: 0,
                ScopeTypes: []
            },
            PropertiesToReturn: {
                AllProperties: false,
                AllStatistics: true,
                AllHints: false,
                Properties: ["WhenStarted", "TimeElapsed"]
            },
            ScopeOptions: {
                IncludeId: true,
                IncludeScope: true,
                IncludeScopeType: true
            },
            PropertyOptions: {
                IncludeName: true,
                IncludeRawValue: true,
                IncludeFormatted: true,
                IncludeMeasure: true,
                IncludeCreator: true,
                IncludeCreatorType: false
            }
        })
        .on("click", (row, col, sel) => {
            setTimelineFilter(sel ? row[6].ScopeName : "");
        })
    );

    //  Scopes Table  ---
    const scopesTable = useConst(() => new Table()
        .columns(["##", nlsHPCC.Type, nlsHPCC.Scope])
        .on("click", (row, col, sel) => {
            updatePropsTable(sel ? [row.__lparam] : []);
            updateMetricGraph(sel ? [row.__lparam] : []);
        })
    );

    React.useEffect(() => {
        scopesTable.data(metrics.filter(row => {
            return timelineFilter === "" || row?.name?.indexOf(timelineFilter) === 0;
        }).map((row, idx) => {
            return [idx, row.type, row.name, row];
        })).lazyRender();
    }, [metrics, scopesTable, timelineFilter]);

    //  Props Table  ---
    const propsTable = useConst(() => new Table()
        .columns([nlsHPCC.Property, nlsHPCC.Value])
    );

    const updatePropsTable = selection => {
        const props = [];
        for (const key in selection[0]) {
            props.push([key, selection[0][key]]);
        }
        propsTable
            ?.data(props)
            ?.lazyRender()
            ;
    };

    //  Graph  ---
    const metricGraph = useConst(() => new MetricGraph()
        .zoomToFitLimit(1)
        .on("click", (row, col, sel) => {
            const item = graph.item(row.id);
            updatePropsTable([item]);
            // scopesTable.selection([item]).lazyRender();
        })
    );

    React.useEffect(() => {
        createGraph(metrics, graph);
    }, [metrics, graph]);

    const updateMetricGraph = selection => {
        if (selection.length) {
            const dot = graphTpl(graph, selection[0]?.id);
            graphviz.dot(dot).then(svg => {
                metricGraph
                    .svg(svg)
                    .resize()
                    .lazyRender()
                    ;
            }).catch(e => {
            });
        }
    };

    //  DockPanel ---
    const dockPanel = useConst(() => new DockPanel()
        .addWidget(timeline, nlsHPCC.Timings)
        .addWidget(scopesTable, nlsHPCC.Scope, "split-bottom")
        .addWidget(metricGraph, nlsHPCC.Graph, "split-right", scopesTable)
        .addWidget(propsTable, nlsHPCC.Properties, "split-bottom", scopesTable)
    );

    return <HolyGrail
        header={<CommandBar items={buttons} overflowButtonProps={{}} farItems={rightButtons} />}
        main={<AutosizeHpccJSComponent widget={dockPanel} />}
    />;
};
