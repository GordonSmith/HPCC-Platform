import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { DockPanel } from "@hpcc-js/phosphor";
import { Table } from "@hpcc-js/dgrid";
import nlsHPCC from "src/nlsHPCC";
import { WUTimelinePatched } from "src/Timings";
import { useMetricsOptions, useWorkunitMetrics } from "../hooks/metrics";
import { HolyGrail } from "../layouts/HolyGrail";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { createGraph, graphTpl, MetricGraph } from "../util/metricGraph";
import { ShortVerticalDivider } from "./Common";
import { MetricsOptions } from "./MetricsOptions";

const defaultUIState = {
    hasSelection: false
};

interface MetricsProps {
    wuid: string;
    filter?: object;
}

const emptyFilter = {};

let layout: any;

export const Metrics: React.FunctionComponent<MetricsProps> = ({
    wuid,
    filter = emptyFilter
}) => {

    const [_uiState, _setUIState] = React.useState({ ...defaultUIState });
    const [timelineFilter, setTimelineFilter] = React.useState("");
    const [graph] = React.useState(createGraph([]));
    const [metrics, _columns, _activities, _properties, _measures, _scopeTypes] = useWorkunitMetrics(wuid);
    const [showMetricOptions, setShowMetricOptions] = React.useState(false);
    const [options] = useMetricsOptions();

    //  Command Bar  ---
    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => { }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
        {
            key: "options", text: nlsHPCC.Options, iconProps: { iconName: "Settings" },
            onClick: () => {
                setShowMetricOptions(true);
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
    const hasFilter = Object.keys(filter).length > 0;
    // const filterStr = JSON.stringify(filter);
    const scopesTable = useConst(() => new Table()
        .id("scopesTable")
        .multiSelect(true)
        .columns(["##", nlsHPCC.Type, nlsHPCC.Scope, ...options.properties])
        .sortable(true)
        .on("click", (row, col, sel) => {
            if (sel) {
                updatePropsTable([row.__lparam]);
                updateMetricGraph([row.__lparam]);
            }
        })
    );

    React.useEffect(() => {
        scopesTable
            .columns(["##", nlsHPCC.Type, nlsHPCC.Scope, ...options.properties])
            .data(metrics.filter(row => {
                return (timelineFilter === "" || row.name?.indexOf(timelineFilter) === 0) &&
                    (options.scopeTypes.indexOf(row.type) >= 0);
            }).map((row, idx) => {
                row.__hpcc_id = row.id;
                return [idx, row.type, row.name, ...options.properties.map(p => row[p] !== undefined ? row[p] : ""), row];
            }))
            .lazyRender()
            ;
    }, [hasFilter, metrics, scopesTable, timelineFilter, filter, options.properties, options.scopeTypes]);

    //  Props Table  ---
    const propsTable = useConst(() => new Table()
        .id("propsTable")
        .columns([nlsHPCC.Property, nlsHPCC.Value])
        .columnWidth("none")
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
        .id("metricGraph")
        .zoomToFitLimit(1)
        .on("selectionChanged", () => {
            const items = metricGraph.selection().map(id => {
                return graph.item(id);
            });
            // const item = graph.item(row.id);
            updatePropsTable(items);
            const tableItems = scopesTable.data().filter(tableRow => items.indexOf(tableRow[tableRow.length - 1]) >= 0);
            scopesTable.selection(tableItems);
        })
    );

    React.useEffect(() => {
        createGraph(metrics, graph);
    }, [metrics, graph]);

    const updateMetricGraph = React.useCallback(selection => {
        if (selection.length) {
            metricGraph
                .dot(graphTpl(graph, selection[0]?.id, options))
                .resize()
                .render(() => {
                    metricGraph.selection([selection[0]?.id]);
                })
                ;
        }
    }, [graph, metricGraph, options]);

    //  DockPanel ---
    const dockPanel = useConst(() => {
        const retVal = new DockPanel()
            .addWidget(scopesTable, nlsHPCC.Metrics)
            .addWidget(metricGraph, nlsHPCC.Graph, "split-right", scopesTable)
            .addWidget(propsTable, nlsHPCC.Properties, "split-bottom", scopesTable)
            ;
        if (layout) {
            retVal.layout(layout);
        }
        return retVal;
    });

    React.useEffect(() => {
        return () => {
            layout = dockPanel?.layout();
            console.log(layout);
        };
    }, [dockPanel]);

    return <HolyGrail
        header={<>
            <CommandBar items={buttons} overflowButtonProps={{}} farItems={rightButtons} />
            <AutosizeHpccJSComponent widget={timeline} fixedHeight={"160px"} padding={4} />
        </>}
        main={
            <>
                <AutosizeHpccJSComponent widget={dockPanel} padding={4} debounce={false} />
                <MetricsOptions show={showMetricOptions} setShow={setShowMetricOptions} />
            </>}
    />;
};

