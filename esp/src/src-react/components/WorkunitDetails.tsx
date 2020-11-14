import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps, PersonaSize, Pivot, PivotItem, ScrollablePane, ScrollbarVisibility, Sticky, StickyPositionType } from "@fluentui/react";
import { SizeMe } from "react-sizeme";
import { ReflexContainer, ReflexSplitter, ReflexElement } from "react-reflex";
import nlsHPCC from "src/nlsHPCC";
import { useWorkunit } from "../hooks/Workunit";
import { DojoAdapter } from "../layouts/DojoAdapter";
import { pushUrl } from "../util/history";
import { ShortVerticalDivider } from "./Common";
import { WorkunitPersona } from "./WorkunitPersona";
import { Results } from "./Results";
import { Variables } from "./Variables";
import { SourceFiles } from "./SourceFiles";
import { Details } from "./Details";

import "react-reflex/styles.css";

const pivotItemStyle = (size, padding: number = 4) => {
    if (isNaN(size.width)) {
        return { position: "absolute", padding: `${padding}px`, overflow: "auto", zIndex: 0 } as React.CSSProperties;
    }
    return { position: "absolute", padding: `${padding}px`, overflow: "auto", zIndex: 0, width: size.width - padding * 2, height: size.height - 45 - padding * 2 } as React.CSSProperties;
};

interface InfoGridProps {
    wuid: string;
    dimensions?: any;
}

const InfoGrid: React.FunctionComponent<InfoGridProps> = ({
    wuid,
    dimensions
}) => {
    return <div className="pane-content" style={{ height: dimensions.height }}>
        <DojoAdapter widgetClassID="InfoGridWidget" params={{ Wuid: wuid }} delayProps={{ showToolbar: true }} />
    </div>;
};

interface WorkunitDetailsProps {
    wuid: string;
    tab?: string;
}

export const WorkunitDetails: React.FunctionComponent<WorkunitDetailsProps> = ({
    wuid,
    tab = "summary"
}) => {

    const [workunit] = useWorkunit(wuid, true);

    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => {
                workunit.refresh();
            }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ];

    return <SizeMe monitorHeight>{({ size }) =>
        <Pivot overflowBehavior="menu" style={{ height: "100%" }} defaultSelectedKey={tab} onLinkClick={evt => pushUrl(`/workunits/${wuid}/${evt.props.itemKey}`)}>
            <PivotItem headerText={wuid} itemKey="summary" style={pivotItemStyle(size)}>
                <div style={{ height: "100%", position: "relative" }}>
                    <ReflexContainer orientation="horizontal">
                        <ReflexElement className="left-pane">
                            <div className="pane-content">
                                <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto}>
                                    <Sticky stickyPosition={StickyPositionType.Header}>
                                        <CommandBar items={buttons} />
                                    </Sticky>
                                    <Sticky stickyPosition={StickyPositionType.Header}>
                                        <WorkunitPersona wuid={wuid} size={PersonaSize.size56} />
                                    </Sticky>
                                    <Details fields={{
                                        "wuid": { label: nlsHPCC.WUID, type: "string", value: wuid, readonly: true },
                                        "action": { label: nlsHPCC.Action, type: "string", value: workunit?.ActionEx, readonly: true },
                                        "state": { label: nlsHPCC.State, type: "string", value: workunit?.State, readonly: true },
                                        "owner": { label: nlsHPCC.Owner, type: "string", value: workunit?.Owner, readonly: true },
                                        "jobname": { label: nlsHPCC.JobName, type: "string", value: workunit?.Jobname },
                                        "description": { label: nlsHPCC.Description, type: "string", value: workunit?.Description },
                                        "protected": { label: nlsHPCC.Protected, type: "checkbox", value: workunit?.Protected },
                                        "cluster": { label: nlsHPCC.Cluster, type: "string", value: workunit?.Cluster, readonly: true },
                                        "totalClusterTime": { label: nlsHPCC.TotalClusterTime, type: "string", value: workunit?.TotalClusterTime, readonly: true },
                                        "abortedBy": { label: nlsHPCC.AbortedBy, type: "string", value: workunit?.AbortBy, readonly: true },
                                        "abortedTime": { label: nlsHPCC.AbortedTime, type: "string", value: workunit?.AbortTime, readonly: true },
                                    }} onChange={(id, value) => {
                                        console.log(id, value);
                                        // const newDetails = { ...details };
                                        // newDetails[id].value = value;
                                        // setDetails(newDetails);
                                    }} />
                                </ScrollablePane>
                            </div>
                        </ReflexElement>
                        <ReflexSplitter />
                        <ReflexElement propagateDimensions={true} className="right-pane" style={{ overflow: "hidden" }}>
                            <InfoGrid wuid={wuid} />
                        </ReflexElement>
                    </ReflexContainer>
                </div>
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Variables} itemCount={(workunit?.VariableCount || 0) + (workunit?.ApplicationValueCount || 0) + (workunit?.DebugValueCount || 0)} itemKey="variables" style={pivotItemStyle(size, 0)}>
                <Variables wuid={wuid} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Outputs} itemKey="outputs" itemCount={workunit?.ResultCount} style={pivotItemStyle(size, 0)}>
                <Results wuid={wuid} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Inputs} itemKey="inputs" itemCount={workunit?.SourceFileCount} style={pivotItemStyle(size, 0)}>
                <SourceFiles wuid={wuid} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Timers} itemKey="timers" itemCount={workunit?.TimerCount} style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="TimingPageWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Graphs} itemKey="graphs" itemCount={workunit?.GraphCount} style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="GraphsWUWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Workflows} itemKey="workflows" itemCount={workunit?.WorkflowCount} style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="WorkflowsWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Queries} itemIcon="Search" itemKey="queries" style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="QuerySetQueryWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Resources} itemKey="resources" style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="ResourcesWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Helpers} itemKey="helpers" itemCount={workunit?.HelpersCount} style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="HelpersWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.ECL} itemKey="eclsummary" style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="ECLArchiveWidget" params={{ Wuid: wuid }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.XML} itemKey="xml" style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="ECLSourceWidget" params={{ Wuid: wuid }} delayProps={{ WUXml: true }} />
            </PivotItem>
        </Pivot>
    }</SizeMe>;
};
