import * as React from "react";
import { Button, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, TableColumnDefinition, createTableColumn } from "@fluentui/react-components";
import { SizeMe } from "../layouts/SizeMe";
import { DaliService } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { HolyGrail } from "../layouts/HolyGrail";

const logger = scopedLogger("src-react/components/DaliCount.tsx");

const myDaliService = new DaliService({ baseUrl: "" });

interface CountRequestProps {

}

export const DaliCount: React.FunctionComponent<CountRequestProps> = ({

}) => {

    const [items, setItems] = React.useState<any[]>([]);
    const [path, setPath] = React.useState<string>("");

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => [createTableColumn<any>({
        columnId: "Result",
        renderHeaderCell: () => "Result",
        renderCell: (item) => item.result
    })], []);

    const onSubmit = React.useCallback(() => {
        myDaliService.Count({ Path: path }).then(response => {
            const data = [{
                key: "Result",
                result: response.Result
            }];
            setItems(data);
        }).catch(err => logger.error(err));
    }, [path]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "Path": { label: nlsHPCC.Path, type: "string", value: path },
        }} onChange={(id, value) => {
            setPath(value);
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