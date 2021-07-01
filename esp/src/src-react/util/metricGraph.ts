import { d3Event, select as d3Select, SVGZoomWidget } from "@hpcc-js/common";
import { graphviz } from "@hpcc-js/graph";
import { Graph2 } from "@hpcc-js/util";
import { decodeHTML } from "src/Utility";
import { MetricsOptions } from "../hooks/metrics";

declare const dojoConfig;

const KindShape = {
    2: "cylinder",          //  Disk Write
    3: "tripleoctagon",     //  Local Sort
    5: "invtrapezium",      //  Filter
    6: "diamond",           //  Split
    7: "trapezium",         //  Project
    16: "cylinder",         //  Output
    17: "invtrapezium",     //  Funnel
    19: "doubleoctagon",    //  Skew Distribute
    22: "cylinder",         //  Store Internal
    28: "diamond",          //  If
    71: "cylinder",         //  Disk Read
    73: "cylinder",         //  Disk Aggregate Spill
    74: "cylinder",         //  Disk Exists
    94: "cylinder",         //  Local Result
    125: "circle",          //  Count
    133: "cylinder",        //  Inline Dataset
    146: "doubleoctagon",   //  Distribute Merge
    148: "cylinder",        //  Inline Dataset
    155: "invhouse",        //  Join
    161: "invhouse",        //  Smart Join
    185: "invhouse",        //  Smart Denormalize Group
    195: "cylinder",        //  Spill Read
    196: "cylinder",        //  Spill Write
};

function shape(kind: string) {
    return KindShape[kind] || "rectangle";
}

interface IScope {
    __parentID: string;
    __children: IScope[];
    __functions: IScope[];
    id: string;
    name: string;
    type: string;
    [key: string]: any;
}

interface IScopeEdge extends IScope {
    IdSource: string;
    IdTarget: string;
}

class GraphContainer extends Graph2<IScope, IScopeEdge, IScope> {
}

const vertexTpl = (v: IScope, options: MetricsOptions): string => {
    return `"${v.id}" [id="${v.id}" label="[${decodeHTML(v.Kind)}]\n${decodeHTML(v.Label) || v.id}" shape="${shape(v.Kind)}"]`;
};

const edgeTpl = (g: GraphContainer, e: IScopeEdge, options: MetricsOptions) => {
    if (options.ignoreGlobalStoreOutEdges && g.vertex(e.IdSource).Kind === "22") {
        return "";
    }
    return `"${e.IdSource}" -> "${e.IdTarget}" [id="${e.id}" label="" style="${g.vertexParent(e.IdSource) === g.vertexParent(e.IdTarget) ? "solid" : "dashed"}"]`;
};

const subgraphTpl = (g: GraphContainer, sg: IScope, options: MetricsOptions): string => {
    const childTpls: string[] = [];
    g.subgraphSubgraphs(sg.id).forEach(child => {
        childTpls.push(subgraphTpl(g, child, options));
    });
    g.subgraphVertices(sg.id).forEach(child => {
        childTpls.push(vertexTpl(child, options));
    });
    g.subgraphEdges(sg.id).forEach(child => {
        childTpls.push(edgeTpl(g, child, options));
    });
    return `subgraph cluster_${sg.id} {
color="darkgrey";
fillcolor="white";
style="filled";
id="${sg.id}";
label="${sg.id}";
// margin=16;
${childTpls.join("\n")}
}`;
};

export const graphTpl = (g: GraphContainer, root: string = "", options: MetricsOptions) => {
    const childTpls: string[] = [];
    if (root) {
        if (g.subgraphExists(root)) {
            childTpls.push(subgraphTpl(g, g.subgraph(root), options));
        } else {
            const item = g.item(root);
            if (item?.__parentID && g.subgraphExists(item?.__parentID)) {
                childTpls.push(subgraphTpl(g, g.subgraph(item.__parentID), options));
            } else {
                all();
            }
        }
    } else {
        all();
    }

    function all() {
        g.subgraphs().forEach(child => {
            childTpls.push(subgraphTpl(g, child, options));
        });
        g.vertices().forEach(child => {
            childTpls.push(vertexTpl(child, options));
        });
        g.edges().forEach(child => {
            childTpls.push(edgeTpl(g, child, options));
        });
    }
    return `\
digraph G {
    graph [fontname="arial"];// fontsize=11.0];
    // graph [rankdir=TB];
    // node [shape=rect fontname=arial fontsize=11.0 fixedsize=true];
    node [color="darkgrey" fontname="arial" fillcolor="whitesmoke" style="filled" margin=0.2]
    edge [color="darkgrey"]
    // edge [fontname=arial fontsize=11.0];
    
    ${childTpls.join("\n")}
    
}`;
};

