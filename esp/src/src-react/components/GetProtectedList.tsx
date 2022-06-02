import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetProtectedList(request: WsDali.GetProtectedListRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetProtectedList", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetProtectedList.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetProtectedListProps {

}

export const GetProtectedList: React.FunctionComponent<GetProtectedListProps> = ({

}) => {

    const [protectedList, setProtectedList] = React.useState<string>("");
    const [fileName, setFileName] = React.useState<string>("");
    const [callerId, setCallerId] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { mydaliService.GetProtectedList({FileName: fileName, CallerId: callerId}).then(( ResultResponse ) => {
        setProtectedList(ResultResponse.Result);
        setFileName(ResultResponse.Result);
        setCallerId(ResultResponse.Result);
    }).catch(err => logger.error(err)); }, [fileName]);

    return <div>
        <TableGroup fields={{
        "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName },
        "CallerID": { label: nlsHPCC.CallerID, type: "string", value: callerId },
        }} onChange={(id, value) => {
            switch (id) {
                case "filename":
                    setFileName (value);
                    break;
                case "callerid":
                    setCallerId(value);
                    break;
                default:
                    logger.debug(`${id}:  ${value}`);
    }} 
    }/>
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {protectedList}
    </div>;

}; 
