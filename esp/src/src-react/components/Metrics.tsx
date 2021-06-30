import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { DockPanel } from "@hpcc-js/phosphor";
import { Table } from "@hpcc-js/dgrid";
import { chain, group, map, sort } from "@hpcc-js/dataflow";
import { graphviz } from "@hpcc-js/graph";
import nlsHPCC from "src/nlsHPCC";
import { WUTimelinePatched } from "src/Timings";
import { useWorkunitMetrics } from "../hooks/Workunit";
import { HolyGrail } from "../layouts/HolyGrail";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { createGraph, graphTpl, MetricGraph } from "../util/metricGraph";
import { ShortVerticalDivider } from "./Common";
import { Filter } from "./forms/Filter";
import { Fields } from "./forms/Fields";
import { pushParams } from "../util/history";
import { MetricOptions } from "./MetricOptions";

declare const dojoConfig;

const scopeTypePipeline = chain(
    group<any>(row => row.type),
    map(row => [row.key, row.value.length] as [string, number]),
    sort((l, r) => l[0].localeCompare(r[0])),
);

const defaultUIState = {
    hasSelection: false
};

interface MetricsProps {
    wuid: string;
    filter?: object;
}

const emptyFilter = {};

export const Metrics: React.FunctionComponent<MetricsProps> = ({
    wuid,
    filter = emptyFilter
}) => {

    const [_uiState, _setUIState] = React.useState({ ...defaultUIState });
    const [timelineFilter, setTimelineFilter] = React.useState("");
    const [graph] = React.useState(createGraph([]));
    const [metrics, _columns, _activities, _properties, _measures, _scopeTypes] = useWorkunitMetrics(wuid);
    const [scopeTypes, setScopeTypes] = React.useState([]);
    const [scopeProperties, setScopeProperties] = React.useState([]);
    const [showFilter, setShowFilter] = React.useState(false);
    const [showProperties, setShowProperties] = React.useState(false);
    const [showMetricOptions, setShowMetricOptions] = React.useState(false);

    //  Command Bar  ---
    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => { }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
        {
            key: "filter", text: nlsHPCC.Scope, iconProps: { iconName: "Filter" },
            onClick: () => {
                setShowFilter(true);
            }
        },
        {
            key: "props", text: nlsHPCC.Properties, iconProps: { iconName: "Filter" },
            onClick: () => {
                setShowProperties(true);
            }
        },
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
        .multiSelect(true)
        .columns(["##", nlsHPCC.Type, nlsHPCC.Scope])
        .on("click", (row, col, sel) => {
            if (sel) {
                updatePropsTable([row.__lparam]);
                updateMetricGraph([row.__lparam]);
            }
        })
    );

    React.useEffect(() => {
        const scopeProps = {};
        scopesTable.data(metrics.filter(row => {
            return (timelineFilter === "" || row.name?.indexOf(timelineFilter) === 0) &&
                (!hasFilter || filter[row.type]);
        }).map((row, idx) => {
            for (const key in row) {
                scopeProps[key] = true;
            }
            row.__hpcc_id = row.id;
            return [idx, row.type, row.name, row];
        })).lazyRender();

        setScopeTypes([...scopeTypePipeline(metrics)]);
        setScopeProperties(Object.keys(scopeProps));
    }, [hasFilter, metrics, scopesTable, timelineFilter, filter]);

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

    const updateMetricGraph = selection => {
        if (selection.length) {
            const dot = graphTpl(graph, selection[0]?.id);
            graphviz(dot, "dot", dojoConfig.urlInfo.fullPath + "/dist").then(svg => {
                metricGraph
                    .svg(svg)
                    .resize()
                    .render(() => {
                        metricGraph.selection([selection[0]?.id]);
                    })
                    ;
            }).catch(e => {
            });
        }
    };

    //  DockPanel ---
    const dockPanel = useConst(() => new DockPanel()
        .addWidget(scopesTable, nlsHPCC.Scope)
        .addWidget(metricGraph, nlsHPCC.Graph, "split-right", scopesTable)
        .addWidget(propsTable, nlsHPCC.Properties, "split-bottom", scopesTable)
    );

    //  Filter  ---
    const filterFields: Fields = {};
    for (const field of scopeTypes) {
        filterFields[field[0]] = { type: "checkbox", label: field[0], value: hasFilter ? filter[field[0]] : true };
    }

    //  Properties  ---
    const propFields: Fields = {};
    for (const field of scopeProperties) {
        propFields[field] = { type: "checkbox", label: field, value: true };
    }

    return <HolyGrail
        header={<>
            <CommandBar items={buttons} overflowButtonProps={{}} farItems={rightButtons} />
            <AutosizeHpccJSComponent widget={timeline} fixedHeight={"160px"} padding={4} />
        </>}
        main={
            <><AutosizeHpccJSComponent widget={dockPanel} padding={4} />
                <Filter showFilter={showFilter} setShow={setShowFilter} filterFields={filterFields} onApply={pushParams} />
                <Filter showFilter={showProperties} setShow={setShowProperties} filterFields={propFields} onApply={() => { }} />
                <MetricOptions show={showMetricOptions} setShow={setShowMetricOptions} />

            </>}
    />;
};
