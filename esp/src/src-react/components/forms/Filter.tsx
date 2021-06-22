import * as React from "react";
import { Dialog, IDragOptions, ContextualMenu, DefaultButton, PrimaryButton, DialogType, DialogFooter } from "@fluentui/react";
import nlsHPCC from "src/nlsHPCC";
import { Fields, Values } from "./Fields";
import { TableForm } from "./Forms";

interface FilterProps {
    filterFields: Fields;
    onApply: (values: Values) => void;

    showFilter: boolean;
    setShow: (_: boolean) => void;
}

export const Filter: React.FunctionComponent<FilterProps> = ({
    filterFields,
    onApply,
    showFilter,
    setShow
}) => {

    const [doSubmit, setDoSubmit] = React.useState(false);
    const [doReset, setDoReset] = React.useState(false);

    const closeFilter = () => setShow(false);

    const dragOptions: IDragOptions = {
        moveMenuItemText: "Move",
        closeMenuItemText: "Close",
        menu: ContextualMenu,
    };

    return <Dialog
        hidden={!showFilter}
        onDismiss={closeFilter}
        dialogContentProps={{
            type: DialogType.close,
            title: nlsHPCC.Filter,
        }}
        modalProps={{
            isBlocking: false,
            dragOptions,
        }}>
        <TableForm
            fields={filterFields}
            doSubmit={doSubmit}
            doReset={doReset}
            onSubmit={fields => {
                setDoSubmit(false);
                onApply(fields);
            }}
            onReset={() => {
                setDoReset(false);
            }}
        />
        <DialogFooter>
            <DefaultButton
                text={nlsHPCC.Clear}
                onClick={() => {
                    setDoReset(true);
                }}
            />
            <PrimaryButton
                text={nlsHPCC.Apply}
                onClick={() => {
                    setDoSubmit(true);
                    closeFilter();
                }}
            />
        </DialogFooter>
    </Dialog>;
    // return <Modal
    //     titleAriaId={titleId}
    //     isOpen={showFilter}
    //     onDismiss={closeFilter}
    //     isBlocking={false}
    //     containerClassName={contentStyles.container}
    //     dragOptions={dragOptions}>
    //     <div className={contentStyles.header}>
    //         <span id={titleId}>Filter</span>
    //         <IconButton
    //             styles={iconButtonStyles}
    //             iconProps={cancelIcon}
    //             ariaLabel="Close popup modal"
    //             onClick={closeFilter}
    //         />
    //     </div>
    //     <div className={contentStyles.body}>
    //         <Stack>
    //             <TableForm
    //                 fields={filterFields}
    //                 doSubmit={doSubmit}
    //                 doReset={doReset}
    //                 onSubmit={fields => {
    //                     setDoSubmit(false);
    //                     onApply(fields);
    //                 }}
    //                 onReset={() => {
    //                     setDoReset(false);
    //                 }}
    //             />
    //         </Stack>
    //         <Stack
    //             horizontal
    //             horizontalAlign="space-between"
    //             verticalAlign="end"
    //             styles={buttonStackStyles}
    //         >
    //             <DefaultButton
    //                 text={nlsHPCC.Clear}
    //                 onClick={() => {
    //                     setDoReset(true);
    //                 }}
    //             />
    //             <PrimaryButton
    //                 text={nlsHPCC.Apply}
    //                 onClick={() => {
    //                     setDoSubmit(true);
    //                     closeFilter();
    //                 }}
    //             />
    //         </Stack>
    //     </div>
    // </Modal >;
};
