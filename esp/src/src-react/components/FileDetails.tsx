import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps, Pivot, PivotItem, ScrollablePane, ScrollbarVisibility, Sticky, StickyPositionType } from "@fluentui/react";
import { SizeMe } from "react-sizeme";
import nlsHPCC from "src/nlsHPCC";
import { useFile } from "../hooks/File";
import { DojoAdapter } from "../layouts/DojoAdapter";
import { pushUrl } from "../util/history";
import { ShortVerticalDivider } from "./Common";
import { TableGroup } from "./forms/Groups";
import { Result } from "./Result";

import "react-reflex/styles.css";

const pivotItemStyle = (size, padding: number = 4) => {
    if (isNaN(size.width)) {
        return { position: "absolute", padding: `${padding}px`, overflow: "auto", zIndex: 0 } as React.CSSProperties;
    }
    return { position: "absolute", padding: `${padding}px`, overflow: "auto", zIndex: 0, width: size.width - padding * 2, height: size.height - 45 - padding * 2 } as React.CSSProperties;
};

interface FileDetailsProps {
    cluster: string;
    logicalFile: string;
    tab?: string;
}

export const FileDetails: React.FunctionComponent<FileDetailsProps> = ({
    cluster,
    logicalFile,
    tab = "summary"
}) => {

    const [file, , refresh] = useFile(cluster, logicalFile);
    // const [jobname, setJobname] = React.useState("");
    // const [description, setDescription] = React.useState("");
    // const [_protected, setProtected] = React.useState(false);

    // React.useEffect(() => {
    //     setJobname(jobname || workunit?.Jobname);
    //     setDescription(description || workunit?.Description);
    //     setProtected(_protected || workunit?.Protected);

    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [workunit?.Jobname, workunit?.Jobname, workunit?.Jobname]);

    const canSave = false;
    // const canSave = workunit && (
    //     jobname !== workunit.Jobname ||
    //     description !== workunit.Description ||
    //     _protected !== workunit.Protected
    // );

    const buttons: ICommandBarItemProps[] = [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => {
                refresh();
            }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
        {
            key: "save", text: nlsHPCC.Save, iconProps: { iconName: "Save" }, disabled: !canSave,
            onClick: () => {
                // workunit?.update({
                //     Jobname: jobname,
                //     Description: description,
                //     Protected: _protected
                // });
            }
        },
        {
            key: "copy", text: nlsHPCC.CopyWUID, iconProps: { iconName: "Copy" },
            onClick: () => {
                navigator?.clipboard?.writeText(logicalFile);
            }
        },
        { key: "divider_2", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ];

    React.useEffect(() => {
        // let superOwner = [];
        // if (file?.DFULogicalFile.length > 0) {
        //     this.setDisabled(this.id + "_FileBelongs", false);
        //     for (let i = 0; i < newValue.DFULogicalFile.length; ++i) {
        //         superOwner.push(newValue.DFULogicalFile[i].Name);
        //         this.updateInput("SuperOwner", oldValue, superOwner);
        //     }
        // }
    }, []);

    // const protectedImage = getImageURL(workunit?.Protected ? "locked.png" : "unlocked.png");
    // const stateIconClass = getStateIconClass(workunit?.StateID, workunit?.isComplete(), workunit?.Archived);

    return <SizeMe monitorHeight>{({ size }) =>
        <Pivot overflowBehavior="menu" style={{ height: "100%" }} selectedKey={tab} onLinkClick={evt => pushUrl(`/workunits/${logicalFile}/${evt.props.itemKey}`)}>
            <PivotItem headerText={nlsHPCC.Summary} itemKey="summary" style={pivotItemStyle(size)}>
                <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto}>
                    <Sticky stickyPosition={StickyPositionType.Header}>
                        <CommandBar items={buttons} />
                    </Sticky>
                    <Sticky stickyPosition={StickyPositionType.Header}>
                        <div style={{ display: "inline-block" }}>
                            <h2>
                                {/* <img src={protectedImage} />&nbsp;<div className={stateIconClass}></div>&nbsp;<span className="bold">{logicalFile}</span> */}
                                {file?.Name}
                            </h2>
                        </div>
                    </Sticky>
                    <TableGroup fields={{
                        "Wuid": { label: nlsHPCC.Workunit, type: "string", value: file?.Wuid, readonly: true },
                        "Owner": { label: nlsHPCC.Owner, type: "string", value: file?.Owner, readonly: true },
                        "SuperOwner": { label: nlsHPCC.SuperOwner, type: "string", value: "???", readonly: true },
                        "NodeGroup": { label: nlsHPCC.ClusterName, type: "string", value: file?.NodeGroup, readonly: true },
                        "Description": { label: nlsHPCC.Description, type: "string", value: file?.Description, readonly: true },
                        "JobName": { label: nlsHPCC.JobName, type: "string", value: file?.JobName, readonly: true },
                        "isProtected": { label: nlsHPCC.Protected, type: "checkbox", value: false, readonly: true },
                        "isRestricted": { label: nlsHPCC.Restricted, type: "checkbox", value: false, readonly: true },
                        "ContentType": { label: nlsHPCC.ContentType, type: "string", value: file?.ContentType, readonly: true },
                        "KeyType": { label: nlsHPCC.KeyType, type: "string", value: file?.KeyType, readonly: true },
                        "Filesize": { label: nlsHPCC.FileSize, type: "string", value: file?.Filesize, readonly: true },
                        "Format": { label: nlsHPCC.Format, type: "string", value: file?.Format, readonly: true },
                        "IsCompressed": { label: nlsHPCC.IsCompressed, type: "checkbox", value: file?.IsCompressed, readonly: true },
                        "CompressedFileSizeString": { label: nlsHPCC.CompressedFileSize, type: "string", value: "???", readonly: true },
                        "PercentCompressed": { label: nlsHPCC.PercentCompressed, type: "string", value: file?.PercentCompressed, readonly: true },
                        "Modified": { label: nlsHPCC.Modified, type: "string", value: file?.Modified, readonly: true },
                        "ExpireDays": { label: nlsHPCC.ExpireDays, type: "number", value: file?.ExpireDays, readonly: true },
                        "Directory": { label: nlsHPCC.Directory, type: "string", value: "???", readonly: true },
                        "PathMask": { label: nlsHPCC.PathMask, type: "string", value: file?.PathMask, readonly: true },
                        "RecordSize": { label: nlsHPCC.RecordSize, type: "string", value: file?.RecordSize, readonly: true },
                        "RecordCount": { label: nlsHPCC.RecordCount, type: "string", value: file?.RecordCount, readonly: true },
                        "DFUFilePartsOnClusters": { label: nlsHPCC.IsReplicated, type: "string", value: "???", readonly: true },
                        "NumParts": { label: nlsHPCC.FileParts, type: "number", value: file?.NumParts, readonly: true },
                        "MinSkew": { label: nlsHPCC.MinSkew, type: "string", value: file?.Stat?.MinSkew, readonly: true },
                        "MaxSkew": { label: nlsHPCC.MaxSkew, type: "string", value: file?.Stat?.MaxSkew, readonly: true },
                        "MinSkewPart": { label: nlsHPCC.MinSkewPart, type: "number", value: file?.Stat?.MinSkewPart, readonly: true },
                        "MaxSkewPart": { label: nlsHPCC.MaxSkewPart, type: "number", value: file?.Stat?.MaxSkewPart, readonly: true },
                    }} onChange={(id, value) => {
                        switch (id) {
                            case "jobname":
                                // setJobname(value);
                                break;
                            case "description":
                                // setDescription(value);
                                break;
                            case "protected":
                                // setProtected(value);
                                break;
                            default:
                                console.log(id, value);
                        }
                    }} />
                </ScrollablePane>
            </PivotItem>
            <PivotItem headerText={nlsHPCC.Contents} itemKey="contents" style={pivotItemStyle(size, 0)}>
                <Result logicalFile={logicalFile} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.DataPatterns} itemKey="dataPatterns" style={pivotItemStyle(size, 0)}>
                <DojoAdapter widgetClassID="DataPatternsWidget" params={{ Wuid: logicalFile }} />
            </PivotItem>
            <PivotItem headerText={nlsHPCC.ECL} itemKey="ecl" style={pivotItemStyle(size, 0)}>
                {/* <SourceFiles wuid={wuid} /> */}
            </PivotItem>
            <PivotItem headerText={nlsHPCC.DEF} itemKey="def" style={pivotItemStyle(size, 0)}>
                {/* <SourceFiles wuid={wuid} /> */}
            </PivotItem>
            <PivotItem headerText={nlsHPCC.XML} itemKey="xml" style={pivotItemStyle(size, 0)}>
                {/* <SourceFiles wuid={wuid} /> */}
            </PivotItem>
        </Pivot>
    }</SizeMe>;
};
