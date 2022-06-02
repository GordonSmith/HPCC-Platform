import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetDFSCSV(request: WsDali.GetDFSCSVRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetDFSCSV", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetDFSCSV.tsx");

const myDaliService = new MyDaliService({ baseUrl: "" });

interface GetDFSCSVProps {

}

export const GetDFSCSV: React.FunctionComponent<GetDFSCSVProps> = ({

}) => {

    const [dfsCsv, setDfsCsv] = React.useState<string>("");
    const [logicalNameMask, setLogicalNameMask] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { myDaliService.GetDFSCSV({LogicalNameMask: logicalNameMask}).then(( ResultResponse ) => {
        setDfsCsv(ResultResponse.Result);
        console.log(ResultResponse);
    }).catch(err => logger.error(err)); }, [logicalNameMask]);

    return <div>
        <TableGroup fields={{
        "LogicalNameMask": { label: nlsHPCC.LogicalNameMask, type: "string", value: logicalNameMask },
            }} onChange={(id, value) => {
            setLogicalNameMask (value);
            }} />
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {dfsCsv}
    </div>;

}; 