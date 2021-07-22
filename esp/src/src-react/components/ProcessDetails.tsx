import * as React from "react";
import { Pivot, PivotItem } from "@fluentui/react";
import { SizeMe } from "react-sizeme";
import nlsHPCC from "src/nlsHPCC";
import { pivotItemStyle } from "../layouts/pivot";
import { pushUrl } from "../util/history";

interface ProcessDetailsProps {
    machine: string;
    process: string;
    tab: string;
}

export const ProcessDetails: React.FunctionComponent<ProcessDetailsProps> = ({
    machine,
    process,
    tab
}) => {

    return <SizeMe monitorHeight>{({ size }) =>
        <Pivot overflowBehavior="menu" style={{ height: "100%" }} selectedKey={tab} onLinkClick={evt => pushUrl(`/machines/${machine}/${process}/${evt.props.itemKey}`)}>
            <PivotItem headerText={`${process}`} itemKey="summary" style={pivotItemStyle(size)} >
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Configuration} itemKey="configuration" style={pivotItemStyle(size)} >
                {machine}-{process}-config
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Logs} itemKey="logs" style={pivotItemStyle(size)} >
                {machine}-{process}-logs
            </PivotItem>
        </Pivot>
    }
    </SizeMe >;
};
