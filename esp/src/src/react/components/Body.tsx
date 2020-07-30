import * as React from "react";
import { DojoAdapter } from "./DojoAdapter";
import { Activities } from "./Activities";
import { WUQueryComponent } from "./WUQueryComponent";

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
        case "WUQueryComponent":
            return <WUQueryComponent />
        default:
            return <DojoAdapter widgetClassID={widgetClassID} params={params} />
    }
}