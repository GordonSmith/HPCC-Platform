/*##############################################################################
#   HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems.
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
############################################################################## */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-form",
    "dojo/date",
    "dojo/on",

    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "dijit/Dialog",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",
    "dijit/PopupMenuItem",

    "dgrid/OnDemandGrid",
    "dgrid/tree",
    "dgrid/Keyboard",
    "dgrid/Selection",
    "dgrid/selector",
    "dgrid/extensions/ColumnResizer",
    "dgrid/extensions/DijitRegistry",
    "dgrid/extensions/Pagination",

    "hpcc/_TabContainerWidget",
    "hpcc/FileSpray",
    "hpcc/ESPUtil",

    "dojo/text!../templates/LZBrowseWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Textarea",
    "dijit/form/DateTextBox",
    "dijit/form/TimeTextBox",
    "dijit/form/Button",
    "dijit/form/RadioButton",
    "dijit/form/Select",
    "dijit/Toolbar",
    "dijit/TooltipDialog",

    "dojox/layout/TableContainer"

], function (declare, lang, arrayUtil, dom, domClass, domForm, date, on,
                _TemplatedMixin, _WidgetsInTemplateMixin, registry, Dialog, Menu, MenuItem, MenuSeparator, PopupMenuItem,
                OnDemandGrid, tree, Keyboard, Selection, selector, ColumnResizer, DijitRegistry, Pagination,
                _TabContainerWidget, FileSpray, ESPUtil,
                template) {
    return declare("LZBrowseWidget", [_TabContainerWidget, _TemplatedMixin, _WidgetsInTemplateMixin, ESPUtil.FormHelper], {
        templateString: template,
        baseClass: "LZBrowseWidget",

        landingZonesTab: null,
        landingZonesGrid: null,

        tabMap: [],

        validateDialog: null,

        postCreate: function (args) {
            this.inherited(arguments);
            this.landingZonesTab = registry.byId(this.id + "_LandingZones");
        },

        startup: function (args) {
            this.inherited(arguments);
        },

        //  Hitched actions  ---
        _onRefresh: function (event) {
            this.refreshGrid();
        },

        _onOpen: function (event) {
            var selections = this.landingZonesGrid.getSelected();
            var firstTab = null;
            for (var i = selections.length - 1; i >= 0; --i) {
                var tab = this.ensurePane(this.id + "_" + selections[i].Wuid, {
                    Wuid: selections[i].Wuid
                });
                if (i == 0) {
                    firstTab = tab;
                }
            }
            if (firstTab) {
                this.selectChild(firstTab);
            }
        },

        _onDelete: function (event) {
            if (confirm('Delete selected workunits?')) {
                var context = this;
                var selection = this.landingZonesGrid.getSelected();
                WsWorkunits.WUAction(selection, "Delete", {
                    load: function (response) {
                        context.refreshGrid(response);
                    }
                });
            }
        },

        _onSetToFailed: function (event) {
            WsWorkunits.WUAction(this.landingZonesGrid.getSelected(), "SetToFailed");
        },

        _onAbort: function (event) {
            WsWorkunits.WUAction(this.landingZonesGrid.getSelected(), "Abort");
        },

        _onProtect: function (event) {
            WsWorkunits.WUAction(this.landingZonesGrid.getSelected(), "Protect");
        },

        _onUnprotect: function (event) {
            WsWorkunits.WUAction(this.landingZonesGrid.getSelected(), "Unprotect");
        },

        _onReschedule: function (event) {
        },

        _onDeschedule: function (event) {
        },

        _onFilterApply: function (event) {
            registry.byId(this.id + "FilterDropDown").closeDropDown();
            if (this.hasFilter()) {
                this.applyFilter();
            } else {
                this.validateDialog.show();
            }
        },

        _onFilterClear: function (event) {
            this.clearFilter();
            this.applyFilter();
        },

        _onRowDblClick: function (wuid) {
            var wuTab = this.ensurePane(this.id + "_" + wuid, {
                Wuid: wuid
            });
            this.selectChild(wuTab);
        },

        _onRowContextMenu: function (item, colField, mystring) {
            this.menuFilterOwner.set("disabled", false);
            this.menuFilterJobname.set("disabled", false);
            this.menuFilterCluster.set("disabled", false);
            this.menuFilterState.set("disabled", false);

            if (item) {
                this.menuFilterOwner.set("label", "Owner:  " + item.Owner);
                this.menuFilterOwner.set("hpcc_value", item.Owner);
                this.menuFilterJobname.set("label", "Jobname:  " + item.Jobname);
                this.menuFilterJobname.set("hpcc_value", item.Jobname);
                this.menuFilterCluster.set("label", "Cluster:  " + item.Cluster);
                this.menuFilterCluster.set("hpcc_value", item.Cluster);
                this.menuFilterState.set("label", "State:  " + item.State);
                this.menuFilterState.set("hpcc_value", item.State);
            }

            if (item.Owner == "") {
                this.menuFilterOwner.set("disabled", true);
                this.menuFilterOwner.set("label", "Owner:  " + "N/A");
            }
            if (item.Jobname == "") {
                this.menuFilterJobname.set("disabled", true);
                this.menuFilterJobname.set("label", "Jobname:  " + "N/A");
            }
            if (item.Cluster == "") {
                this.menuFilterCluster.set("disabled", true);
                this.menuFilterCluster.set("label", "Cluster:  " + "N/A");
            }
            if (item.State == "") {
                this.menuFilterState.set("disabled", true);
                this.menuFilterState.set("label", "State:  " + "N/A");
            }
        },

        //  Implementation  ---
        init: function (params) {
            if (this.initalized)
                return;
            this.initalized = true;
            this.initLandingZonesGrid();
            this.selectChild(this.landingZonesTab, true);
        },

        initTab: function () {
            var currSel = this.getSelectedChild();
            if (currSel && !currSel.initalized) {
                if (currSel.id == this.landingZonesTab.id) {
                } else {
                    if (!currSel.initalized) {
                        currSel.init(currSel.params);
                    }
                }
            }
        },

        addMenuItem: function (menu, details) {
            var menuItem = new MenuItem(details);
            menu.addChild(menuItem);
            return menuItem;
        },

        initLandingZonesGrid: function () {
            var store = new FileSpray.CreateLandingZonesStore();
            this.landingZonesGrid = new declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                allowSelectAll: true,
                deselectOnRefresh: false,
                store: store,
                columns: {
                    col1: selector({
                        width: 27,
                        selectorType: 'checkbox',
                        disabled: function (item) {
                            if (item.type) {
                                switch (item.type) {
                                    case "dropzone":
                                    case "folder":
                                        return true;
                                }
                            }
                            return false;
                        }
                    }),
                    displayName: tree({
                        label: "Name",
                        collapseOnRefresh: true
                    }),
                    filesize: { label: "Size", width: 108 },
                    modifiedtime: { label: "Date", width: 180 }
                }
            }, this.id + "LandingZonesGrid");
            this.landingZonesGrid.set("noDataMessage", "<span class='dojoxGridNoData'>Zero Workunits (check filter).</span>");

            var context = this;
            on(document, ".WuidClick:click", function (evt) {
                if (context._onRowDblClick) {
                    var item = context.landingZonesGrid.row(evt).data;
                    context._onRowDblClick(item.Wuid);
                }
            });
            this.landingZonesGrid.on(".dgrid-row:dblclick", function (evt) {
                if (context._onRowDblClick) {
                    var item = context.landingZonesGrid.row(evt).data;
                    context._onRowDblClick(item.Wuid);
                }
            });
            this.landingZonesGrid.on(".dgrid-row:contextmenu", function (evt) {
                if (context._onRowContextMenu) {
                    var item = context.landingZonesGrid.row(evt).data;
                    var cell = context.landingZonesGrid.cell(evt);
                    var colField = cell.column.field;
                    var mystring = "item." + colField;
                    context._onRowContextMenu(item, colField, mystring);
                }
            });
            this.landingZonesGrid.onSelectionChanged(function (event) {
                context.refreshActionState();
            });
            this.landingZonesGrid.onContentChanged(function (object, removedFrom, insertedInto) {
                context.refreshActionState();
            });
            this.landingZonesGrid.startup();
        },

        refreshGrid: function (args) {
            this.landingZonesGrid.set("query", {
                id: "*"
            });
        },

        refreshActionState: function () {
            var selection = this.landingZonesGrid.getSelected();
            /*
            var hasSelection = false;
            var hasProtected = false;
            var hasNotProtected = false;
            var hasFailed = false;
            var hasNotFailed = false;
            var hasCompleted = false;
            var hasNotCompleted = false;
            for (var i = 0; i < selection.length; ++i) {
                hasSelection = true;
                if (selection[i] && selection[i].Protected !== null) {
                    if (selection[i].Protected != "0") {
                        hasProtected = true;
                    } else {
                        hasNotProtected = true;
                    }
                }
                if (selection[i] && selection[i].StateID !== null) {
                    if (selection[i].StateID == "4") {
                        hasFailed = true;
                    } else {
                        hasNotFailed = true;
                    }
                    if (WsWorkunits.isComplete(selection[i].StateID)) {
                        hasCompleted = true;
                    } else {
                        hasNotCompleted = true;
                    }
                }
            }

            registry.byId(this.id + "Open").set("disabled", !hasSelection);
            registry.byId(this.id + "Delete").set("disabled", !hasNotProtected);
            registry.byId(this.id + "Abort").set("disabled", !hasNotCompleted);
            registry.byId(this.id + "SetToFailed").set("disabled", !hasNotProtected);
            registry.byId(this.id + "Protect").set("disabled", !hasNotProtected);
            registry.byId(this.id + "Unprotect").set("disabled", !hasProtected);
            registry.byId(this.id + "Reschedule").set("disabled", true);    //TODO
            registry.byId(this.id + "Deschedule").set("disabled", true);    //TODO

            this.menuProtect.set("disabled", !hasNotProtected);
            this.menuUnprotect.set("disabled", !hasProtected);

            this.refreshFilterState();
            */
        },

        refreshFilterState: function () {
            var hasFilter = this.hasFilter();
            dom.byId(this.id + "IconFilter").src = hasFilter ? "img/filter.png" : "img/noFilter.png";
        },

        ensurePane: function (id, params) {
            var retVal = this.tabMap[id];
            if (!retVal) {
                retVal = registry.byId(id);
                if (!retVal) {
                    var context = this;
                    retVal = new WUDetailsWidget({
                        id: id,
                        title: params.Wuid,
                        closable: true,
                        onClose: function () {
                            //  Workaround for http://bugs.dojotoolkit.org/ticket/16475
                            context._tabContainer.removeChild(this);
                            delete context.tabMap[this.id];
                            return false;
                        },
                        params: params
                    });
                }
                this.tabMap[id] = retVal;
                this.addChild(retVal, 1);
            }
            return retVal;
        }

    });
});
