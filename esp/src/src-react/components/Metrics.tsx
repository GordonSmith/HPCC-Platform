import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps, Pivot, PivotItem } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { graphviz } from "@hpcc-js/wasm";
import * as Observable from "dojo/store/Observable";
import { Memory } from "src/Memory";
import nlsHPCC from "src/nlsHPCC";
import { WUTimelinePatched } from "src/Timings";
import { useWorkunitMetrics } from "../hooks/Workunit";
import { HolyGrail } from "../layouts/HolyGrail";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { createGraph, graphTpl, MetricGraph } from "../util/metricGraph";
import { createCopyDownloadSelection, ShortVerticalDivider } from "./Common";
import { DojoGrid } from "./DojoGrid";

const defaultUIState = {
    hasSelection: false
};

interface MetricsProps {
    wuid: string;
}

export const Metrics: React.FunctionComponent<MetricsProps> = ({
    wuid
}) => {

    const [grid, setGrid] = React.useState<any>(undefined);
    const [selection, setSelection] = React.useState([]);
    const [uiState, setUIState] = React.useState({ ...defaultUIState });
    const [metrics, _columns, _activities, _properties, _measures, _scopeTypes, _scopes] = useWorkunitMetrics(wuid);

    //  Command Bar  ---
    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => refreshTable()
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
        {
            key: "open", text: nlsHPCC.Open, disabled: !uiState.hasSelection, iconProps: { iconName: "WindowEdit" },
            onClick: () => {
                if (selection.length === 1) {
                    window.location.href = `#/files/${selection[0].Name}`;
                } else {
                    for (let i = selection.length - 1; i >= 0; --i) {
                        window.open(`#/files/${selection[i].Name}`, "_blank");
                    }
                }
            }
        },
    ];

    const rightButtons: ICommandBarItemProps[] = [
        ...createCopyDownloadSelection(grid, selection, "sourcefiles.csv")
    ];

    //  Timeline ---
    const timings = useConst(new WUTimelinePatched()
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
        })
    );

    //  Grid ---
    const gridStore = useConst(new Observable(new Memory("__hpcc_id")));
    const gridSort = useConst([{ attribute: "__hpcc_id", descending: false }]);
    const gridQuery = useConst({});
    const gridColumns = useConst({
        __hpcc_id: { label: "##", width: 64, sortable: true },
        Type: { label: nlsHPCC.Type, width: 120, sortable: true },
        Scope: { label: nlsHPCC.Scope, sortable: true },
    });

    const refreshTable = (clearSelection = false) => {
        grid?.set("query", gridQuery);
        if (clearSelection) {
            grid?.clearSelection();
        }
    };

    //  Selection  ---
    React.useEffect(() => {
        const state = { ...defaultUIState };

        for (let i = 0; i < selection.length; ++i) {
            state.hasSelection = true;
            break;
        }
        setUIState(state);
    }, [selection]);

    React.useEffect(() => {
        gridStore.setData(metrics.map((row, idx) => {
            return {
                __hpcc_id: idx,
                Type: row.type,
                Scope: row.name,
                __hpcc_row: row
            };
        }));
        refreshTable();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridStore, metrics]);

    const metricGraph = useConst(new MetricGraph());

    React.useEffect(() => {
        if (metrics.length) {
            const graph = createGraph(metrics);
            const dot = graphTpl(graph);
            graphviz.dot(dot).then(svg => {
                metricGraph
                    .svg(svg)
                    .resize()
                    .lazyRender()
                    ;
            }).catch(e => {
                //                debugger;
            });
        }
    }, [metricGraph, metrics]);

    return <HolyGrail
        header={<CommandBar items={buttons} overflowButtonProps={{}} farItems={rightButtons} />}
        main={
            <HolyGrail
                header={<AutosizeHpccJSComponent widget={timings} fixedHeight="160px" />}
                main={<DojoGrid store={gridStore} query={gridQuery} sort={gridSort} columns={gridColumns} setGrid={setGrid} setSelection={setSelection} />}
                right={<Pivot overflowBehavior="menu" style={{ width: "480px", height: "800px" }}>
                    <PivotItem headerText={nlsHPCC.Graph} itemKey="graph" style={{ height: "600px" }}>
                        <AutosizeHpccJSComponent widget={metricGraph} />
                    </PivotItem>
                    <PivotItem headerText={nlsHPCC.Properties} itemKey="properties">
                    </PivotItem>
                </Pivot >}
            />
        }
    />;
};
