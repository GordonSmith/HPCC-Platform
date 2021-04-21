import * as React from "react";
import {
    ContextualMenu, FontWeights, getTheme, IconButton,
    IDragOptions, IIconProps, IStackStyles, mergeStyleSets,
    Modal, PrimaryButton, Stack, TextField,
} from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import { useForm, Controller } from "react-hook-form";
import * as FileSpray from "src/FileSpray";
import nlsHPCC from "src/nlsHPCC";
import { pushUrl } from "../../../util/history";

type AddFileFormValues = {
    NetAddress: string;
    fullPath: string;
};

interface AddFileFormProps {
    formMinWidth?: number;
    showForm: boolean;
    selection: object[];
    setShowForm: (_: boolean) => void;
}

export const AddFileForm: React.FunctionComponent<AddFileFormProps> = ({
    formMinWidth = 300,
    showForm,
    selection,
    setShowForm
}) => {

    const defaultValues = {
        NetAddress: "",
        fullPath: ""
    };

    const { handleSubmit, control, register, reset } = useForm<AddFileFormValues>({ defaultValues });

    const onSubmit = () => {
        handleSubmit(
            (data, evt) => {
                let request = data;
                console.log(data);
                // FileSpray.SprayFixed({
                //     request: request
                // }).then((response) => {
                //     if (response.SprayFixedResponse?.wuid) {
                //         pushUrl(`/dfuworkunits/${response.SprayFixedResponse.wuid}`);
                //     }
                // });
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
            <span id={titleId}>{nlsHPCC.AddFile}</span>
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
                    control={control} name="NetAddress" defaultValue={undefined}
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TextField
                        key="NetAddress"
                        label={nlsHPCC.IP}
                        required={true}
                        errorMessage={ error && error.message }
                    /> }
                    rules={{
                        required: nlsHPCC.ValidationErrorRequired
                    }}
                />
                <Controller
                    control={control} name="fullPath" defaultValue={undefined}
                    render={({
                        field: { onChange, name: fieldName, value },
                        fieldState: { error }
                    }) => <TextField
                        key="fullPath"
                        label={nlsHPCC.Path}
                        required={true}
                        placeholder={nlsHPCC.NamePrefixPlaceholder}
                        errorMessage={ error && error.message }
                    /> }
                    rules={{
                        required: nlsHPCC.ValidationErrorRequired
                    }}
                />
            </Stack>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="end" styles={buttonStackStyles}>
                <PrimaryButton text={nlsHPCC.Add} onClick={handleSubmit(onSubmit)} />
            </Stack>
        </div>
    </Modal>;
};