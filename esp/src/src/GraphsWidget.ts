import * as declare from "dojo/_base/declare";
import * as lang from "dojo/_base/lang";
import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";
import * as arrayUtil from "dojo/_base/array";

import * as Button from "dijit/form/Button";
import * as ContentPane from "dijit/layout/ContentPane";

// @ts-ignore
import * as selector from "dgrid/selector";

// @ts-ignore
import * as GridDetailsWidget from "hpcc/GridDetailsWidget";
import * as ESPWorkunit from "./ESPWorkunit";
import * as ESPQuery from "./ESPQuery";
import * as ESPLogicalFile from "./ESPLogicalFile";
// @ts-ignore
import * as DelayLoadWidget from "hpcc/DelayLoadWidget";
import * as ESPUtil from "./ESPUtil";
import * as Utility from "./Utility";

import * as hpccEclWatch from "@hpcc-js/eclwatch";

import declareDecorator from './declareDecorator';

type GridDetailsWidget = any;
export interface GraphsWidget extends GridDetailsWidget { }

@declareDecorator(GridDetailsWidget)
export class GraphsWidget {
    i18n = nlsHPCC;

    gridTitle = nlsHPCC.title_Graphs;
    idProperty = "Name";

    wu = null;
    query = null;
    timelinePane = null;

    postCreate(args) {
        this.inherited(arguments);

        this.timelinePane = new ContentPane({
            id: this.id + "TimelinePane",
            region: "top",
            splitter: true,
            style: "height: 120px",
            minSize: 120
        });
        this.timelinePane.placeAt(this.gridTab, "last");
        var context = this;
        var origResize = this.timelinePane.resize;
        this.timelinePane.resize = function () {
            origResize.apply(this, arguments);
            if (context.timeline) {
                context.timeline
                    .resize()
                    .lazyRender()
                    ;
            }
        }
    }

    init(params) {
        if (this.inherited(arguments))
            return;

        this.alphanumSort["Name"] = true;

        var context = this;
        if (params.Wuid) {
            this.wu = ESPWorkunit.Get(params.Wuid);
            var monitorCount = 4;
            this.wu.monitor(function () {
                if (context.wu.isComplete() || ++monitorCount % 5 === 0) {
                    context.refreshGrid();
                }
            });
        } else if (params.QuerySetId && params.Id) {
            this.query = ESPQuery.Get(params.QuerySetId, params.Id);
            this.refreshGrid();
        } else if (params.NodeGroup && params.LogicalName) {
            this.logicalFile = ESPLogicalFile.Get(params.NodeGroup, params.LogicalName);
            this.refreshGrid();
        }

        this.timeline = new hpccEclWatch.WUTimeline()
            .target(this.id + "TimelinePane")
            .overlapTolerence(1)
            .baseUrl("")
            .wuid(params.Wuid)
            .on("dblclick", function (row, col, sel) {
                if (row && row.__lparam && event && (event as any).ctrlKey) {
                    var scope = row.__lparam;
                    switch (scope.ScopeType) {
                        case "graph":
                            var tab = context.ensurePane({ Name: row.label });
                            context.selectChild(tab);
                            break;
                        default:
                            var descendents = scope.ScopeName.split(":");
                            for (var i = 0; i < descendents.length; ++i) {
                                var scopeName = descendents[i];
                                if (scopeName.indexOf("graph") === 0) {
                                    var tab = context.ensurePane({ Name: scopeName }, { SubGraphId: row.label });
                                    context.selectChild(tab);
                                    break;
                                }
                            }
                    }
                }
            }, true)
            .render()
            ;

        this._refreshActionState();
    }

    getStateImageName(row) {
        if (row.Complete) {
            return "workunit_completed.png";
        } else if (row.Running) {
            return "workunit_running.png";
        } else if (row.Failed) {
            return "workunit_failed.png";
        }
        return "workunit.png";
    }

    getStateImageHTML(row) {
        return Utility.getImageHTML(this.getStateImageName(row));
    }

    createGrid(domID) {
        var context = this;
        this.openLegacyMode = new Button({
            label: this.i18n.OpenLegacyMode,
            onClick: function (event) {
                context._onOpen(event, {
                    legacyMode: true
                });
            }
        }).placeAt(this.widget.Open.domNode, "after");
        var retVal = new declare([ESPUtil.Grid(false, true)])({
            store: this.store,
            columns: {
                col1: selector({
                    width: 27,
                    selectorType: 'checkbox'
                }),
                Name: {
                    label: this.i18n.Name, width: 99, sortable: true,
                    formatter: function (Name, row) {
                        return context.getStateImageHTML(row) + "&nbsp;<a href='#' class='dgrid-row-url'>" + Name + "</a>";
                    }
                },
                Label: { label: this.i18n.Label, sortable: true },
                WhenStarted: {
                    label: this.i18n.Started, width: 90,
                    formatter: function (whenStarted) {
                        if (whenStarted) {
                            var dateTime = new Date(whenStarted);
                            return dateTime.toLocaleTimeString();
                        }
                        return "";
                    }
                },
                WhenFinished: {
                    label: this.i18n.Finished, width: 90,
                    formatter: function (whenFinished, idx) {
                        if (whenFinished) {
                            var dateTime = new Date(whenFinished);
                            return dateTime.toLocaleTimeString();
                        }
                        return "";
                    }
                },
                Time: {
                    label: this.i18n.Duration, width: 90, sortable: true,
                    formatter: function (totalSeconds, idx) {
                        var hours = Math.floor(totalSeconds / 3600);
                        totalSeconds %= 3600;
                        var minutes = Math.floor(totalSeconds / 60);
                        var seconds = (totalSeconds % 60).toFixed(2);
                        return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (+seconds < 10 ? "0" : "") + seconds;
                    }
                },
                Type: { label: this.i18n.Type, width: 72, sortable: true }
            }
        }, domID);

        retVal.on(".dgrid-row:click", function (evt) {
            context.syncSelectionFrom(context.grid);
        });

        retVal.on(".dgrid-row-url:click", function (evt) {
            if (context._onRowDblClick) {
                var row = retVal.row(evt).data;
                context._onRowDblClick(row);
            }
        });
        return retVal;
    }

