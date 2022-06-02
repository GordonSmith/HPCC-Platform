import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetDFSParents(request: WsDali.GetDFSParentsRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetDFSParents", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetDFSParents.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetDFSParentsProps {

}

export const GetDFSParents: React.FunctionComponent<GetDFSParentsProps> = ({

}) => {

    const [dfsParents, setDfsParents] = React.useState<string>("");
    const [fileName, setFileName] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { mydaliService.GetDFSParents({FileName: fileName}).then(( ResultResponse ) => {
        setDfsParents(ResultResponse.Result);
    }).catch(err => logger.error(err)); }, [fileName]);

    return <div>
        <TableGroup fields={{
        "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName},
            }} onChange={(id, value) => {
            setFileName (value);
            }} />
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {dfsParents}
    </div>;

}; 