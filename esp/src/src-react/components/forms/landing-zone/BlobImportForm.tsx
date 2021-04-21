import * as React from "react";
import {
    Checkbox, ContextualMenu, FontWeights, getTheme, IconButton,
    IDragOptions, IIconProps, IStackStyles, mergeStyleSets,
    Modal, PrimaryButton, Stack, TextField,
} from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { useForm, Controller } from "react-hook-form";
import * as FileSpray from "src/FileSpray";
import { TargetDfuSprayQueueTextField, TargetGroupTextField } from "../Fields";
import nlsHPCC from "src/nlsHPCC";
import { pushUrl } from "../../../util/history";

type BlobImportFormValues = {
    destGroup: string;
    DFUServerQueue: string;
    destLogicalName: string;
    selectedFiles: {
        TargetName: string,
        SourceFile: string,
        SourceIP: string
    }[],
    prefix: string;
    overwrite: boolean;
    replicate: boolean;
    nosplit: boolean;
    noCommon: boolean;
    compress: boolean;
    failIfNoSourceFile: boolean;
    delayedReplication: boolean;
    expireDays: string;
};

interface BlobImportFormProps {
    formMinWidth?: number;
    showForm: boolean;
    selection: object[];
    setShowForm: (_: boolean) => void;
}

export const BlobImportForm: React.FunctionComponent<BlobImportFormProps> = ({
    formMinWidth = 300,
    showForm,
    selection,
    setShowForm
}) => {

    const defaultValues = {
        destGroup: "",
        DFUServerQueue: "",
        namePrefix: "",
        prefix: "",
        overwrite: false,
        replicate: false,
        nosplit: false,
        noCommon: true,
        compress: false,
        failIfNoSourceFile: false,
        delayedReplication: true,
        expireDays: ""
    };

    const { handleSubmit, control, register, reset } = useForm<BlobImportFormValues>({ defaultValues });

    const onSubmit = () => {
        handleSubmit(
            (data, evt) => {
                // console.log(selection); return;
                let request = {};
                const files = data.selectedFiles;

                delete data.selectedFiles;

                files.forEach(file => {
                    request = data;
                    request["sourceIP"] = file.SourceIP;
                    request["sourcePath"] = file.SourceFile;
                    FileSpray.SprayFixed({
                        request: request
                    }).then((response) => {
                        if (response.SprayFixedResponse?.wuid) {
                            pushUrl(`/dfuworkunits/${response.SprayFixedResponse.wuid}`);
                        }
                    });
                });
            },
            err => {
                console.log(err);
            }
        )();
    };

    const titleId = useId("title");

    const closeForm = () => {
        setShowForm(false);
        reset(defaultValues);
    };

    const dragOptions: IDragOptions = {
        moveMenuItemText: "Move",
        closeMenuItemText: "Close",
        menu: ContextualMenu,
    };

    const theme = getTheme();

    const cancelIcon: IIconProps = { iconName: "Cancel" };
    const iconButtonStyles = {
        root: {
            marginLeft: "auto",
            marginTop: "4px",
            marginRight: "2px",
        }
    };
    const buttonStackStyles: IStackStyles = {
        root: {
            height: "56px",
            justifyContent: "flex-end"
        },
    };
    const componentStyles = mergeStyleSets({
        container: {
            display: "flex",
            flexFlow: "column nowrap",
            alignItems: "stretch",
            minWidth: formMinWidth ? formMinWidth : 300,
        },
        header: [
            {
                flex: "1 1 auto",
                borderTop: `4px solid ${theme.palette.themePrimary}`,
                display: "flex",
                alignItems: "center",
                fontWeight: FontWeights.semibold,
                padding: "12px 12px 14px 24px",
            },
        ],
        body: {
            flex: "4 4 auto",
            padding: "0 24px 24px 24px",
            overflowY: "hidden",
            selectors: {
                p: { margin: "14px 0" },
                "p:first-child": { marginTop: 0 },
                "p:last-child": { marginBottom: 0 },
            },
        },
        selectionTable: {
            padding: "4px",
            border: `1px solid ${theme.palette.themeDark}`
        },
        twoColumnTable: {
            marginTop: "14px",
            "selectors": {
                "tr": { marginTop: "10px" }
            }
        }
    });

    return <Modal
        titleAriaId={titleId}
        isOpen={showForm}
        onDismiss={closeForm}
        isBlocking={false}
        containerClassName={componentStyles.container}
        dragOptions={dragOptions}
    >
        <div className={componentStyles.header}>
            <span id={titleId}>{`${nlsHPCC.Import} ${nlsHPCC.Blob}`}</span>
            <IconButton
                styles={iconButtonStyles}
                iconProps={cancelIcon}
                ariaLabel="Close popup modal"
                onClick={closeForm}
            />
        </div>
        <div className={componentStyles.body}>
            <Stack>
                <Controller
                    control={control} name="destGroup" defaultValue={undefined}
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TargetGroupTextField
                        key="destGroup"
                        label={nlsHPCC.Group}
                        required={true}
                        optional={true}
                        selectedKey={value}
                        placeholder={"Select a value"}
                        onChange={(evt, option) => {
                            onChange(option.key);
                        }}
                        errorMessage={ error && error.message }
                    /> }
                    rules={{
                        required: `Select a ${nlsHPCC.Group}`
                    }}
                />
                <Controller
                    control={control} name="DFUServerQueue" defaultValue={undefined}
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TargetDfuSprayQueueTextField
                        key="DFUServerQueue"
                        label={nlsHPCC.Queue}
                        required={true}
                        optional={true}
                        selectedKey={value}
                        placeholder={"Select a value"}
                        onChange={(evt, option) => {
                            onChange(option.key);
                        }}
                        errorMessage={ error && error.message }
                    /> }
                    rules={{
                        required: `Select a ${nlsHPCC.Queue}`
                    }}
                />
                <Controller
                    control={control} name="destLogicalName" defaultValue={""}
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TextField
                        name={fieldName}
                        onChange={onChange}
                        label={nlsHPCC.TargetScope}
                        defaultValue={undefined}
                        placeholder={nlsHPCC.TargetNamePlaceholder}
                        errorMessage={ error && error.message }
                    /> }
                    rules={{
                        pattern: {
                            value: /^([a-z0-9]+(::)?)+$/i,
                            message: nlsHPCC.ValidationErrorNamePrefix
                        }
                    }}
                />
            </Stack>
            <Stack>
                <table className={`${componentStyles.twoColumnTable} ${componentStyles.selectionTable}`}>
                    <thead>
                        <tr>
                            <th>{nlsHPCC.SourcePath}</th>
                        </tr>
                    </thead>
                    <tbody>
                    { selection.map((file, idx) => {
                        return <tr key={`File-${idx}`}>
                            <td>
                                <Controller
                                    control={control} name={`selectedFiles.${idx}.SourceFile` as const} defaultValue={file["fullPath"]}
                                    render={({
                                        field: { onChange, name: fieldName, value },
                                        fieldState: { error }
                                    }) => <TextField
                                        name={fieldName}
                                        onChange={onChange}
                                        value={value ? value : file["fullPath"]}
                                        defaultValue={file["fullPath"]}
                                        errorMessage={ error && error.message }
                                    /> }
                                    rules={{
                                        required: nlsHPCC.ValidationErrorTargetNameRequired,
                                        pattern: {
                                            value: /^([a-z0-9]+[-a-z0-9 \._]+)+$/i,
                                            message: nlsHPCC.ValidationErrorTargetNameInvalid
                                        }
                                    }}
                                />
                                <input type="hidden" { ...register(`selectedFiles.${idx}.SourceIP` as const) } value={file["NetAddress"]} />
                            </td>
                        </tr>;
                    }) }
                    </tbody>
                </table>
            </Stack>
            <Stack>
                <Controller
                    control={control} name="prefix" defaultValue=""
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TextField
                        name={fieldName}
                        onChange={onChange}
                        defaultValue=""
                        label={nlsHPCC.BlobPrefix}
                        placeholder={nlsHPCC.PrefixPlaceholder}
                        errorMessage={ error && error.message }
                    /> }
                />
            </Stack>
            <Stack>
                <table className={componentStyles.twoColumnTable}>
                    <tbody><tr>
                        <td><Controller
                            control={control} name="overwrite"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.Overwrite} /> }
                        /></td>
                        <td><Controller
                            control={control} name="replicate"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.Replicate} /> }
                        /></td>
                    </tr>
                    <tr>
                        <td><Controller
                            control={control} name="nosplit"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.NoSplit} /> }
                        /></td>
                        <td><Controller
                            control={control} name="noCommon"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.NoCommon} /> }
                        /></td>
                    </tr>
                    <tr>
                        <td><Controller
                            control={control} name="compress"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.Compress} /> }
                        /></td>
                        <td><Controller
                            control={control} name="failIfNoSourceFile"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.FailIfNoSourceFile} /> }
                        /></td>
                    </tr>
                    <tr>
                        <td><Controller
                            control={control} name="expireDays" defaultValue={""}
                            render={({
                                field: { onChange, onBlur, name: fieldName, value },
                                fieldState: { error }
                            }) => <TextField
                                name={fieldName}
                                onChange={onChange}
                                onBlur={onBlur}
                                label={nlsHPCC.ExpireDays}
                                defaultValue={undefined}
                                errorMessage={ error && error.message }
                            />}
                            rules={{
                                min: {
                                    value: 1,
                                    message: nlsHPCC.ValidationErrorExpireDaysMinimum
                                }
                            }}
                        /></td>
                        <td><Controller
                            control={control} name="delayedReplication"
                            render={({
                                field : { onChange, name: fieldName, value }
                            }) => <Checkbox name={fieldName} checked={value} onChange={onChange} label={nlsHPCC.DelayedReplication} disabled={true} /> }
                        /></td>
                    </tr></tbody>
                </table>
            </Stack>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="end" styles={buttonStackStyles}>
                <PrimaryButton text={nlsHPCC.Import} onClick={handleSubmit(onSubmit)} />
            </Stack>
        </div>
    </Modal>;
};