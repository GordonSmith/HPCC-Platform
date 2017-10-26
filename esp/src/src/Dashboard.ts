import { d3SelectionType, HTMLWidget } from "@hpcc-js/common";
import { Machine, TargetCluster, Topology } from "@hpcc-js/comms";
import { local as d3Local } from "d3-selection";
import { Guage } from "./viz/guage";
import { WorkunitList } from "./viz/workunitList";

import "css!hpcc-css/dashboard.css";

export class TargetClusterSummary extends HTMLWidget {

    private _targetCluster: TargetCluster;
    private _guage: Guage;
    private _activity: WorkunitList;

    constructor(targetCluster: TargetCluster) {
        super();
        this._targetCluster = targetCluster;
    }

    private _dataPromise: Promise<Machine[]>;
    clearData(): this {
        delete this._dataPromise;
        this.data([]);
        return this;
    }

    refreshData(force: boolean = false): Promise<Machine[]> {
        if (force) this.clearData();
        if (!this._dataPromise) {
            this._dataPromise = this._targetCluster.fetchMachines({
                GetStorageInfo: true,
                LocalFileSystemsOnly: true
            }).then((machine) => {
                return machine;
            });
        }
        return this._dataPromise;
    }

    enter(domNode: any, element: d3SelectionType) {
        super.enter(domNode, element);
        const context = this;
        element.append("div")
            .attr("class", "gauge")
            .each(async function (this: any) {
                context._guage = new Guage()
                    .target(this)
                    .title(context._targetCluster.Name)
                    .titleDescription("Target")
                    .valueDescription("Max. Usage")
                    .showTick(true)
                    .tickValueDescription("Avg. Usage")
                    ;
            })
            ;

        element.append("div")
            .each(async function () {
                context._activity = new WorkunitList()
                    .target(this as any)
                    ;
            })
            ;
    }

    update(domNode: HTMLElement, element: d3SelectionType) {
        super.update(domNode, element);
        const stats = this._targetCluster.machineStats();
        this._guage
            .value(stats.maxDisk)
            .tickValue(stats.meanDisk)
            .render()
            ;

        this._activity
            .workunits(this._targetCluster.CActiveWorkunit)
            .render()
            ;
    }

    render(): this {
        this.refreshData().then(() => {
            super.render.call(this);
        });
        if (!this._renderCount) {
            //  Extra render to display empty guage immediatly  ---
            return super.render.call(this);
        }
        return this;
    }
}
TargetClusterSummary.prototype._class += " eclwatch_TargetClusterSummary";

const localTargetClusterSummary = d3Local<TargetClusterSummary>();
export class Dashboard extends HTMLWidget {

    private _containerDiv: any;
    private _topology = new Topology({ baseUrl: location.origin });

    constructor() {
        super();
        this._tag = "div";
    }

    private _dataPromise: Promise<TargetCluster[]>;
    clearData(): this {
        delete this._dataPromise;
        this.data([]);
        return this;
    }

    refreshData(force: boolean = false): Promise<TargetCluster[]> {
        if (force) this.clearData();
        if (!this._dataPromise) {
            this._dataPromise = this._topology.refresh().then(response => {
                this.data(this._topology.CTargetClusters);
                return this._topology.CTargetClusters;
            });

            if (this._containerDiv) {
                this._containerDiv.selectAll(".hitem")
                    .each(function (this: HTMLElement, d: TargetCluster) {
                        localTargetClusterSummary.get(this)!.clearData();
                    })
                    ;
            }
        }
        return this._dataPromise;
    }

    enter(domNode: HTMLElement, element: d3SelectionType) {
        super.enter(domNode, element);
        this._containerDiv = element.append("div")
            .attr("class", "hcontainer")
            ;
    }

    update(domNode: HTMLElement, element: d3SelectionType) {
        super.update(domNode, element);
        element.style("height", null);
        const tcs = this._containerDiv.selectAll(".hitem").data(this.data(), (d: TargetCluster) => d.Name);
        tcs.enter().append("div")
            .attr("class", "hitem")
            .each(function (this: HTMLElement, d: TargetCluster) {
                localTargetClusterSummary.set(this, new TargetClusterSummary(d).target(this));
            })
            .merge(tcs)
            .each(function (this: HTMLElement, d: TargetCluster) {
                localTargetClusterSummary.get(this)!.render();
            })
            ;
        tcs.exit()
            .each(function (this: HTMLElement, d: TargetCluster) {
                localTargetClusterSummary.remove(this);
            })
            .remove()
            ;
    }

    render(callback?: (w: this) => void): this {
        this.refreshData().then(() => {
            super.render.call(this, callback);
        });
        return this;
    }

    safeResize() {
        if (this._renderCount) {
            this.resize()
                .lazyRender()
                ;
            this._placeholderElement
                .style("height", null)
                ;
            this.element().style("height", null);
        }
    }
}
Dashboard.prototype._class += " eclwatch_Dashboard";
