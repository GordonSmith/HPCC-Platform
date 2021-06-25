import { SVGZoomWidget } from "@hpcc-js/common";
import { Graph2 } from "@hpcc-js/util";

interface IScope {
    __parentID: string;
    __funcs: IScope[];
    id: string;
    name: string;
    type: string;
    // [key: string]: any;
}

interface IScopeEdge extends IScope {
    IdSource: string;
    IdTarget: string;
}

class GraphContainer extends Graph2<IScope, IScopeEdge, IScope> {
}

const vertexTpl = (v: IScope): string => `"${v.id}" [id="${v.id}" label="${v.id}"]`;

const edgeTpl = (e: IScopeEdge) => `"${e.IdSource}" -> "${e.IdTarget}" [id="${e.id}", label="${e.id}"]`;

const subgraphTpl = (g: GraphContainer, sg: IScope): string => {
    const childTpls: string[] = [];
    g.subgraphSubgraphs(sg.id).forEach(child => {
        childTpls.push(subgraphTpl(g, child));
    });
    g.subgraphVertices(sg.id).forEach(child => {
        childTpls.push(vertexTpl(child));
    });
    g.subgraphEdges(sg.id).forEach(child => {
        childTpls.push(edgeTpl(child));
    });
    return `subgraph cluster_${sg.id} {
id="${sg.id}";
label="${sg.id}";
// margin=16;
${childTpls.join("\n")}
}`;
};

export const graphTpl = (g: GraphContainer, root?: string) => {
    const childTpls: string[] = [];
    if (root) {
        g.subgraphSubgraphs(root).forEach(child => {
            childTpls.push(subgraphTpl(g, child));
        });
        g.subgraphVertices(root).forEach(child => {
            childTpls.push(vertexTpl(child));
        });
        g.subgraphEdges(root).forEach(child => {
            childTpls.push(edgeTpl(child));
        });
    } else {
        g.subgraphs().filter(sg => sg.__parentID === undefined).forEach(child => {
            childTpls.push(subgraphTpl(g, child));
        });
        g.vertices().filter(v => v.__parentID === undefined).forEach(child => {
            childTpls.push(vertexTpl(child));
        });
        g.edges().filter(e => e.__parentID === undefined).forEach(child => {
            childTpls.push(edgeTpl(child));
        });
    }
    return `\
digraph G {
    // graph [fontname=Verdana,fontsize=11.0];
    // graph [rankdir=TB];
    // node [shape=rect,fontname=Verdana,fontsize=11.0,fixedsize=true];
    // edge [fontname=Verdana,fontsize=11.0];
    
    ${childTpls.join("\n")}
    
}`;
};

export function createGraph(data: any[]): GraphContainer {
    const gc = new GraphContainer();
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
    enterXXX(domNode, element) {
        super.enter(domNode, element);
        this._renderElement.append("circle")
            .attr("cx", 50)
            .attr("cy", 50)
            .attr("r", 40)
            .attr("fill", "red")
            ;
    }

    protected _prevSvg;
    update(domNode, element) {
        super.update(domNode, element);
        if (this._prevSvg !== this._svg) {
            const startPos = this._svg.indexOf("<g id=");
            const endPos = this._svg.indexOf("</svg>");
            const xxx = this._svg.substring(startPos, endPos);
            console.log(xxx);
            this._renderElement.html(this._svg.substring(startPos, endPos));
            this._prevSvg = this._svg;
        }
    }
}
