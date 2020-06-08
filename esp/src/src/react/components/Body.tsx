import * as React from "react";
import { DojoAdapter } from "./DojoAdapter";
import { Activities } from "./Activities";

export interface Body {
    widgetClassID: string,
    params?: { [key: string]: any }
}

export const Body: React.FunctionComponent<Body> = ({
    widgetClassID,
    params = {}
}) => {

    switch (widgetClassID) {
        case "ActivityWidget":
            return <Activities />
        default:
            return <DojoAdapter widgetClassID={widgetClassID} params={params} />
    }
}