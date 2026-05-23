import * as React from "react";
import { Button } from "@fluentui/react-components";
import { Dialog, DialogFooter } from "@fluentui/react";
import nlsHPCC from "src/nlsHPCC";

interface useConfirmProps {
    title: string;
    message: string;
    items?: string[];
    submitLabel?: string;
    cancelLabel?: string;
    onSubmit: () => void;
}

export function useConfirm({ title, message, items = [], onSubmit, submitLabel = nlsHPCC.OK, cancelLabel = nlsHPCC.Cancel }: useConfirmProps): [React.FunctionComponent, (_: boolean) => void] {

    const [show, setShow] = React.useState(false);

    const Confirm = React.useMemo(() => () => {
        return <Dialog
            hidden={!show}
            onDismiss={() => setShow(false)}
            dialogContentProps={{
                title: title
            }}
            maxWidth={500}
        >
            <div>
                <p>{message}</p>
                {items.map((item, idx) => {
                    return <span key={idx}>{item} <br /></span>;
                })}
            </div>
            <DialogFooter>
                <Button appearance="primary" onClick={() => { if (typeof onSubmit === "function") { onSubmit(); } setShow(false); }}>{submitLabel}</Button>
                {cancelLabel && <Button onClick={() => setShow(false)}>{cancelLabel}</Button>}
            </DialogFooter>
        </Dialog>;
    }, [cancelLabel, items, message, onSubmit, show, submitLabel, title]);

    return [Confirm, setShow];
}