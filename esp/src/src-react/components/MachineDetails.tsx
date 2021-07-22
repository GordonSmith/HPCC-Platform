import * as React from "react";
import { Pivot, PivotItem } from "@fluentui/react";
import { SizeMe } from "react-sizeme";
import nlsHPCC from "src/nlsHPCC";
import { pivotItemStyle } from "../layouts/pivot";
import { pushUrl } from "../util/history";
import { MachineUsage } from "./DiskUsage";

interface ClusterUsageProps {
    machine: string;
    tab?: string;
}

export const MachineDetails: React.FunctionComponent<ClusterUsageProps> = ({
    machine,
    tab
}) => {
    return <SizeMe monitorHeight>{({ size }) =>
        <Pivot overflowBehavior="menu" style={{ height: "100%" }} selectedKey={tab} onLinkClick={evt => pushUrl(`/machines/${machine}/${evt.props.itemKey}`)}>
            <PivotItem headerText={machine} itemKey="summary" style={pivotItemStyle(size)} >
            </PivotItem>
            <PivotItem headerText={nlsHPCC.DiskUsage} itemKey="usage" style={pivotItemStyle(size)} >
                <MachineUsage machine={machine} />
            </PivotItem>
        </Pivot>
    }
    </SizeMe>;
};
