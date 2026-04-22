import { select as d3Select } from "@hpcc-js/common";
import { Graphviz } from "@hpcc-js/graph";
import { Graph2, scopedLogger } from "@hpcc-js/util";
import { format } from "src/Utility";
import { IScopeEx, MetricsView } from "../hooks/metrics";

const logger = scopedLogger("src-react/util/metricGraph.ts");

export { Graphviz };
export const layoutCache = Graphviz.layoutCache;
export const isGraphvizWorkerResponse = Graphviz.isGraphvizWorkerResponse;
export type LayoutStatus = Graphviz.LayoutStatus;
export const LayoutStatus = Graphviz.LayoutStatus;
export const isLayoutComplete = Graphviz.isLayoutComplete;

const TypeShape: Record<string, Graphviz.Shape> = {
    "function": "plain"
};

const KindShape: Record<number, Graphviz.Shape> = {
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

function shape(v: IScopeEx): Graphviz.Shape {
    return TypeShape[v.type] ?? KindShape[v.Kind] ?? "rectangle";
}

const CHARS = new Set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
export function encodeID(id: string): string {
    let retVal = "";
    for (let i = 0; i < id.length; ++i) {
        if (CHARS.has(id.charAt(i))) {
            retVal += id.charAt(i);
        } else {
            retVal += `__${id.charCodeAt(i)}__`;
        }
    }
    return retVal;
}

export function decodeID(id: string): string {
    return id.replace(/__(\d+)__/gm, (_match, p1) => String.fromCharCode(+p1));
}

interface IScopeEdge extends IScopeEx {
    IdSource: string;
    IdTarget: string;
}

type ScopeStatus = "unknown" | "running" | "complete";
type ExceptionStatus = "warning" | "error";

export class MetricGraph extends Graph2<IScopeEx, IScopeEdge, IScopeEx> {

    protected _index: { [name: string]: IScopeEx } = {};
    protected _activityIndex: { [id: string]: string } = {};

    constructor() {
        super();
        this.idFunc(scope => scope.name);
        this.sourceFunc(scope => this._activityIndex[scope.IdSource]);
        this.targetFunc(scope => this._activityIndex[scope.IdTarget]);
        this.load([]);
    }

    clear(): this {
        super.clear();
        this._index = {};
        this._activityIndex = {};
        return this;
    }

    protected parentName(scopeName: string): string {
        const lastIdx = scopeName.lastIndexOf(":");
        if (lastIdx >= 0) {
            return scopeName.substring(0, lastIdx);
        }
        return !scopeName ? undefined : "";
    }

    protected scopeID(scopeName: string): string {
        const lastIdx = scopeName.lastIndexOf(":");
        if (lastIdx >= 0) {
            return scopeName.substring(lastIdx + 1);
        }
        return scopeName;
    }

    childCount(scopeName: string) {
        return this.allVertices().filter(v => v.name.startsWith(scopeName)).length;
    }

    protected ensureLineage(_scope: IScopeEx): IScopeEx {
        let scope = this._index[_scope.name];
        if (!scope) {
            scope = _scope;
            scope.__children = scope.__children || [];
            scope.__parentName = scope.__parentName || this.parentName(scope.name);
            this._index[scope.name] = scope;
        }
        if (scope.__parentName !== undefined) {
            let parent = this._index[scope.__parentName];
            if (!parent) {
                parent = this.ensureLineage({
                    __formattedProps: {},
                    __groupedProps: {},
                    __StdDevs: 0,
                    __StdDevsSource: "",
                    id: this.scopeID(scope.__parentName),
                    name: scope.__parentName,
                    type: "unknown",
                    Kind: "-1",
                    Label: "unknown"
                });
            }
            parent.__children.push(scope);
        }
        return scope;
    }

    protected ensureGraphLineage(scope: IScopeEx) {
        let parent = this._index[scope.__parentName];
        if (parent === scope) {
            parent = undefined;
        }
        if (parent && !this.subgraphExists(parent.name)) {
            this.ensureGraphLineage(parent);
        }
        if (scope.__children?.length > 0 && !this.subgraphExists(scope.name)) {
            this.addSubgraph(scope, parent);
        }
    }

    lineage(scope: IScopeEx): IScopeEx[] {
        const retVal: IScopeEx[] = [];
        while (scope) {
            retVal.push(scope);
            scope = this._index[scope.__parentName];
        }
        return retVal.reverse();
    }

    load(data: IScopeEx[]): this {
        this.clear();

        data.forEach((scope: IScopeEx) => {
            this.ensureLineage(scope);
        });

        data.forEach((scope: IScopeEx) => {
            const parentScope = this._index[scope.__parentName];
            this.ensureGraphLineage(scope);
            switch (scope.type) {
                case "activity":
                    this._activityIndex[scope.id] = scope.name;
                    this.addVertex(scope, parentScope);
                    break;
                case "edge":
                    break;
                default:
                    if (!scope.__children.length) {
                        this._activityIndex[scope.id] = scope.name;
                        this.addVertex(scope, parentScope);
                    }
            }
        });

        data.forEach((scope: IScopeEx) => {
            if (scope.type === "edge" && scope.IdSource !== undefined && scope.IdTarget !== undefined) {
                if (!this.vertexExists(this._activityIndex[(scope as IScopeEdge).IdSource]))
                    logger.warning(`Missing vertex:  ${(scope as IScopeEdge).IdSource}`);
                else if (!this.vertexExists(this._activityIndex[(scope as IScopeEdge).IdTarget])) {
                    logger.warning(`Missing vertex:  ${(scope as IScopeEdge).IdTarget}`);
                } else {
                    if (scope.__parentName && !this.subgraphExists(scope.__parentName)) {
                        logger.warning(`Edge missing subgraph:  ${scope.__parentName}`);
                    }
                    if (this.subgraphExists(scope.__parentName)) {
                        this.addEdge(scope as IScopeEdge, this.subgraph(scope.__parentName));
                    } else {
                        this.addEdge(scope as IScopeEdge);
                    }
                }
            }
        });

        return this;
    }

    safeID(id: string) {
        return id.replace(/\s/, "_");
    }

    vertexLabel(v: IScopeEx, options: MetricsView): string {
        return v.type === "activity" ? format(options.activityTpl, v) :
            v.type === "function" ? v.id + "()" :
                v.type === "operation" && v.id.charAt(0) === ">" ? v.id.substring(1) :
                    v.Label || v.id;
    }

    vertexStatus(v: IScopeEx): ScopeStatus {
        const tally: { [id: string]: number } = { "unknown": 0, "running": 0, "complete": 0 };
        let outEdges = this.vertexInternalOutEdges(v);
        if (outEdges.length === 0) {
            outEdges = this.inEdges(v.name);
        }
        outEdges.forEach(e => ++tally[this.edgeStatus(e)]);
        if (outEdges.length === tally["complete"]) {
            return "complete";
        } else if (tally["running"] || tally["complete"]) {
            return "running";
        }
        return "unknown";
    }

    vertexClass(v: IScopeEx): string {
        const retVal: Array<ScopeStatus | ExceptionStatus> = [this.vertexStatus(v)];
        if (v.__exceptions) {
            const severity: { [id: string]: number } = {};
            v.__exceptions.forEach(ex => {
                if (!severity[ex.Severity]) {
                    severity[ex.Severity] = 0;
                }
                severity[ex.Severity]++;
            });
            if (severity["Error"]) {
                retVal.push("error");
            } else if (severity["Warning"]) {
                retVal.push("warning");
            }
        }
        return retVal.join(" ");
    }

    vertexInternalOutEdges(v: IScopeEx): IScopeEdge[] {
        return this.outEdges(v.name).filter(e => e.__parentName === v.__parentName);
    }

    findFirstVertex(scopeName: string) {
        if (this.vertexExists(scopeName)) {
            return this.vertex(scopeName).id;
        }
        for (const child of this.item(scopeName).__children) {
            const childID = this.findFirstVertex(child.name);
            if (childID) {
                return childID;
            }
        }
    }

    edgeStatus(e: IScopeEdge): ScopeStatus {
        const starts = Number(e.NumStarts ?? 0);
        const stops = Number(e.NumStops ?? 0);
        if (!isNaN(starts) && !isNaN(stops)) {
            if (starts > 0) {
                if (starts === stops) {
                    return "complete";
                }
                return "running";
            }
        }
        return "unknown";
    }

    subgraphStatus(sg: IScopeEx): ScopeStatus {
        const tally: { [id: string]: number } = { "unknown": 0, "running": 0, "complete": 0 };
        const finalVertices = this.subgraphVertices(sg.name).filter(v => this.vertexInternalOutEdges(v).length === 0);
        finalVertices.forEach(v => ++tally[this.vertexStatus(v)]);
        if (finalVertices.length && finalVertices.length === tally["complete"]) {
            return "complete";
        } else if (tally["running"] || tally["complete"]) {
            return "running";
        }
        return "unknown";
    }

    itemStatus(item: IScopeEx): ScopeStatus {
        if (this.isVertex(item)) {
            return this.vertexStatus(item);
        } else if (this.isEdge(item)) {
            return this.edgeStatus(item);
        } else if (this.isSubgraph(item)) {
            return this.subgraphStatus(item);
        }
        return "unknown";
    }

    private buildVertex(v: IScopeEx, options: MetricsView, dedup: Set<string>): Graphviz.Node | undefined {
        if (dedup.has(v.id)) return undefined;
        dedup.add(v.id);
        const node: Graphviz.Node = {
            id: encodeID(v.name),
            parentID: v.__parentName !== undefined ? encodeID(v.__parentName) : undefined,
            label: this.vertexLabel(v, options),
            shape: shape(v),
            class: this.vertexClass(v),
        };
        if (v.type === "function") {
            node.fillcolor = "";
            node.style = "";
        }
        return node;
    }

    private buildEdge(e: IScopeEdge, options: MetricsView, dedup: Set<string>): Graphviz.Edge | undefined {
        if (dedup.has(e.id)) return undefined;
        dedup.add(e.id);

        const sourceVertexName = this._activityIndex[e.IdSource];
        const targetVertexName = this._activityIndex[e.IdTarget];

        if (options.ignoreGlobalStoreOutEdges && sourceVertexName) {
            const sourceVertex = this.vertex(sourceVertexName);
            if (sourceVertex.Kind === "22") {
                return undefined;
            }
        }

        let edgeStyle: Graphviz.EdgeStyle | string = "solid";
        if (sourceVertexName && targetVertexName) {
            const sourceParent = this.vertexParent(sourceVertexName);
            const targetParent = this.vertexParent(targetVertexName);
            edgeStyle = sourceParent === targetParent ? "solid" : "dashed";
        }

        const formatData = e.__formattedProps ?
            Object.assign({}, e, e.__formattedProps) :
            e;

        const edge: Graphviz.Edge = {
            id: encodeID(e.name),
            sourceID: encodeID(sourceVertexName),
            targetID: encodeID(targetVertexName),
            label: format(options.edgeTpl, formatData),
            style: edgeStyle,
            class: this.edgeStatus(e),
        };

        if (this.subgraphExists(this._sourceFunc(e))) {
            edge.ltail = `cluster_${encodeID(sourceVertexName)}`;
        }
        if (this.subgraphExists(this._targetFunc(e))) {
            edge.lhead = `cluster_${encodeID(targetVertexName)}`;
        }

        return edge;
    }

    private buildSubgraph(sg: IScopeEx, options: MetricsView, dedup: { vertices: Set<string>, edges: Set<string>, subgraphs: Set<string> }): Graphviz.Cluster | undefined {
        if (dedup.subgraphs.has(sg.id)) return undefined;
        dedup.subgraphs.add(sg.id);

        const sgType = sg.type;
        const isChild = sgType === "child";

        return {
            id: encodeID(sg.name),
            parentID: sg.__parentName !== undefined && sg.__parentName !== "" ? encodeID(sg.__parentName) : undefined,
            label: isChild ? "" : format(sgType === "activity" ? options.activityTpl : options.subgraphTpl, sg),
            style: isChild ? "dashed" : "filled",
            class: this.subgraphStatus(sg),
        };
    }

    graphData(ids: string[] = [], options: MetricsView): Graphviz.Data {
        const dedup = { vertices: new Set<string>(), edges: new Set<string>(), subgraphs: new Set<string>() };
        const vertices: Graphviz.Node[] = [];
        const edges: Graphviz.Edge[] = [];
        const subgraphs: Graphviz.Cluster[] = [];

        const collectSubgraph = (sg: IScopeEx) => {
            const cluster = this.buildSubgraph(sg, options, dedup);
            if (!cluster) return;
            subgraphs.push(cluster);

            for (const child of this.subgraphSubgraphs(sg.name)) {
                collectSubgraph(child);
            }

            const sgId = this.id(sg);
            if (this.vertexExists(sgId)) {
                const v = this.buildVertex(this.vertex(sgId), options, dedup.vertices);
                if (v) {
                    v.parentID = encodeID(sg.name);
                    vertices.push(v);
                }
            }

            for (const child of this.subgraphVertices(sg.name)) {
                const v = this.buildVertex(child, options, dedup.vertices);
                if (v) vertices.push(v);
            }

            for (const child of this.subgraphEdges(sg.name)) {
                const e = this.buildEdge(child, options, dedup.edges);
                if (e) edges.push(e);
            }
        };

        if (ids?.length) {
            const idSet = new Set(ids);

            for (const id of ids) {
                let subgraph: IScopeEx | undefined;

                if (this.subgraphExists(id)) {
                    subgraph = this.subgraph(id);
                } else {
                    const item = this.item(id);
                    if (item?.__parentName && this.subgraphExists(item.__parentName)) {
                        subgraph = this.subgraph(item.__parentName);
                    }
                }

                if (subgraph) {
                    collectSubgraph(subgraph);
                }
            }

            const activityIndex = this._activityIndex;
            for (const edge of this.allEdges()) {
                const sourceVertexName = activityIndex[edge.IdSource];
                const targetVertexName = activityIndex[edge.IdTarget];

                if (sourceVertexName && targetVertexName) {
                    const sourceVertex = this.vertex(sourceVertexName);
                    const targetVertex = this.vertex(targetVertexName);
                    const sourceParentId = sourceVertex.__parentID;
                    const targetParentId = targetVertex.__parentID;

                    if (sourceParentId !== targetParentId &&
                        idSet.has(sourceParentId) &&
                        idSet.has(targetParentId)) {
                        const e = this.buildEdge(edge, options, dedup.edges);
                        if (e) edges.push(e);
                    }
                }
            }
        } else {
            for (const child of this.subgraphs()) {
                collectSubgraph(child);
            }
            for (const child of this.vertices()) {
                const v = this.buildVertex(child, options, dedup.vertices);
                if (v) vertices.push(v);
            }
            for (const child of this.edges()) {
                const e = this.buildEdge(child, options, dedup.edges);
                if (e) edges.push(e);
            }
        }

        return {
            graph: {
                type: "digraph",
                compound: true,
                ordering: "in",
                graphDefaults: { fontname: "arial", fillcolor: "white", style: "filled" },
                nodeDefaults: { fontname: "arial", color: "black", fillcolor: "whitesmoke", style: "filled", margin: 0.2 },
                edgeDefaults: {},
            },
            subgraphs,
            vertices,
            edges,
        };
    }
}

export class MetricGraphWidget extends Graphviz.Widget {

    constructor() {
        super();
        this.showToolbar(false);
    }

    enter(domNode, element) {
        super.enter(domNode, element);
    }

    render(callback?: (w: MetricGraphWidget) => void) {
        return super.render(async w => {
            this._renderElement?.selectAll(".node.warning,.node.error")
                .each(function (this: SVGGElement) {
                    const thisElement = d3Select(this);
                    if (thisElement.select("text.warning-icon").empty()) {
                        const pos = this.getBBox();
                        thisElement.append("text")
                            .classed("warning-icon", true)
                            .attr("x", pos.x + pos.width - 12)
                            .attr("y", pos.y + 12)
                            .attr("font-size", "24px")
                            .style("fill", "var(--colorStatusWarningForeground1)")
                            .style("stroke", "none")
                            .text("⚠")
                            ;
                    }
                })
                ;
            if (callback) {
                callback(this);
            }
        });
    }

    //  Events  ---
    selectionChanged() {
    }
}
