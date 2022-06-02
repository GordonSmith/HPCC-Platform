import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetDFSMap(request: WsDali.GetDFSMapRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetDFSMap", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetDFSMap.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetDFSMapProps {

}

export const GetDFSMap: React.FunctionComponent<GetDFSMapProps> = ({

}) => {

    const [dfsMap, setDfsMap] = React.useState<string>("");
    const [fileName, setFileName] = React.useState<string>("");

    const onSubmit = React.useCallback(() => { mydaliService.GetDFSMap({FileName: fileName}).then(( ResultResponse ) => {
        setDfsMap(ResultResponse.Result);
    }).catch(err => logger.error(err)); }, [fileName]);

    return <div>
        <TableGroup fields={{
        "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName},
            }} onChange={(id, value) => {
            setFileName (value);
            }} />
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {dfsMap}
    </div>;

}; 