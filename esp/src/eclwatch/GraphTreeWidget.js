/*##############################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
############################################################################## */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",
    "dojo/_base/array",
    "dojo/_base/Deferred",
    "dojo/dom",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/registry",
    "dijit/Dialog",
    "dijit/Tooltip",

    "dojox/html/entities",

    "dgrid/Grid",
    "dgrid/OnDemandGrid",
    "dgrid/Keyboard",
    "dgrid/Selection",
    "dgrid/selector",
    "dgrid/tree",
    "dgrid/extensions/ColumnResizer",
    "dgrid/extensions/ColumnHider",
    "dgrid/extensions/DijitRegistry",
    "dgrid/extensions/Pagination",

    "hpcc/_Widget",
    "hpcc/GraphWidget",
    "hpcc/ESPUtil",
    "hpcc/ESPWorkunit",
    "hpcc/TimingGridWidget",
    "hpcc/TimingTreeMapWidget",
    "hpcc/WsWorkunits",

    "dojo/text!../templates/GraphTreeWidget.html",

    "dijit/PopupMenuItem",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",
    "dijit/Dialog",
    "dijit/form/TextBox",
    "dijit/form/SimpleTextarea",
    "dijit/form/NumberSpinner",
    "dijit/form/DropDownButton"
], function (declare, lang, i18n, nlsHPCC, arrayUtil, Deferred, dom, domConstruct, on, html,
            BorderContainer, TabContainer, ContentPane, registry, Dialog, Tooltip,
            entities,
            Grid, OnDemandGrid, Keyboard, Selection, selector, tree, ColumnResizer, ColumnHider, DijitRegistry, Pagination,
            _Widget, GraphWidget, ESPUtil, ESPWorkunit, TimingGridWidget, TimingTreeMapWidget, WsWorkunits,
            template) {

    return declare("GraphTreeWidget", [_Widget], {
        templateString: template,
        baseClass: "GraphTreeWidget",
        i18n: nlsHPCC,

        borderContainer: null,
        rightBorderContainer: null,
        graphName: "",
        wu: null,
        editorControl: null,
        global: null,
        main: null,
        timingGrid: null,
        timingTreeMap: null,
        subgraphsGrid: null,
        verticesGrid: null,
        edgesGrid: null,
        xgmmlDialog: null,
        infoDialog: null,
        findField: null,
        findText: "",
        found: [],
        foundIndex: 0,

        buildRendering: function (args) {
            this.inherited(arguments);
        },

        postCreate: function (args) {
            this.inherited(arguments);
            this.borderContainer = registry.byId(this.id + "BorderContainer");
            this.rightBorderContainer = registry.byId(this.id + "RightBorderContainer");
            this.timingsGrid = registry.byId(this.id + "TimingsGrid");
            this.properties = registry.byId(this.id + "Properties");
            this.findField = registry.byId(this.id + "FindField");
            this._initGraphControls();
            this._initTimings();
            this._initDialogs();
        },

        startup: function (args) {
            this.inherited(arguments);

            this._initTree();
            this._initSubgraphs();
            this._initVertices();
            this._initEdges();

            var splitter = this.borderContainer.getSplitter("left");
            this.main.watchSplitter(splitter);

            splitter = this.rightBorderContainer.getSplitter("bottom");
            this.main.watchSplitter(splitter);

            this.main.watchSelect(registry.byId(this.id + "AdvancedMenu"));

            this.refreshActionState();
        },

        resize: function (args) {
            this.inherited(arguments);
            this.borderContainer.resize();
        },

        layout: function (args) {
            this.inherited(arguments);
        },

        destroy: function (args) {
            this.xgmmlDialog.destroyRecursive();
            this.infoDialog.destroyRecursive();
            this.inherited(arguments);
        },

        //  Implementation  ---
        _initGraphControls: function () {
            var context = this;
            this.global = registry.byId(this.id + "GlobalGraphWidget");

            this.main = registry.byId(this.id + "MainGraphWidget");
            this.main.onSelectionChanged = function (items) {
                context.syncSelectionFrom(context.main);
            };
            this.main.onDoubleClick = function (globalID) {
                context.main._onSyncSelection();
                context.syncSelectionFrom(context.main);
            };
        },

        _initTimings: function () {
            this.timingGrid = registry.byId(this.id + "TimingsGrid");

            var context = this;
            this.timingGrid.onClick = function (items) {
                context.syncSelectionFrom(context.timingGrid);
            };

            this.timingGrid.onDblClick = function (item) {
                var subgraphID = item.SubGraphId;
                var mainItem = context.main.getItem(subgraphID);
                context.main.centerOnItem(mainItem, true);
            };

            this.timingTreeMap = registry.byId(this.id + "TimingsTreeMap");
            this.timingTreeMap.onClick = function (value) {
                context.syncSelectionFrom(context.timingTreeMap);
            }
            this.timingTreeMap.onDblClick = function (value) {
                var mainItem = context.main.getItem(value.SubGraphId);
                context.main.centerOnItem(mainItem, true);
            }
        },

        _initDialogs: function () {
            var context = this;

            this.infoDialog = registry.byId(this.id + "InfoDialog");
            on(dom.byId(this.id + "InfoDialogCancel"), "click", function (event) {
                context.infoDialog.hide();
            });

            this.xgmmlDialog = registry.byId(this.id + "XGMMLDialog");
            this.xgmmlTextArea = registry.byId(this.id + "XGMMLTextArea");
            on(dom.byId(this.id + "XGMMLDialogApply"), "click", function (event) {
                context.xgmmlDialog.hide();
                if (context.xgmmlDialog.get("hpccMode") === "XGMML") {
                    var xgmml = context.xgmmlTextArea.get("value");
                    context.loadGraphFromXGMML(xgmml);
                } else if (context.xgmmlDialog.get("hpccMode") === "DOT") {
                    var dot = context.xgmmlTextArea.get("value");
                    context.loadGraphFromDOT(dot);
                } else if (context.xgmmlDialog.get("hpccMode") === "DOTATTRS") {
                    var dotAttrs = context.xgmmlTextArea.get("value");
                    context.global.setDotMetaAttributes(dotAttrs);
                    context.main.setDotMetaAttributes(dotAttrs);
                    context._onMainSync();
                }
            });
            on(dom.byId(this.id + "XGMMLDialogCancel"), "click", function (event) {
                context.xgmmlDialog.hide();
            });
        },

        _initItemGrid: function (grid) {
            var context = this;
            grid.on("dgrid-select", function (event) {
                context.syncSelectionFrom(grid);
            });
            grid.on("dgrid-deselect", function (event) {
                context.syncSelectionFrom(grid);
            });
            grid.on(".dgrid-row:dblclick", function (evt) {
                var item = grid.row(evt).data;
                if (item._globalID) {
                    var mainItem = context.main.getItem(item._globalID);
                    context.main.centerOnItem(mainItem, true);
                }
            });
        },

        _initTree: function () {
            this.treeStore = this.global.createTreeStore();
            this.treeGrid = new declare([Grid, Pagination, Keyboard, Selection, ColumnResizer, ColumnHider, DijitRegistry, ESPUtil.GridHelper])({
                store: this.treeStore
            }, this.id + "TreeGrid");
            this.treeTooltip = new Tooltip({
                connectId: [this.treeGrid.id],
                selector: "td",
                getContent: function (node) {
                    return node.innerHTML;
                }
            });
            /*
            var context = this;
            this.treeGrid.on(".dgrid-cell:mouseover", function (evt) {
                var cell = context.treeGrid.cell(evt);
                context.treeTooltip.set("label", cell.element.innerHTML);
            })
            */
            this._initItemGrid(this.treeGrid);
        },

        _initSubgraphs: function () {
            this.subgraphsStore = this.global.createStore();
            this.subgraphsGrid = new declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                store: this.subgraphsStore
            }, this.id + "SubgraphsGrid");

            this._initItemGrid(this.subgraphsGrid);
        },

        _initVertices: function () {
            this.verticesStore =  this.global.createStore();
            this.verticesGrid = new declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                store: this.verticesStore
            }, this.id + "VerticesGrid");

            this._initItemGrid(this.verticesGrid);
        },

        _initEdges: function () {
            this.edgesStore =  this.global.createStore();
            this.edgesGrid = new declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                store: this.edgesStore
            }, this.id + "EdgesGrid");

            this._initItemGrid(this.edgesGrid);
        },

        _onRefresh: function () {
            this.refreshData();
        },

        _onTreeRefresh: function () {
            this.loadTree();
        },

        _doFind: function (prev) {
            if (this.findText != this.findField.value) {
                this.findText = this.findField.value;
                this.found = this.global.findAsGlobalID(this.findText);
                this.global.setSelectedAsGlobalID(this.found);
                this.syncSelectionFrom(this.global);
                this.foundIndex = -1;
            }
            this.foundIndex += prev ? -1 : +1;
            if (this.foundIndex < 0) {
                this.foundIndex = this.found.length - 1;
            } else if (this.foundIndex >= this.found.length) {
                this.foundIndex = 0;
            }
            if (this.found.length) {
                this.main.centerOnGlobalID(this.found[this.foundIndex], true);
            }
            this.refreshActionState();
        },

        _onFind: function (prev) {
            this.findText = "";
            this._doFind(false);
        },

        _onFindNext: function () {
            this._doFind(false);
        },

        _onFindPrevious: function () {
            this._doFind(true);
        },

        _onAbout: function () {
            html.set(dom.byId(this.id + "InfoDialogContent"), "<div style='width: 320px; height: 120px; text-align: center;'><p>" + this.i18n.Version + ":  " + this.main.getVersion() + "</p><p>" + this.main.getResourceLinks() + "</p>");
            this.infoDialog.set("title", this.i18n.AboutHPCCSystemsGraphControl);
            this.infoDialog.show();
        },

        _onGetSVG: function () {
            html.set(dom.byId(this.id + "InfoDialogContent"), "<textarea rows='25' cols='80'>" + entities.encode(this.main.getSVG()) + "</textarea>");
            this.infoDialog.set("title", this.i18n.SVGSource);
            this.infoDialog.show();
        },

        _onRenderSVG: function () {
            var context = this
            this.main.localLayout(function (svg) {
                html.set(dom.byId(context.id + "InfoDialogContent"), "<div style='border: 1px inset grey; width: 640px; height: 480px; overflow : auto; '>" + svg + "</div>");
                context.infoDialog.set("title", this.i18n.RenderedSVG);
                context.infoDialog.show();
            });
        },

        _onGetXGMML: function () {
            this.xgmmlDialog.set("title", this.i18n.XGMML);
            this.xgmmlDialog.set("hpccMode", "XGMML");
            this.xgmmlTextArea.set("value", this.main.getXGMML());
            this.xgmmlDialog.show();
        },

        _onEditDOT: function () {
            this.xgmmlDialog.set("title", this.i18n.DOT);
            this.xgmmlDialog.set("hpccMode", "DOT");
            this.xgmmlTextArea.set("value", this.main.getDOT());
            this.xgmmlDialog.show();
        },

        _onGetGraphAttributes: function () {
            this.xgmmlDialog.set("title", this.i18n.DOTAttributes);
            this.xgmmlDialog.set("hpccMode", "DOTATTRS");
            this.xgmmlTextArea.set("value", this.global.getDotMetaAttributes());
            this.xgmmlDialog.show();
        },

        init: function (params) {
            if (this.inherited(arguments))
                return;

            if (params.SafeMode && params.SafeMode != "false") {
                this.main.depth.set("value", 1);
                var dotAttrs = this.global.getDotMetaAttributes();
                dotAttrs = dotAttrs.replace("\n//graph[splines=\"line\"];", "\ngraph[splines=\"line\"];");
                this.global.setDotMetaAttributes(dotAttrs);
            } else {
                var dotAttrs = this.global.getDotMetaAttributes();
                dotAttrs = dotAttrs.replace("\ngraph[splines=\"line\"];", "\n//graph[splines=\"line\"];");
                this.global.setDotMetaAttributes(dotAttrs);
            }
            if (params.Wuid) {
                this.graphName = params.GraphName;
                this.wu = ESPWorkunit.Get(params.Wuid);

                var firstLoad = true;
                var context = this;
                this.wu.monitor(function () {
                    context.wu.getInfo({
                        onGetApplicationValues: function (applicationValues) {
                        },
                        onGetGraphs: function (graphs) {
                            if (firstLoad == true) {
                                firstLoad = false;
                                context.loadGraphFromWu(context.wu, context.graphName);
                            } else {
                                context.refreshGraphFromWU(context.wu, context.graphName);
                            }
                        }
                    });
                });
            } else if (params.QueryId) {
                this.targetQuery = params.Target;
                this.queryId = params.QueryId;
                this.graphName = params.GraphName;

                this.loadGraphFromQuery(this.targetQuery, this.queryId, this.graphName);
            }

            this.timingGrid.init(lang.mixin({
                query: this.graphName
            }, params));

            this.timingTreeMap.init(lang.mixin({
                query: {
                    graphsOnly: true,
                    graphName: this.graphName,
                    subGraphId: "*"
                },
                hideHelp: true
            }, params));

            this.global.on("ready", lang.hitch(this, function(evt) {
                if (this.global.version.major < 5) {
                    dom.byId(this.id + "Warning").innerHTML = this.i18n.WarnOldGraphControl + " (" + this.global.version.version + ")";
                }
            }));
        },

        refreshData: function () {
            if (lang.exists("params.Wuid", this)) {
                this.refreshGraphFromWU(this.wu, this.graphName);
            } else if (lang.exists("params.QueryId", this)) {
                this.refreshGraphFromQuery(this.targetQuery, this.queryId, this.graphName);
            }
        },

        loadGraphFromXGMML: function (xgmml) {
            if (this.global.loadXGMML(xgmml, false)) {
                this.global.setMessage("...");  //  Just in case it decides to render  ---
                var initialSelection = [];
                this.setMainRootItems(initialSelection);
                this.loadTree();
                this.loadSubgraphs();
                this.loadVertices();
                this.loadEdges();
            }
        },

        mergeGraphFromXGMML: function (xgmml) {
            if (this.global.loadXGMML(xgmml, true)) {
                this.global.setMessage("...");  //  Just in case it decides to render  ---
                this.refreshMainXGMML();
                this.loadSubgraphs();
                this.loadVertices();
                this.loadEdges();
            }
        },

        loadGraphFromDOT: function (dot) {
            this.global.loadDOT(dot);
            this.global.setMessage("...");  //  Just in case it decides to render  ---
            this.setMainRootItems([]);
            this.loadSubgraphs();
            this.loadVertices();
            this.loadEdges();
        },

        loadGraphFromWu: function (wu, graphName) {
            var deferred = new Deferred();
            this.main.setMessage(this.i18n.FetchingData);
            var context = this;
            wu.fetchGraphXgmmlByName(graphName, function (xgmml, svg) {
                context.main.setMessage("");
                context.loadGraphFromXGMML(xgmml, svg);
                deferred.resolve();
            });
            return deferred.promise;
        },

        refreshGraphFromWU: function (wu, graphName) {
            var context = this;
            wu.fetchGraphXgmmlByName(graphName, function (xgmml) {
                context.mergeGraphFromXGMML(xgmml);
            }, true);
        },

        loadGraphFromQuery: function (targetQuery, queryId, graphName) {
            this.main.setMessage(this.i18n.FetchingData);
            var context = this;
            WsWorkunits.WUQueryGetGraph({
                request: {
                    Target: targetQuery,
                    QueryId: queryId,
                    GraphName: graphName
                }
            }).then(function(response){
                context.main.setMessage("");
                if(lang.exists("WUQueryGetGraphResponse.Graphs.ECLGraphEx", response)){
                    if(response.WUQueryGetGraphResponse.Graphs.ECLGraphEx.length > 0){
                        context.loadGraphFromXGMML(response.WUQueryGetGraphResponse.Graphs.ECLGraphEx[0].Graph, "");
                    }
                }
            });
        },

        refreshGraphFromQuery: function (targetQuery, queryId, graphName) {
            var context = this;
            WsWorkunits.WUQueryGetGraph({
                request: {
                    Target: targetQuery,
                    QueryId: queryId,
                    GraphName: graphName
                }
            }).then(function (response) {
                if (lang.exists("WUQueryGetGraphResponse.Graphs.ECLGraphEx", response)) {
                    if (response.WUQueryGetGraphResponse.Graphs.ECLGraphEx.length > 0) {
                        context.mergeGraphFromXGMML(response.WUQueryGetGraphResponse.Graphs.ECLGraphEx[0].Graph);
                    }
                }
            });
        },

        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        loadTree: function () {
            var treeData = this.global.getTreeWithProperties();
            this.treeStore.setData(treeData);
            var context = this;
            var columns = [
                tree({
                    field: "id",
                    label: this.i18n.ID, width: 150,
                    shouldExpand: function (row, level, previouslyExpanded) {
                        if (level < context.main.depth.get("value")) {
                            return true;
                        }
                        return false;
                    },
                    formatter: function (_id, row) {
                        var img = dojoConfig.getImageURL("file.png");
                        var label = _id
                        switch (row._globalType) {
                            case "Graph":
                                img = dojoConfig.getImageURL("server.png");
                                label = context.params.GraphName + " (" + row._children.length + ")";
                                break;
                            case "Cluster":
                                img = dojoConfig.getImageURL("folder.png");
                                label = "Subgraph (" + row._children.length + ")";
                                break;
                            case "Vertex":
                                img = dojoConfig.getImageURL("file.png");
                                var labelParts = row.label.split("\n");
                                label = labelParts[0];
                                label = row.label;
                                break;
                        }
                        return "<img src='" + img + "'/>&nbsp;" + label;
                    }
                })
            ];
            for (var key in this.treeStore.cacheColumns) {
                if (key != "id" && key != "label" && key.substring(0, 1) != "_") {
                    columns.push({
                        field: key, label: key, width: 250
                    });
                }
            }
            this.treeGrid.set("columns", columns);
            this.treeGrid.refresh();
        },

        loadSubgraphs: function () {
            var subgraphs = this.global.getSubgraphsWithProperties();

            var layoutMap = [];
            for (var i = 0; i < subgraphs.length; ++i) {
                for (var key in subgraphs[i]) {
                    if (key != "id" && key.substring(0, 1) != "_") {
                        layoutMap[key] = true;
                    }
                    if (this.isNumber(subgraphs[i][key])) {
                        subgraphs[i][key] = parseFloat(subgraphs[i][key]);
                    }
                }
            }

            var layout = [
                { label: this.i18n.ID, field: "id", width: 50 }
            ];

            for (var key in layoutMap) {
                layout.push({ label: key, field: key, width: 100 });
            }

            this.subgraphsStore.setData(subgraphs);
            this.subgraphsGrid.set("columns", layout);
            this.subgraphsGrid.refresh();
        },

        loadVertices: function () {
            var vertices = this.global.getVerticesWithProperties();

            var layoutMap = [];
            for (var i = 0; i < vertices.length; ++i) {
                for (var key in vertices[i]) {
                    if (key != "id" && key != "ecl" && key != "label" && key.substring(0, 1) != "_") {
                        layoutMap[key] = true;
                    }
                    if (this.isNumber(vertices[i][key])) {
                        vertices[i][key] = parseFloat(vertices[i][key]);
                    }
                }
            }

            var layout = [
                { label: this.i18n.ID, field: "id", width: 50 },
                { label: this.i18n.Label, field: "label", width: 150 }
            ];

            for (var key in layoutMap) {
                layout.push({ label: key, field: key, width: 200 });
            }
            layout.push({ label: this.i18n.ECL, field: "ecl", width: 1024 });

            this.verticesStore.setData(vertices);
            this.verticesGrid.set("columns", layout);
            this.verticesGrid.refresh();
        },

        loadEdges: function () {
            var edges = this.global.getEdgesWithProperties();

            var layoutMap = [];
            for (var i = 0; i < edges.length; ++i) {
                for (var key in edges[i]) {
                    if (key != "id" && key.substring(0, 1) != "_") {
                        layoutMap[key] = true;
                    }
                    if (this.isNumber(edges[i][key])) {
                        edges[i][key] = parseFloat(edges[i][key]);
                    }
                }
            }

            var layout = [
                { label: this.i18n.ID, field: "id", width: 50 }
            ];

            for (var key in layoutMap) {
                layout.push({ label: key, field: key, width: 100 });
            }

            this.edgesStore.setData(edges);
            this.edgesGrid.set("columns", layout);
            this.edgesGrid.refresh();
        },

        inSyncSelectionFrom: false,
        syncSelectionFrom: function (sourceControl) {
            if (!this.inSyncSelectionFrom) {
                this._syncSelectionFrom(sourceControl);
            }
        },

        _syncSelectionFrom: dojoConfig.debounce(function (sourceControl) {
            this.inSyncSelectionFrom = true;
            var selectedGlobalIDs = [];

            //  Get Selected Items  ---
            if (sourceControl == this.timingGrid || sourceControl == this.timingTreeMap) {
                var items = sourceControl.getSelected();
                for (var i = 0; i < items.length; ++i) {
                    if (items[i].SubGraphId) {
                        selectedGlobalIDs.push(items[i].SubGraphId);
                    }
                }
            } else if (sourceControl == this.verticesGrid || sourceControl == this.edgesGrid || sourceControl == this.subgraphsGrid || sourceControl == this.treeGrid) {
                var items = sourceControl.getSelected();
                for (var i = 0; i < items.length; ++i) {
                    if (lang.exists("_globalID", items[i])) {
                        selectedGlobalIDs.push(items[i]._globalID);
                    }
                }
            } else {
                selectedGlobalIDs = sourceControl.getSelectionAsGlobalID();
            }

            //  Set Selected Items  ---
            if (sourceControl != this.treeGrid) {
                this.treeGrid.setSelection(selectedGlobalIDs);
            }
            if (sourceControl != this.timingGrid) {
                this.timingGrid.setSelectedAsGlobalID(selectedGlobalIDs);
            }
            if (sourceControl != this.timingTreeMap) {
                this.timingTreeMap.setSelectedAsGlobalID(selectedGlobalIDs);
            }
            if (sourceControl != this.subgraphsGrid && this.subgraphsGrid.store) {
                this.subgraphsGrid.setSelection(selectedGlobalIDs);
            }
            if (sourceControl != this.verticesGrid && this.verticesGrid.store) {
                this.verticesGrid.setSelection(selectedGlobalIDs);
            }
            if (sourceControl != this.edgesGrid && this.edgesGrid.store) {
                this.edgesGrid.setSelection(selectedGlobalIDs);
            }

            //  Refresh Graph Controls  ---
            if (sourceControl != this.main) {
                switch (sourceControl) {
                    //case this.verticesGrid:
                    //case this.edgesGrid:
                    default:
                        this.setMainRootItems(selectedGlobalIDs);
                }
            }

            var propertiesDom = dom.byId(this.id + "Properties");
            propertiesDom.innerHTML = "";
            for (var i = 0; i < selectedGlobalIDs.length; ++i) {
                this.global.displayProperties(selectedGlobalIDs[i], propertiesDom);
            }
            this.inSyncSelectionFrom = false;
        }, 500, false),

        resetPage: function () {
            this.main.clear();
        },

        setMainRootItems: function (globalIDs) {
            var graphView = this.global.getGraphView(globalIDs, this.main.depth.get("value"), this.main.distance.get("value"));
            graphView.navigateTo(this.main);
        },

        refreshMainXGMML: function () {
            var graphView = this.main.getCurrentGraphView();
            graphView.refreshXGMML(this.main);
        },

        displayGraphs: function (graphs) {
            for (var i = 0; i < graphs.length; ++i) {
                this.wu.fetchGraphXgmml(i, function (xgmml) {
                    this.main.loadXGMML(xgmml, true);
                });
            }
        },

        refreshActionState: function (selection) {
            this.setDisabled(this.id + "FindPrevious", !(this.foundIndex > 0), "iconLeft", "iconLeftDisabled");
            this.setDisabled(this.id + "FindNext", !(this.foundIndex < this.found.length - 1), "iconRight", "iconRightDisabled");
        }
    });
});
