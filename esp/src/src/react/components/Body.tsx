import * as React from "react";
import { DojoAdapter } from "./DojoAdapter";
import { Main } from "./Main";
import { WUQueryComponent } from "./WUQuery";

export interface Body {
    widgetClassID: string,
    params?: { [key: string]: any }
}

export const Body: React.FunctionComponent<Body> = ({
    widgetClassID,
    params = {}
}) => {

    switch (widgetClassID) {
        case "MainComponent":
            return <Main />;
        case "WUQueryComponent":
            return <WUQueryComponent />;
        default:
            return <DojoAdapter widgetClassID={widgetClassID} params={params} />;
    }
};