    getDetailID(row, params) {
        var retVal = "Detail" + row[this.idProperty];
        if (params && params.SubGraphId) {
            retVal += params.SubGraphId;
        }
        if (params && params.legacyMode) {
            retVal += "Legacy";
        }
        return retVal;
    }

    createDetail(id, row, params) {
        var localParams = {}
        if (this.wu) {
            localParams = {
                Wuid: this.wu.Wuid,
                GraphName: row.Name,
                SubGraphId: (params && params.SubGraphId) ? params.SubGraphId : null,
                SafeMode: (params && params.safeMode) ? true : false
            }
        } else if (this.query) {
            localParams = {
                Target: this.query.QuerySet,
                QueryId: this.query.QueryId,
                GraphName: row.Name,
                SubGraphId: (params && params.SubGraphId) ? params.SubGraphId : null,
                SafeMode: (params && params.safeMode) ? true : false
            }
        } else if (this.logicalFile) {
            localParams = {
                Wuid: this.logicalFile.Wuid,
                GraphName: row.Name,
                SubGraphId: (params && params.SubGraphId) ? params.SubGraphId : null,
                SafeMode: (params && params.safeMode) ? true : false
            }
        }
        var title = row.Name;
        var delayWidget = "Graph7Widget";
        let delayProps: object = {
            forceJS: true
        };
        if (params && params.SubGraphId) {
            title = params.SubGraphId + " - " + title;
        }
        if (params && params.legacyMode) {
            delayWidget = "GraphTreeWidget";
            title += " (L)";
            delayProps = {};
        }
        return new DelayLoadWidget({
            id: id,
            title: title,
            closable: true,
            delayWidget: delayWidget,
            delayProps: delayProps,
            hpcc: {
                type: "graph",
                params: localParams
            }
        });
    };

    refreshGrid(args?) {
        if (this.wu) {
            var context = this;
            this.wu.getInfo({
                onGetTimers: function (timers) {
                    //  Required to calculate Graphs Total Time  ---
                },
                onGetGraphs: function (graphs) {
                    context.store.setData(graphs);
                    context.grid.refresh();
                }
            });
        } else if (this.query) {
            var context = this;
            this.query.refresh().then(function (response) {
                var graphs = [];
                if (lang.exists("WUGraphs.ECLGraph", context.query)) {
                    arrayUtil.forEach(context.query.WUGraphs.ECLGraph, function (item, idx) {
                        var graph = {
                            Name: item.Name,
                            Label: "",
                            Completed: "",
                            Time: 0,
                            Type: item.Type
                        };
                        graphs.push(graph);
                    });
                } else if (lang.exists("WUGraphs.ECLGraph", context.query)) {
                    arrayUtil.forEach(context.query.WUGraphs.ECLGraph, function (item, idx) {
                        var graph = {
                            Name: item.Name || "",
                            Label: item.Label || "",
                            Completed: item.Completed || "",
                            Time: item.Time || 0,
                            Type: item.Type || ""
                        };
                        graphs.push(graph);
                    });
                }
                context.store.setData(graphs);
                context.grid.refresh();
            });
        } else if (this.logicalFile) {
            var graphs = [];
            if (lang.exists("Graphs.ECLGraph", this.logicalFile)) {
                arrayUtil.forEach(this.logicalFile.Graphs.ECLGraph, function (item, idx) {
                    var graph = {
                        Name: item,
                        Label: "",
                        Completed: "",
                        Time: 0,
                        Type: ""
                    };
                    graphs.push(graph);
                });
            }
            this.store.setData(graphs);
            this.grid.refresh();
        }
    }

    refreshActionState(selection) {
        this.inherited(arguments);

        this.openLegacyMode.set("disabled", !selection.length);
    }

    syncSelectionFrom(sourceControl) {
        var graphItems = [];
        var timingItems = [];

        //  Get Selected Items  ---
        if (sourceControl === this.grid) {
            arrayUtil.forEach(sourceControl.getSelected(), function (item, idx) {
                timingItems.push(item);
            });
        }

        //  Set Selected Items  ---
        if (sourceControl !== this.grid) {
            this.grid.setSelected(graphItems);
        }
    }
}
