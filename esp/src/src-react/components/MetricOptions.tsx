import * as React from "react";
import { IDragOptions, ContextualMenu, DialogType, Dialog, DialogFooter, DefaultButton, PrimaryButton } from "@fluentui/react";
import nlsHPCC from "src/nlsHPCC";

interface MetricOptionsProps {
    show: boolean;
    setShow: (_: boolean) => void;
}

export const MetricOptions: React.FunctionComponent<MetricOptionsProps> = ({
    show,
    setShow
}) => {

    const [_doSubmit, _setDoSubmit] = React.useState(false);
    const [_doReset, _setDoReset] = React.useState(false);

    const closeOptions = () => setShow(false);

    const dragOptions: IDragOptions = {
        moveMenuItemText: "Move",
        closeMenuItemText: "Close",
        menu: ContextualMenu,
    };

    return <Dialog
        hidden={!show}
        onDismiss={closeOptions}
        dialogContentProps={{
            type: DialogType.close,
            title: nlsHPCC.Options,
        }}
        modalProps={{
            isBlocking: false,
            dragOptions,
        }}>
        <DialogFooter>
            <PrimaryButton
                text={nlsHPCC.OK}
                onClick={() => {
                    closeOptions();
                }}
            />
            <DefaultButton
                text={nlsHPCC.Cancel}
                onClick={() => {
                    closeOptions();
                }}
            />
            <DefaultButton
                text={nlsHPCC.Defaults}
                onClick={() => {
                }}
            />
        </DialogFooter>
    </Dialog>;
};