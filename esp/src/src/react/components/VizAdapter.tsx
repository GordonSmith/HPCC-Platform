import { Widget } from "@hpcc-js/common";
import * as React from "react";

export interface VisualizationProps {
    widget: new () => Widget;
    widgetProps?: { [key: string]: any };
    width?: string;
    height?: string;
}

export const VisualizationComponent: React.FunctionComponent<VisualizationProps> = ({
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
