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
import { IScope, MetricGraph, MetricGraphWidget } from "../util/metricGraph";
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
    const [metrics, _columns, _activities, _properties, _measures, _scopeTypes] = useWorkunitMetrics(wuid);
    const [showMetricOptions, setShowMetricOptions] = React.useState(false);
    const [options] = useMetricsOptions();

    //  Command Bar  ---
    const buttons = React.useMemo((): ICommandBarItemProps[] => [
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
    ], []);

    const rightButtons = React.useMemo((): ICommandBarItemProps[] => [
        // ...createCopyDownloadSelection(grid, selection, "sourcefiles.csv")
    ], []);

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
            const rows = scopesTable.selection().map(row => row.__lparam);
            if (rows.length) {
                updatePropsTable(rows);
                updatePropsTable2(rows);
                updateMetricGraph(rows);
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

    //  Graph  ---
    const metricGraph = useConst(() => new MetricGraph());
    const metricGraphWidget = useConst(() => new MetricGraphWidget()
        .id("metricGraph")
        .zoomToFitLimit(1)
        .on("selectionChanged", () => {
            const items = [...metricGraph.allSubgraphs(), ...metricGraph.allVertices(), ...metricGraph.allEdges()];

            metricGraphWidget.selection().map(id => {
                return metricGraph.item(id);
            });
            // const item = graph.item(row.id);
            updatePropsTable(items);
            updatePropsTable2(items);
            const tableItems = scopesTable.data().filter(tableRow => items.indexOf(tableRow[tableRow.length - 1]) >= 0);
            scopesTable.selection(tableItems);
        })
    );

    React.useEffect(() => {
        metricGraph.load(metrics);
    }, [metrics, metricGraph]);

    const updateMetricGraph = React.useCallback((selection: IScope[]) => {
        if (selection.length) {
            metricGraphWidget
                .dot(metricGraph.graphTpl(selection, options))
                .resize()
                .render(() => {
                    metricGraphWidget.selection(selection.map(s => s.webID));
                })
                ;
        }
    }, [metricGraph, metricGraphWidget, options]);

    //  Props Table  ---
    const propsTable = useConst(() => new Table()
        .id("propsTable")
        .columns([nlsHPCC.Property, nlsHPCC.Value])
        .columnWidth("none")
    );

    const updatePropsTable = items => {
        const props = [];
        items.forEach((item, idx) => {
            for (const key in item) {
                if (key.indexOf("__") !== 0) {
                    props.push([key, item[key]]);
                }
            }
            if (idx < items.length - 1) {
                props.push(["------------------------------", "------------------------------"]);
            }
        });
        propsTable
            ?.data(props)
            ?.lazyRender()
            ;
    };

    const propsTable2 = useConst(() => new Table()
        .id("propsTable2")
        .columns([nlsHPCC.Property, nlsHPCC.Value])
        .columnWidth("none")
    );

    const updatePropsTable2 = items => {
        const columns = [];
        const props = [];
        items.forEach(item => {
            for (const key in item) {
                if (key.indexOf("__") !== 0 && columns.indexOf(key) < 0) {
                    columns.push(key);
                }
            }
        });
        items.forEach(item => {
            const row = [];
            columns.forEach(column => {
                row.push(item[column]);
            });
            props.push(row);
        });
        propsTable2
            ?.columns(columns)
            ?.data(props)
            ?.lazyRender()
            ;
    };

    //  DockPanel ---
    const dockPanel = useConst(() => {
        const retVal = new DockPanel()
            .addWidget(scopesTable, nlsHPCC.Metrics)
            .addWidget(metricGraphWidget, nlsHPCC.Graph, "split-right", scopesTable)
            .addWidget(propsTable, nlsHPCC.Properties, "split-bottom", scopesTable)
            .addWidget(propsTable2, nlsHPCC.CrossTab, "tab-after", propsTable)
            ;
        if (layout) {
            retVal.layout(layout);
        }
        return retVal;
    });

    React.useEffect(() => {
        return () => {
            layout = dockPanel?.layout();
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
                <MetricsOptions show={showMetricOptions} setShow={setShowMetricOptions} layout={dockPanel?.layout()} />
            </>}
    />;
};
