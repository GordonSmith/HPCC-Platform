import { d3SelectionType, HTMLWidget, publish } from "@hpcc-js/common";
import { Workunit } from "@hpcc-js/comms";
import { event as d3Event, local as d3Local } from "d3-selection";
import "d3-transition";

function getStateImageName(wu: Workunit): string {
    if (wu.Archived) {
        return "workunit_archived.png";
    }
    switch (wu.StateID) {
        case 1:
            return "workunit_completed.png";
        case 2:
            return "workunit_running.png";
        case 3:
            return "workunit_completed.png";
        case 4:
            return "workunit_failed.png";
        case 5:
            return "workunit_warning.png";
        case 6:
            return "workunit_aborting.png";
        case 7:
            return "workunit_failed.png";
        case 8:
            return "workunit_warning.png";
        case 9:
            return "workunit_submitted.png";
        case 10:
            return "workunit_warning.png";
        case 11:
            return "workunit_running.png";
        case 12:
            return "workunit_warning.png";
        case 13:
            return "workunit_warning.png";
        case 14:
            return "workunit_warning.png";
        case 15:
            return "workunit_running.png";
        case 16:
            return "workunit_warning.png";
        case 999:
            return "workunit_deleted.png";
    }
    return "workunit.png";
};

declare const dojoConfig: any;
function getStateImagePath(wub: WorkunitBadge) {
    return `${dojoConfig.urlInfo.resourcePath}/img/${getStateImageName(wub.workunit())}`;
}

function getToolip(wub: WorkunitBadge) {
    return wub.workunit().State;
}

export class WorkunitBadge extends HTMLWidget {

    @publish("", "object", "Workunit")
    workunit: publish<this, Workunit>;

    _iconDiv: any;
    _wuidDiv: any;

    constructor() {
        super();
    }

    enter(domNode: HTMLElement, element: d3SelectionType) {
        super.enter(domNode, element);
        this._iconDiv = element.append("img");
        this._wuidDiv = element
            .append("a")
            .on("click", (e) => {
                event && event.preventDefault();
                this.click(this);
            })
            ;
    }

    update(domNode: HTMLElement, element: d3SelectionType) {
        super.update(domNode, element);
        this._iconDiv.attr("src", getStateImagePath);
        this._wuidDiv
            .attr("href", `/stub.htm?Wuid=${this.workunit().Wuid}&Widget=WUDetailsWidget`)
            .text(this.workunit().Wuid)
            ;
        element.attr("title", d => getToolip(d as this));
    }

    exit(domNode: HTMLElement, element: d3SelectionType) {
        super.exit(domNode, element);
    }

    //  Events  ---
    click(origin: this) {
    }
}
WorkunitBadge.prototype._class += " eclwatch_WorkunitBadge";

const localWUWidget = d3Local<WorkunitBadge>();
export class WorkunitList extends HTMLWidget {

    @publish([], "array")
    workunits: publish<this, Workunit[]>;

    constructor() {
        super();
    }

    enter(domNode: HTMLElement, element: d3SelectionType) {
        super.enter(domNode, element);
    }

    update(domNode: HTMLElement, element: d3SelectionType) {
        super.update(domNode, element);
        const context = this;
        const wus = element.selectAll(".wuContainer").data(this.workunits() as any[], (d: Workunit) => d.Wuid);
        wus.enter().append("div")
            .attr("class", "wuContainer")
            .each(function (this: any, d: any) {
                localWUWidget.set(this, new WorkunitBadge()
                    .target(this)
                    .workunit(d)
                    .on("click", wub=>context.click(wub))
                );
            })
            .merge(wus)
            .each(function (this: any, d: any) {
                localWUWidget.get(this)!.render();
            })
            ;
        wus.exit()
            .each(function (this: any, d: any) {
                localWUWidget.get(this)!.target(null);
                localWUWidget.remove(this);
            })
            .remove()
            ;
    }

    //  Events  ---
    click(origin: WorkunitBadge) {
    }
}
WorkunitList.prototype._class += " eclwatch_WorkunitList";
