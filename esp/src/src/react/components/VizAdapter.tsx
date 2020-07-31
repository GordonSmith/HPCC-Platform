import { Widget } from "@hpcc-js/common";
import * as React from "react";

export interface VizAdapterProps {
    widget: new () => Widget;
    widgetProps?: { [key: string]: any };
    width?: string;
    height?: string;
}

export const VizAdapter: React.FunctionComponent<VizAdapterProps> = ({
    widget,
    widgetProps = {},
    width = "100%",
    height = "240px"
}) => {
    const [widgetInstance, setWidgetInstance] = React.useState<Widget>(undefined);

    const myRef = React.useRef<HTMLDivElement>();

    React.useEffect(() => {
        const w = new widget()
            .target(myRef.current)
            ;
        setWidgetInstance(w);
        return () => {
            w.target(null);
        };
    }, []);

    if (widgetInstance) {
        if (widgetProps.columns) {
            widgetInstance.columns(widgetProps.columns);
        }
        if (widgetProps.data) {
            widgetInstance.data(widgetProps.data);
        }
        widgetInstance
            .deserialize({
                __class: undefined,
                ...widgetProps
            })
            .lazyRender()
            ;
    }

    return <div ref={myRef} style={{ width, height, display: "block", marginLeft: "auto", marginRight: "auto" }}></div>;
};

export interface VizInstanceAdapterProps {
    widget: Widget;
    width?: string;
    height?: string;
}

export const VizInstanceAdapter: React.FunctionComponent<VizInstanceAdapterProps> = ({
    widget,
    width = "100%",
    height = "240px"
}) => {
    const myRef = React.useRef<HTMLDivElement>();

    const [loaded, setLoaded] = React.useState<boolean>(false);

    React.useEffect(() => {
        widget
            .target(myRef.current)
            ;

        setLoaded(true);
    }, []);

    if (loaded) {
        widget
            .resize()
            .lazyRender()
            ;
    }

    return <div ref={myRef} style={{ width, height, display: "block", marginLeft: "auto", marginRight: "auto" }}></div>;
};