export function createGraph(data: any[], gc = new GraphContainer()): GraphContainer {
    gc.clear();
    gc.idFunc(scope => scope.id);
    gc.sourceFunc(scope => scope.IdSource);
    gc.targetFunc(scope => scope.IdTarget);

    const index: { [id: string]: IScope } = {};
    data.forEach((scope: IScope) => {
        index[scope.id] = scope;
        const parents = scope.name.split(":");
        parents.pop();
        let parentID = parents.pop();
        while (parentID && (parentID[0] === "a" || parentID[0] === "c")) {
            parentID = parents.pop();
        }
        scope.__parentID = parentID;
        scope.__children = [];
        scope.__functions = [];
        const parent = index[parentID];
        if (parent) {
            parent.__children.push(scope);
        }
    });

    data.forEach((scope: IScope) => {
        const parentScope = index[scope.__parentID];
        if (scope.__parentID && !gc.subgraphExists(scope.__parentID)) {
            console.warn(`Vertex missing subgraph:  ${scope.__parentID}`);
            //  Elevate to next viable parent ---
            const parents = scope.name.split(":");
            parents.pop();
            const name = parents.join(":");
            parents.pop();
            let parentID = parents.pop();
            while (parentID && (parentID[0] === "a" || parentID[0] === "c")) {
                parentID = parents.pop();
            }
            const gparentScope = index[parentID];
            gc.addSubgraph({
                id: scope.__parentID,
                type: "missing",
                name: name,
                __children: [],
                __parentID: parentID,
                __functions: []
            }, gparentScope);
        }
        switch (scope.type) {
            case "function":
                parentScope.__functions.push(scope);
                break;
            case "activity":
                gc.addVertex(scope, parentScope);
                break;
            case "edge":
                break;
            default:
                if (scope.__children.length) {
                    gc.addSubgraph(scope, parentScope);
                } else {
                    gc.addVertex(scope, parentScope);
                }
        }
    });
    data.forEach((scope: IScope) => {
        if (scope.type === "edge") {
            if (!gc.vertexExists((scope as IScopeEdge).IdSource))
                console.warn(`Missing vertex:  ${(scope as IScopeEdge).IdSource}`);
            else if (!gc.vertexExists((scope as IScopeEdge).IdTarget)) {
                console.warn(`Missing vertex:  ${(scope as IScopeEdge).IdTarget}`);
            } else {
                if (scope.__parentID && !gc.subgraphExists(scope.__parentID)) {
                    console.warn(`Edge missing subgraph:  ${scope.__parentID}`);
                }
                if (gc.subgraphExists(scope.__parentID)) {
                    gc.addEdge(scope as IScopeEdge, gc.subgraph(scope.__parentID));
                } else {
                    gc.addEdge(scope as IScopeEdge);
                }
            }
        }
    });
    return gc;
}

export class MetricGraph extends SVGZoomWidget {

    protected _selection: { [id: string]: boolean } = {};

    constructor() {
        super();
        this._drawStartPos = "origin";
    }

    clearSelection(broadcast: boolean = false) {
        Object.keys(this._selection).forEach(id => {
            d3Select(`#${id}`).classed("selected", false);
        });
        this._selection = {};
        this._selectionChanged(broadcast);
    }

    toggleSelection(id: string, broadcast: boolean = false) {
        if (this._selection[id]) {
            delete this._selection[id];
        } else {
            this._selection[id] = true;
        }
        this._selectionChanged(broadcast);
    }

    selection(): string[];
    selection(_: string[]): this;
    selection(_: string[], broadcast: boolean): this;
    selection(_?: string[], broadcast: boolean = false): string[] | this {
        if (!arguments.length) return Object.keys(this._selection);
        this.clearSelection();
        _.forEach(id => this._selection[id] = true);
        this._selectionChanged(broadcast);
        return this;
    }

    protected _dot = "";
    dot(_: string): this {
        this._dot = _;
        return this;
    }

    protected _prevDot;
    _prevGV;
    update(domNode, element) {
        super.update(domNode, element);
    }

    _selectionChanged(broadcast = false) {
        const context = this;
        this._renderElement.selectAll(".node,.edge,.cluster")
            .each(function () {
                d3Select(this).selectAll("path,polygon")
                    .style("stroke", () => {
                        return context._selection[this.id] ? "red" : "darkgrey";
                    })
                    ;
            })
            ;
        if (broadcast) {
            this.selectionChanged();
        }
    }

    render(callback) {
        return super.render(w => {
            if (this._prevDot !== this._dot) {
                this._prevDot = this._dot;
                this?._prevGV?.terminate();
                const dot = this._dot;
                this._prevGV = graphviz(dot, "dot", dojoConfig.urlInfo.fullPath + "/dist");
                this._prevGV.response.then(svg => {
                    //  Check for race condition  ---
                    if (dot === this._prevDot) {
                        const startPos = svg.indexOf("<g id=");
                        const endPos = svg.indexOf("</svg>");
                        this._renderElement.html(svg.substring(startPos, endPos));
                        const context = this;
                        setTimeout(() => {
                            this.zoomToFit(0);
                            this._renderElement.selectAll(".node,.edge,.cluster")
                                .on("click", function () {
                                    const event = d3Event();
                                    if (!event.ctrlKey) {
                                        context.clearSelection();
                                    }
                                    context.toggleSelection(this.id, true);
                                });
                            if (callback) {
                                callback(this);
                            }
                        }, 0);
                    }
                }).catch(e => {
                });
            }
        });
    }

    //  Events  ---
    selectionChanged() {
    }
}
