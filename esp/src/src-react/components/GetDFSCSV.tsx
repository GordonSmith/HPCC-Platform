import * as React from "react";
import { Button, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, TableColumnDefinition, createTableColumn } from "@fluentui/react-components";
import { SizeMe } from "../layouts/SizeMe";
import { csvParse } from "d3-dsv";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { HolyGrail } from "../layouts/HolyGrail";

class MyDaliService extends DaliService {
    GetDFSCSV(request: WsDali.GetDFSCSVRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetDFSCSV", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetDFSCSV.tsx");

const myDaliService = new MyDaliService({ baseUrl: "" });

interface GetDFSCSVProps {
}

export const GetDFSCSV: React.FunctionComponent<GetDFSCSVProps> = ({

}) => {

    const [columnNames, setColumnNames] = React.useState<string[]>([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [logicalNameMask, setLogicalNameMask] = React.useState<string>("");

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => columnNames.map(col => createTableColumn<any>({
        columnId: col,
        renderHeaderCell: () => col,
        renderCell: (item) => item[col]
    })), [columnNames]);

    const onSubmit = React.useCallback(() => {
        myDaliService.GetDFSCSV({ LogicalNameMask: logicalNameMask }).then(response => {
            const data = csvParse(response.Result);
            setColumnNames(data.columns);
            setItems(data);
        }).catch(err => logger.error(err));
    }, [logicalNameMask]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "LogicalNameMask": { label: nlsHPCC.LogicalNameMask, type: "string", value: logicalNameMask },
        }} onChange={(id, value) => {
            setLogicalNameMask(value);
        }} /><Button onClick={onSubmit}>{nlsHPCC.Submit}</Button></span>}
        main={<SizeMe>{({ size }) => {
            return <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <div style={{ position: "absolute", width: "100%", height: `${size.height}px`, overflow: "auto" }}>
                    <DataGrid items={items} columns={dataGridColumns} size="extra-small">
                        <DataGridHeader>
                            <DataGridRow>
                                {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
                            </DataGridRow>
                        </DataGridHeader>
                        <DataGridBody<any>>
                            {({ item, rowId }) => (
                                <DataGridRow<any> key={rowId}>
                                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                                </DataGridRow>
                            )}
                        </DataGridBody>
                    </DataGrid>
                </div>
            </div>;
        }}</SizeMe>}
    />;
}; 