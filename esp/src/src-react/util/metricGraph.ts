import { SVGZoomWidget } from "@hpcc-js/common";
import { Graph2 } from "@hpcc-js/util";

const KindShape = {
    2: "cylinder",          //  Disk Write
    3: "tripleoctagon",     //  Local Sort
    5: "invtrapezium",      //  Filter
    6: "diamond",           //  Split
    7: "trapezium",         //  Project
    16: "cylinder",         //  Output
    17: "invtrapezium",     //  Funnel
    19: "doubleoctagon",    //  Skew Distribute
    22: "cylinder",         //
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
    __funcs: IScope[];
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

const decodeHTML = function (str?: string) {
    return str?.replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
};

const vertexTpl = (v: IScope): string => {
    return `"${v.id}" [id="${v.id}" label="[${decodeHTML(v.Kind)}]\n${decodeHTML(v.Label) || v.id}" shape="${shape(decodeHTML(v.Kind))}"]`;
};

const edgeTpl = (g: GraphContainer, e: IScopeEdge) => {
    if (g.vertex(e.IdSource).Kind === "22") {
        return "";
    }
    return `"${e.IdSource}" -> "${e.IdTarget}" [id="${e.id}" label="" style="${g.vertexParent(e.IdSource) === g.vertexParent(e.IdTarget) ? "solid" : "dashed"}"]`;
};

const subgraphTpl = (g: GraphContainer, sg: IScope): string => {
    const childTpls: string[] = [];
    g.subgraphSubgraphs(sg.id).forEach(child => {
        childTpls.push(subgraphTpl(g, child));
    });
    g.subgraphVertices(sg.id).forEach(child => {
        childTpls.push(vertexTpl(child));
    });
    g.subgraphEdges(sg.id).forEach(child => {
        childTpls.push(edgeTpl(g, child));
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

export const graphTpl = (g: GraphContainer, root?: string) => {
    const childTpls: string[] = [];
    if (root) {
        if (g.subgraphExists(root)) {
            childTpls.push(subgraphTpl(g, g.subgraph(root)));
        } else {
            const item = g.item(root);
            if (item?.__parentID) {
                childTpls.push(subgraphTpl(g, g.subgraph(item.__parentID)));
            } else {
                all();
            }
        }
    } else {
        all();
    }

    function all() {
        g.subgraphs().forEach(child => {
            childTpls.push(subgraphTpl(g, child));
        });
        g.vertices().forEach(child => {
            childTpls.push(vertexTpl(child));
        });
        g.edges().forEach(child => {
            childTpls.push(edgeTpl(g, child));
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
    const hierarchy: { [id: string]: IScope[] } = {};
    data.forEach((scope: IScope) => {
        const parents = scope.name.split(":");
        parents.pop();
        scope.__parentID = parents[parents.length - 1];
        scope.__funcs = [];
        if (scope.type !== "function") {
            hierarchy[scope.id] = [];
            if (scope.__parentID) {
                //  Child Subgraph
                if (hierarchy[scope.__parentID] === undefined) {
                    parents.pop();
                    parents.pop();
                    scope.__parentID = parents[parents.length - 1];
                }
                hierarchy[scope.__parentID].push(scope);
            }
        }
    });
    data.forEach((scope: IScope) => {
        switch (scope.type) {
            case "function":
                gc.item(scope.__parentID).__funcs.push(scope);
                break;
            case "activity":
                gc.addVertex(scope, scope.__parentID ? gc.subgraph(scope.__parentID) : undefined);
                break;
            case "edge":
                break;
            default:
                if (hierarchy[scope.id]?.length) {
                    if (scope.__parentID) {
                        gc.addSubgraph(scope, gc.subgraph(scope.__parentID));
                    } else {
                        gc.addSubgraph(scope);
                    }
                } else if (scope.__parentID) {
                    gc.addVertex(scope, gc.subgraph(scope.__parentID));
                } else {
                    gc.addVertex(scope);
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
                if (scope.__parentID) {
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

    constructor() {
        super();
        this._drawStartPos = "origin";
    }

    protected _svg = "";
    svg(_: string): this {
        this._svg = _;
        return this;
    }

    protected _prevSvg;
    update(domNode, element) {
        super.update(domNode, element);
        if (this._prevSvg !== this._svg) {
            // this.zoomTo([0, 0], 1, 0);
            const startPos = this._svg.indexOf("<g id=");
            const endPos = this._svg.indexOf("</svg>");
            this._renderElement.html(this._svg.substring(startPos, endPos));
            this._prevSvg = this._svg;
            const context = this;
            setTimeout(() => {
                this.zoomToFit(0);
                this._renderElement.selectAll(".node,.cluster")
                    .on("click", function () {
                        context.click({ id: this.id }, "id", true);
                    });
            }, 0);
        }
    }

    //  Events  ---
    click(row, col, sel) {
    }
}
