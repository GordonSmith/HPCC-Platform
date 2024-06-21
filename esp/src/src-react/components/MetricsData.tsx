import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps, Link, Pivot, PivotItem, ScrollablePane, Sticky } from "@fluentui/react";
import { IScope } from "@hpcc-js/comms";
import { SizeMe } from "react-sizeme";
import nlsHPCC from "src/nlsHPCC";
import { useDuckDBConnection } from "../hooks/duckdb";
import { useWorkunitResults } from "../hooks/workunit";
import { pivotItemStyle } from "../layouts/pivot";
import { FluentGrid, useCopyButtons, useFluentStoreState, FluentColumns } from "./controls/Grid";
import { ShortVerticalDivider } from "./Common";
import { Result } from "./Result";

const defaultUIState = {
    hasSelection: false
};

interface MetricsDataProps {
    scopes: IScope[];
}

export const MetricsData: React.FunctionComponent<MetricsDataProps> = ({
    scopes
}) => {

    const [_uiState, setUIState] = React.useState({ ...defaultUIState });
    const {
        selection, setSelection,
        setTotal,
        refreshTable } = useFluentStoreState({});
    const [connection] = useDuckDBConnection(scopes, "metrics");
    const [data, setData] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (connection) {
            connection.query("SELECT * FROM metrics").then(result => {
                setData(result.toArray().map((row) => row.toJSON()));
            });
        }
    }, [connection]);

    React.useEffect(() => {
        if (data?.length) {
            debugger;
        }
    }, [data]);

    //  Grid ---
    const columns = React.useMemo((): FluentColumns => {
        return {
            col1: {
                width: 27,
                selectorType: "checkbox"
            },
            Name: {
                label: nlsHPCC.Name, width: 180, sortable: true,
                formatter: (Name, row) => {
                    return <Link href={`#/workunits/${row.Wuid}/outputs/${Name}`}>{Name}</Link>;
                }
            },
            FileName: {
                label: nlsHPCC.FileName, sortable: true,
                formatter: (FileName, row) => {
                    return <Link href={`#/files/${FileName}`}>{FileName}</Link>;
                }
            },
            Value: {
                label: nlsHPCC.Value,
                width: 180,
                sortable: true
            },
            ResultViews: {
                label: nlsHPCC.Views, sortable: true,
                formatter: (ResultViews, idx) => {
                    return <>
                        {ResultViews?.map((item, idx) => <Link href='#' viewName={encodeURIComponent(item)}>{item}</Link>)}
                    </>;
                }
            }
        };
    }, []);

    //  Command Bar  ---
    const buttons = React.useMemo((): ICommandBarItemProps[] => [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => { }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ], []);

    const copyButtons = useCopyButtons(columns, selection, "metrics");

    //  Selection  ---
    React.useEffect(() => {
        const state = { ...defaultUIState };

        for (let i = 0; i < selection.length; ++i) {
            state.hasSelection = true;
            break;
        }
        setUIState(state);
    }, [selection]);

    return <ScrollablePane>
        <Sticky>
            <CommandBar items={buttons} farItems={copyButtons} />
        </Sticky>
        <FluentGrid
            data={scopes ?? []}
            primaryID={"__hpcc_id"}
            alphaNumColumns={{ Name: true, Value: true }}
            columns={columns}
            setSelection={setSelection}
            setTotal={setTotal}
            refresh={refreshTable}
        ></FluentGrid>
    </ScrollablePane >;
};

interface TabbedResultsProps {
    wuid: string;
    filter?: { [id: string]: any };
}

export const TabbedResults: React.FunctionComponent<TabbedResultsProps> = ({
    wuid,
    filter = {}
}) => {

    const [results] = useWorkunitResults(wuid);

    return <SizeMe monitorHeight>{({ size }) =>
        <Pivot overflowBehavior="menu" style={{ height: "100%" }}>
            {results.map(result => {
                return <PivotItem key={`${result?.ResultName}_${result?.Sequence}`} headerText={result?.ResultName} style={pivotItemStyle(size)}>
                    <Result wuid={wuid} resultName={result?.ResultName} filter={filter} />
                </PivotItem>;
            })}
        </Pivot>
    }</SizeMe>;

};