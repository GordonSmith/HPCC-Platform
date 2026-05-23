import * as React from "react";
import { Button, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, TableColumnDefinition, createTableColumn } from "@fluentui/react-components";
import { SizeMe } from "../layouts/SizeMe";
import { csvParse } from "d3-dsv";
import { DaliService } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import { useConfirm } from "../hooks/confirm";
import nlsHPCC from "src/nlsHPCC";
import { HolyGrail } from "../layouts/HolyGrail";

const logger = scopedLogger("src-react/components/DaliImport.tsx");

const myDaliService = new DaliService({ baseUrl: "" });

interface DaliImportProps {
}

export const DaliImport: React.FunctionComponent<DaliImportProps> = ({

}) => {

    const [columnNames, setColumnNames] = React.useState<string[]>([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [xml, setXml] = React.useState<string>("");
    const [path, setPath] = React.useState<string>("");
    const [add, setAdd] = React.useState(false);

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => columnNames.map(col => createTableColumn<any>({
        columnId: col,
        renderHeaderCell: () => col,
        renderCell: (item) => item[col]
    })), [columnNames]);

    const [DaliPromptConfirm, setDaliPromptConfirm] = useConfirm({
        title: nlsHPCC.DaliAdmin,
        message: nlsHPCC.DaliPromptConfirm,
        onSubmit: React.useCallback(() => {
            myDaliService.Import({ XML: xml, Path: path, Add: add }).then(response => {
                const data = csvParse(response.Result);
                setColumnNames(data.columns);
                setItems(data);
            }).catch(err => logger.error(err));
        }, [xml, path, add])
    });

    const onSubmit = React.useCallback(() => {
        setDaliPromptConfirm(true);
    }, [setDaliPromptConfirm]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "XML": { label: nlsHPCC.XML, type: "string", value: xml },
            "Path": { label: nlsHPCC.Path, type: "string", value: path },
            "Add": { label: nlsHPCC.Add, type: "checkbox", value: add },
        }} onChange={(id, value) => {
            switch (id) {
                case "XML":
                    setXml(value);
                    break;
                case "Path":
                    setPath(value);
                    break;
                case "Add":
                    setAdd(value);
                    break;
                default:
                    logger.debug(`${id}: ${value}`);
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
                    <DaliPromptConfirm />
                </div>
            </div>;
        }}</SizeMe>}
    />;
}; 