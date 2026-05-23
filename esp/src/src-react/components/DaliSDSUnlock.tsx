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

const logger = scopedLogger("src-react/components/DaliSDSUnlock.tsx");

const myDaliService = new DaliService({ baseUrl: "" });

interface DaliSDSUnlockProps {
}

export const DaliSDSUnlock: React.FunctionComponent<DaliSDSUnlockProps> = ({

}) => {

    const [columnNames, setColumnNames] = React.useState<string[]>([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [connectionId, setConnectionId] = React.useState<string>("");
    const [close, setClose] = React.useState(false);

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => columnNames.map(col => createTableColumn<any>({
        columnId: col,
        renderHeaderCell: () => col,
        renderCell: (item) => item[col]
    })), [columnNames]);

    const [DaliPromptConfirm, setDaliPromptConfirm] = useConfirm({
        title: nlsHPCC.DaliAdmin,
        message: nlsHPCC.DaliPromptConfirm,
        onSubmit: React.useCallback(() => {
            myDaliService.UnlockSDSLock({ ConnectionID: connectionId, Close: close }).then(response => {
                const data = csvParse(response.Result);
                setColumnNames(data.columns);
                setItems(data);
            }).catch(err => logger.error(err));
        }, [connectionId, close])
    });

    const onSubmit = React.useCallback(() => {
        setDaliPromptConfirm(true);
    }, [setDaliPromptConfirm]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "ConnectionID": { label: nlsHPCC.ConnectionID, type: "string", value: connectionId },
            "Close": { label: nlsHPCC.Close, type: "checkbox", value: close },
        }} onChange={(id, value) => {
            switch (id) {
                case "ConnectionID":
                    setConnectionId(value);
                    break;
                case "Close":
                    setClose(value);
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