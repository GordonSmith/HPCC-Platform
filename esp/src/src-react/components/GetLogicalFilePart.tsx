import * as React from "react";
import { DaliService, WsDali } from "@hpcc-js/comms";
import { scopedLogger } from "@hpcc-js/util";
import { TableGroup } from "./forms/Groups";
import nlsHPCC from "src/nlsHPCC";
import { DefaultButton } from "@fluentui/react";

export class MyDaliService extends DaliService {
    GetLogicalFilePart(request: WsDali.GetLogicalFilePartRequest): Promise<WsDali.ResultResponse> {
        return this._connection.send("GetLogicalFilePart", request, "json", false, undefined, "ResultResponse");
    }
}

const logger = scopedLogger("src-react/components/GetLogicalFilePart.tsx");

const mydaliService = new MyDaliService({ baseUrl: "" });

interface GetLogicalFilePartProps {

}

export const GetLogicalFilePart: React.FunctionComponent<GetLogicalFilePartProps> = ({

}) => {

    const [logicalFilePart, setLogicalFilePart] = React.useState<string>("");
    const [fileName, setFileName] = React.useState<string>("");
    const [partNumber, setPartNumber] = React.useState<number>();

    const onSubmit = React.useCallback(() => { mydaliService.GetLogicalFilePart({FileName: fileName, PartNumber: partNumber}).then(( ResultResponse ) => {
        setLogicalFilePart(ResultResponse.Result);
    }).catch(err => logger.error(err)); }, [fileName]);

    return <div>
        <TableGroup fields={{
        "FileName": { label: nlsHPCC.FileName, type: "string", value: fileName },
        "PartNumber": { label: nlsHPCC.PartNumber, type: "number", value: partNumber },
            }} onChange={(id, value) => {
                switch (id) {
                    case "filename":
                        setFileName (value);
                        break;
                    case "partnumber":
                        setPartNumber(value);
                        break;
                    default:
                        logger.debug(`${id}:  ${value}`);
            }} 
            }/>
        <DefaultButton onClick= {onSubmit} text={nlsHPCC.Submit} />
        {logicalFilePart}
    </div>;

}; 