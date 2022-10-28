import * as React from "react";
import { Panel, PanelType } from "@fluentui/react/lib/Panel";
import { DataGrid, } from "@duckdb/react-duckdb-table";
import nlsHPCC from "src/nlsHPCC";

interface RawDataProps {
    show: boolean;
    dismissPanel: () => void;
    panelType?: PanelType;
}

export const RawData: React.FunctionComponent<RawDataProps> = ({
    show = false,
    dismissPanel,
    panelType = PanelType.extraLarge
}) => {

    return <Panel isOpen={show} onDismiss={dismissPanel} headerText={nlsHPCC.RawData} type={panelType} closeButtonAriaLabel={nlsHPCC.Close} >
        <DataGrid width={100} height={100}></DataGrid>
    </Panel>;
};
