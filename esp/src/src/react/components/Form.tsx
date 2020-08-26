import * as React from "react";
import { FormGroup, TextField, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@material-ui/core";
import { nlsHPCC } from "src/dojoLib";

type FieldType = "string" | "datetime" | "checkbox";

interface BaseField {
    type: FieldType;
    label: string;
    placeholder?: string;
}

interface StringField extends BaseField {
    type: "string";
    value?: string;
}

interface DateTimeField extends BaseField {
    type: "datetime";
    value?: string;
}

interface CheckboxField extends BaseField {
    type: "checkbox";
    value?: boolean;
}

type Field = StringField | DateTimeField | CheckboxField;
export type Fields = { [name: string]: Field };
export type Values = { [name: string]: string | boolean };

const fieldsToRequest = (fields: Fields) => {
    const retVal: Values = {};
    for (const name in fields) {
        retVal[name] = fields[name].value;
    }
    return retVal;
};

interface FormContentProps {
    fields: Fields;
    doSubmit: boolean;
    doReset: boolean;
    onSubmit: (fields: Values) => void;
    onReset: (fields: Values) => void;
}

export const FormContent: React.FunctionComponent<FormContentProps> = ({
    fields,
    doSubmit,
    doReset,
    onSubmit,
    onReset
}) => {

    const [localFields, setLocalFields] = React.useState({ ...fields });

    React.useEffect(() => {
        if (doSubmit === false) return;
        onSubmit(fieldsToRequest(localFields));
    }, [doSubmit]);

    React.useEffect(() => {
        if (doReset === false) return;
        for (const key in localFields) {
            delete localFields[key].value;
        }
        setLocalFields(localFields);
        onReset(fieldsToRequest(localFields));
    }, [doReset]);

    const handleChange = ev => {
        const field = localFields[ev.target.name];
        switch (field.type) {
            case "checkbox":
                localFields[ev.target.name].value = ev.target.checked;
                setLocalFields({ ...localFields });
                break;
            default:
                localFields[ev.target.name].value = ev.target.value;
                setLocalFields({ ...localFields });
                break;
        }
    };

    const formFields = [];
    for (const name in localFields) {
        const field: Field = localFields[name];
        switch (field.type) {
            case "string":
                field.value = field.value || "";
                formFields.push(<TextField key={name} label={field.label} type="string" name={name} value={field.value} placeholder={field.placeholder} onChange={handleChange} />);
                break;
            case "datetime":
                field.value = field.value || "";
                formFields.push(<TextField key={name} label={field.label} type="datetime-local" name={name} value={field.value} placeholder={field.placeholder} onChange={handleChange} InputLabelProps={{ shrink: true }} />);
                break;
            case "checkbox":
                field.value = field.value || false;
                formFields.push(<FormControlLabel key={name} label={field.label} name={name} control={
                    <Checkbox checked={field.value === true ? true : false} onChange={handleChange} />
                } />);
                break;
        }
    }

    return <FormGroup style={{ minWidth: "320px" }}>
        {...formFields}
    </FormGroup >;
};

interface FilterProps {
    filterFields: Fields;
    onApply: (values: Values) => void;

    showFilter: boolean;
    setShowFilter: (_: boolean) => void;
}

export const Filter: React.FunctionComponent<FilterProps> = ({
    filterFields,
    onApply,
    showFilter,
    setShowFilter
}) => {

    const [doSubmit, setDoSubmit] = React.useState(false);
    const [doReset, setDoReset] = React.useState(false);

    const closeFilter = () => setShowFilter(false);

    return <Dialog onClose={closeFilter} aria-labelledby="simple-dialog-title" open={showFilter} >
        <DialogTitle id="form-dialog-title">{nlsHPCC.Filter}</DialogTitle>
        <DialogContent>
            <FormContent
                fields={filterFields}
                doSubmit={doSubmit}
                doReset={doReset}
                onSubmit={fields => {
                    setDoSubmit(false);
                    onApply(fields);
                }}
                onReset={fields => {
                    setDoReset(false);
                }}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => {
                setDoSubmit(true);
                closeFilter();
            }} >
                {nlsHPCC.Apply}
            </Button>
            <Button onClick={() => {
                setDoReset(true);
            }} >
                {nlsHPCC.Clear}
            </Button>
        </DialogActions>
    </Dialog>;
};
