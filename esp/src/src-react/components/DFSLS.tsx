import * as React from "react";
import { Button, DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridHeaderCell, DataGridRow, TableColumnDefinition, createTableColumn } from "@fluentui/react-components";
import { SizeMe } from "../layouts/SizeMe";
import { csvParse } from "d3-dsv";
import { DaliService } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { HolyGrail } from "../layouts/HolyGrail";

const logger = scopedLogger("src-react/components/DFSLS.tsx");

const myDaliService = new DaliService({ baseUrl: "" });

interface DFSLSProps {
}

export const DFSLS: React.FunctionComponent<DFSLSProps> = ({

}) => {

    const [columnNames, setColumnNames] = React.useState<string[]>([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [name, setName] = React.useState<string>("");
    const [pathAndNameOnly, setPathAndNameOnly] = React.useState(true);
    const [includeSubFileInfo, setIncludeSubFileInfo] = React.useState(false);
    const [recursively, setRecursively] = React.useState(false);

    const dataGridColumns = React.useMemo<TableColumnDefinition<any>[]>(() => columnNames.map(col => createTableColumn<any>({
        columnId: col,
        renderHeaderCell: () => col,
        renderCell: (item) => item[col]
    })), [columnNames]);

    const onSubmit = React.useCallback(() => {
        myDaliService.DFSLS({ Name: name, PathAndNameOnly: pathAndNameOnly, IncludeSubFileInfo: includeSubFileInfo, Recursively: recursively }).then(response => {
            const data = csvParse(response.Result);
            setColumnNames(data.columns);
            setItems(data);
        }).catch(err => logger.error(err));
    }, [name, pathAndNameOnly, includeSubFileInfo, recursively]);

    return <HolyGrail
        header={<span><TableGroup fields={{
            "Name": { label: nlsHPCC.Name, type: "string", value: name },
            "PathAndNameOnly": { label: nlsHPCC.PathAndNameOnly, type: "checkbox", value: pathAndNameOnly },
            "IncludeSubFileInfo": { label: nlsHPCC.IncludeSubFileInfo, type: "checkbox", value: includeSubFileInfo },
            "Recursively": { label: nlsHPCC.Recursively, type: "checkbox", value: recursively },

        }} onChange={(id, value) => {
            switch (id) {
                case "Name":
                    setName(value);
                    break;
                case "PathAndNameOnly":
                    setPathAndNameOnly(value);
                    break;
                case "IncludeSubFileInfo":
                    setIncludeSubFileInfo(value);
                    break;
                case "Recursively":
                    setRecursively(value);
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