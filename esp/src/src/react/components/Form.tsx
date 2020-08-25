import * as React from "react";
import { FormGroup, TextField, FormControlLabel, Checkbox } from "@material-ui/core";

type FieldType = "string" | "datetime" | "checkbox";

interface BaseField {
    type: FieldType;
    label: string;
    placeholder?: string;
    value?: boolean | number | string;
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

export const fieldsToRequest = (fields: Fields) => {
    const retVal: { [key: string]: string | boolean } = {};
    for (const name in fields) {
        if (fields[name].value) {
            retVal[name] = fields[name].value;
        }
    }
    return retVal;
};

export const resetFields = (_fields: Fields) => {
    const fields = { ..._fields };
    for (const name in fields) {
        delete fields[name].value;
    }
    return fields;
};

export interface FormContentProps {
    fields: Fields;
    reset: boolean;
    onFieldChanged: (name: string, value: any) => void;
}

export const FormContent: React.FunctionComponent<FormContentProps> = ({
    fields,
    reset = false,
    onFieldChanged
}) => {

    const [localFields, setLocalFields] = React.useState({ ...fields });

    if (reset) {
        setLocalFields(resetFields(localFields));
    }

    const handleChange = ev => {
        const field = localFields[ev.target.name];
        switch (field.type) {
            case "checkbox":
                localFields[ev.target.name].value = ev.target.checked;
                setLocalFields({ ...localFields });
                onFieldChanged(ev.target.name, ev.target.checked);
                break;
            default:
                localFields[ev.target.name].value = ev.target.value;
                setLocalFields({ ...localFields });
                onFieldChanged(ev.target.name, ev.target.value);
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