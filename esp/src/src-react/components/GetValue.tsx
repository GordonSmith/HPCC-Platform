import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetValue(request: WsDali.GetValueRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetValue", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetValue.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetValueProps {

}

export const GetValue: React.FunctionComponent<GetValueProps> = ({

}) => {

    const [value, setValue] = React.useState<string>("");
    const [path, setPath] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { return mydaliService.GetValue({ Path: path }).then(( ResultResponse ) => {
        setValue( ResultResponse.Result );
    }).catch(err => logger.error(err)); }, [path]);

    return <div>
        <TableGroup fields={{
        "Path": { label: nlsHPCC.Path, type: "string", value: value },
            }} onChange={(id, value) => {
            setPath (value);
            }} />
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {value}
    </div>;

}; 