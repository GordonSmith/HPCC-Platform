import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetLogicalFile(request: WsDali.GetLogicalFileRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetLogicalFile", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetLogicalFile.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetLogicalFileProps {

}

export const GetLogicalFile: React.FunctionComponent<GetLogicalFileProps> = ({

}) => {

    const [logicalFile, setLogicalFile] = React.useState<string>("");
    const [fileName, setFileName] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { mydaliService.GetLogicalFile({FileName: fileName}).then(( ResultResponse ) => {
        setLogicalFile(ResultResponse.Result);
    }).catch(err => logger.error(err)); }, [fileName]);

    return <div>
        <TableGroup fields={{
        "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName},
            }} onChange={(id, value) => {
            setFileName (value);
            }} />
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {logicalFile}
    </div>;

}; 