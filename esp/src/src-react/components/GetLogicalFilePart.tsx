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
    GetLogicalFilePart(request: WsDali.GetLogicalFilePartRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetLogicalFilePart", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetLogicalFilePart.tsx");

const myDaliService = new MyDaliService({ baseUrl: "" });

interface GetLogicalFilePartProps {
}

export const GetLogicalFilePart: React.FunctionComponent<GetLogicalFilePartProps> = ({

}) => {

    const [columnNames, setColumnNames] = React.useState<string[]>([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [fileName, setFileName] = React.useState<string>("");
    const [partNumber, setPartNumber] = React.useState<number>(1);

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => columnNames.map(col => createTableColumn<any>({
        columnId: col,
        renderHeaderCell: () => col,
        renderCell: (item) => item[col]
    })), [columnNames]);

    const onSubmit = React.useCallback(() => {
        myDaliService.GetLogicalFilePart({ FileName: fileName, PartNumber: partNumber }).then(response => {
            const data = csvParse(response.Result);
            setColumnNames(data.columns);
            setItems(data);
        }).catch(err => logger.error(err));
    }, [fileName, partNumber]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName },
            "PartNumber": { label: nlsHPCC.PartNumber, type: "number", value: partNumber },
        }} onChange={(id, value) => {
            switch (id) {
                case "FileName":
                    setFileName(value);
                    break;
                case "PartNumber":
                    setPartNumber(value);
                    break;
                default:
                    logger.debug(`${id}:  ${value}`);
            }
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