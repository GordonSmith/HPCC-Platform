import * as registry from "dijit/registry";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { resolve } from "../../Utility";
import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";

export interface DojoProps {
    widgetClassID: string;
    params?: object;
    onWidgetMount?: (widget) => void;
}

export interface DojoState {
    uid: number;
    widgetClassID: string;
    widget: any;
}

let g_id = 0;
export class DojoComponent extends React.Component<DojoProps, DojoState> {

    constructor(props: DojoProps) {
        super(props);
        this.state = {
            uid: ++g_id,
            widgetClassID: "",
            widget: null
        };
    }

    dojoLoad(widgetClassID: string) {
        this.setState({ widgetClassID });

        const domNode: HTMLElement = ReactDOM.findDOMNode(this);
        domNode.innerText = "";

        const elem = document.createElement("div");
        domNode.appendChild(elem);

        resolve(widgetClassID, WidgetClass => {
            const uid = ++g_id; // Incrementing the ID should not really be needed  ---

            const widget = new WidgetClass({
                id: `dojo-component-widget-${uid}`,
                style: {
                    margin: "0px",
                    padding: "0px",
                    width: "100%",
                    height: "100%"
                }
            });
            widget.placeAt(elem, "replace");
            widget.startup();
            widget.resize();
            if (widget.init) {
                widget.init(this.props.params || {});
            }

            this.setState({ uid, widget });
            if (this.props.onWidgetMount) {
                this.props.onWidgetMount(widget);
            }
        });
    }

    dojoUnload(nextWidgetClassID: string) {
        if (this.state.widget) {
            this.state.widget.destroyRecursive(true);

            //  Should not be needed  ---
            registry.toArray().filter(w => w.id.indexOf(`dojo-component-widget-${this.state.uid}`) === 0).forEach(w => {
                w.destroyRecursive(true);
            });
            //  ---

            const domNode: HTMLElement = ReactDOM.findDOMNode(this);
            domNode.innerHTML = `...loading ${nextWidgetClassID}...`;
            this.setState({ widget: null });
        }
    }

    shouldComponentUpdate(nextProps: Readonly<DojoProps>, nextState: Readonly<DojoState>): boolean {
        if (this.props.widgetClassID !== nextProps.widgetClassID) {
            this.dojoUnload(nextProps.widgetClassID);
            this.dojoLoad(nextProps.widgetClassID);
        }
        return false;
    }

    componentDidMount() {
        this.dojoLoad(this.props.widgetClassID);
    }

    componentWillUnmount() {
        this.dojoUnload(this.props.widgetClassID);
    }

    render() {
        return <div style={{ width: "100%", height: "100%" }}>{nlsHPCC.Loading} {this.props.widgetClassID}...</div>;
    }

}
