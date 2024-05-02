import * as React from "react";
import { DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, TableCellLayout, createTableColumn } from "@fluentui/react-components";
import { useConst } from "@fluentui/react-hooks";
import { IScope } from "@hpcc-js/comms";
import { ColumnFormat, Table } from "@hpcc-js/dgrid";
import nlsHPCC from "src/nlsHPCC";
import { AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";

interface MetricsPropertiesTablesProps {
    scopesTableColumns?: string[];
    scopes?: IScope[];
}

export const MetricsPropertiesTablesNew: React.FunctionComponent<MetricsPropertiesTablesProps> = ({
    scopesTableColumns = [],
    scopes = []
}) => {

    const sortByColumns = React.useMemo(() => {
        return ["id", "type", "name", ...scopesTableColumns];
    }, [scopesTableColumns]);

    const columns = React.useMemo(() => {
        return [nlsHPCC.Property, nlsHPCC.Value, "Avg", "Min", "Max", "Delta", "StdDev", "SkewMin", "SkewMax", "NodeMin", "NodeMax"].map((item, idx) => {
            return createTableColumn({
                columnId: item,
                renderHeaderCell: () => {
                    // return <div style={{ minWidth: "100px" }}>{item}</div>;
                    return item;
                },
                renderCell: (row) => {
                    return <TableCellLayout truncate>{row[idx]}</TableCellLayout>;
                }
            });
        });
    }, []);
    const columnSizingOptions = React.useMemo(() => {
        const retVal = {};
        [nlsHPCC.Property, nlsHPCC.Value, "Avg", "Min", "Max", "Delta", "StdDev", "SkewMin", "SkewMax", "NodeMin", "NodeMax"].forEach((item, idx) => {
            retVal[item] = {
                defaultWidth: 180,
                minWidth: 8,
                idealWidth: 180
            };
        });
        return retVal;
    }, []);
    const [data, setData] = React.useState<any[]>([]);

    //  Props Table  ---
    const propsTable = useConst(() => new Table()
        .columns([nlsHPCC.Property, nlsHPCC.Value, "Avg", "Min", "Max", "Delta", "StdDev", "SkewMin", "SkewMax", "NodeMin", "NodeMax"])
        .columnWidth("auto")
    );

    React.useEffect(() => {
        const props = [];
        scopes.forEach((item, idx) => {
            const scopeProps = [];
            for (const key in item.__groupedProps) {
                const row = item.__groupedProps[key];
                scopeProps.push([row.Key, row.Value, row.Avg, row.Min, row.Max, row.Delta, row.StdDev, row.SkewMin, row.SkewMax, row.NodeMin, row.NodeMax]);
            }
            scopeProps.sort((l, r) => {
                const lIdx = sortByColumns.indexOf(l[0]);
                const rIdx = sortByColumns.indexOf(r[0]);
                if (lIdx >= 0 && rIdx >= 0) {
                    return lIdx <= rIdx ? -1 : 1;
                } else if (lIdx >= 0) {
                    return -1;
                } else if (rIdx >= 0) {
                    return 1;
                }
                return 0;
            });
            if (idx < scopes.length - 1) {
                scopeProps.push(["------------------------------", "------------------------------"]);
            }
            props.push(...scopeProps);
        });
        setData(props);
    }, [propsTable, scopes, sortByColumns]);

    return <div style={{}}>
        <DataGrid columns={columns} items={data} size={"extra-small"} sortable resizableColumns columnSizingOptions={columnSizingOptions} style={{ width: "1024px" }}>
            <DataGridHeader>
                <DataGridRow selectionCell={{ checkboxIndicator: { "aria-label": "Select all rows" }, }} >
                    {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                </DataGridRow>
            </DataGridHeader>
            <DataGridBody style={{ height: "100%" }}>
                {({ item, rowId }) => (
                    <DataGridRow key={rowId} selectionCell={{ checkboxIndicator: { "aria-label": "Select row" }, }} >
                        {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                        )}
                    </DataGridRow>
                )}
            </DataGridBody>
        </DataGrid>
    </div>;
};

const Columns = [nlsHPCC.Property, nlsHPCC.Value, "Avg", "Min", "Max", "Delta", "StdDev", "SkewMin", "SkewMax", "NodeMin", "NodeMax"];
export const MetricsPropertiesTables: React.FunctionComponent<MetricsPropertiesTablesProps> = ({
    scopesTableColumns = [],
    scopes = []
}) => {

    const sortByColumns = React.useMemo(() => {
        return ["id", "type", "name", ...scopesTableColumns];
    }, [scopesTableColumns]);

    //  Props Table  ---
    const propsTable = useConst(() => new Table()
        .columns([...Columns])
        .columnFormats([...Columns].map((col, idx) => {
            return new ColumnFormat()
                .column(col)
                .width(idx < 2 ? 120 : 50)
                ;
        }))
        .columnWidth("auto")
        .sortable(true)
    );

    React.useEffect(() => {
        const props = [];
        scopes.forEach((item, idx) => {
            const scopeProps = [];
            for (const key in item.__groupedProps) {
                const row = item.__groupedProps[key];
                scopeProps.push([row.Key, row.Value, row.Avg, row.Min, row.Max, row.Delta, row.StdDev, row.SkewMin, row.SkewMax, row.NodeMin, row.NodeMax]);
            }
            scopeProps.sort((l, r) => {
                const lIdx = sortByColumns.indexOf(l[0]);
                const rIdx = sortByColumns.indexOf(r[0]);
                if (lIdx >= 0 && rIdx >= 0) {
                    return lIdx <= rIdx ? -1 : 1;
                } else if (lIdx >= 0) {
                    return -1;
                } else if (rIdx >= 0) {
                    return 1;
                }
                return 0;
            });
            if (idx < scopes.length - 1) {
                scopeProps.push(["------------------------------", "------------------------------"]);
            }
            props.push(...scopeProps);
        });

        propsTable
            ?.data(props)
            ?.lazyRender()
            ;
    }, [propsTable, scopes, sortByColumns]);

    return <AutosizeHpccJSComponent widget={propsTable}></AutosizeHpccJSComponent>;
};
