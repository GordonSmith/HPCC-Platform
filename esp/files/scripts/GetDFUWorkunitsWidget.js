/*##############################################################################
#	HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems.
#
#	Licensed under the Apache License, Version 2.0 (the "License");
#	you may not use this file except in compliance with the License.
#	You may obtain a copy of the License at
#
#	   http://www.apache.org/licenses/LICENSE-2.0
#
#	Unless required by applicable law or agreed to in writing, software
#	distributed under the License is distributed on an "AS IS" BASIS,
#	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#	See the License for the specific language governing permissions and
#	limitations under the License.
############################################################################## */
define([
    "dojo/_base/declare",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-form",
    "dojo/data/ObjectStore",
    "dojo/date",
    "dojo/on",
    "dojo/_base/array",

    "dijit/layout/_LayoutWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",
    "dijit/Dialog",

    "dojox/grid/EnhancedGrid",
    "dojox/grid/enhanced/plugins/Pagination",
    "dojox/grid/enhanced/plugins/IndirectSelection",

    "hpcc/FileSpray",
    "hpcc/DFUWUDetailsWidget",
    "hpcc/TargetSelectWidget",

    "dojo/text!../templates/GetDFUWorkunitsWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Textarea",
    "dijit/form/DateTextBox",
    "dijit/form/TimeTextBox",
    "dijit/form/Button",
    "dijit/form/Select",
    "dijit/Toolbar",
    "dijit/TooltipDialog",

    "dojox/layout/TableContainer"

], function (declare, dom, domClass, domForm, ObjectStore, date, on, arrayUtil, 
                _LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin, registry, Menu, MenuItem, MenuSeparator, Dialog,
                EnhancedGrid, Pagination, IndirectSelection,
                FileSpray, DFUWUDetailsWidget, TargetSelectWidget,
                template) {
    return declare("GetDFUWorkunitsWidget", [_LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        baseClass: "GetDFUWorkunitsWidget",
        borderContainer: null,
        tabContainer: null,
        workunitsGrid: null,
        legacyPane: null,
        legacyPaneLoaded: false,

        tabMap: [],

        validateDialog: null,

        buildRendering: function (args) {
            this.inherited(arguments);
        },

        postCreate: function (args) {
            this.inherited(arguments);
            this.borderContainer = registry.byId(this.id + "BorderContainer");
            this.tabContainer = registry.byId(this.id + "TabContainer");
            this.workunitsGrid = registry.byId(this.id + "WorkunitsGrid");
            this.legacyPane = registry.byId(this.id + "Legacy");

            var context = this;
            this.tabContainer.watch("selectedChildWidget", function (name, oval, nval) {
                if (nval.id == context.id + "Workunits") {
                } else if (nval.id == context.id + "Legacy") {
                    if (!context.legacyPaneLoaded) {
                        context.legacyPaneLoaded = true;
                        context.legacyPane.set("content", dojo.create("iframe", {
                            src: "/FileSpray/GetDFUWorkunits",
                            style: "border: 0; width: 100%; height: 100%"
                        }));
                    }
                } else {
                    if (!nval.initalized) {
                        nval.init(nval.params);
                    }
                }
                context.selectedTab = nval;
            });
        },

        startup: function (args) {
            this.inherited(arguments);
            this.refreshActionState();
            this.initWorkunitsGrid();
            this.initFilter();
        },

        resize: function (args) {
            this.inherited(arguments);
            this.borderContainer.resize();
        },

        layout: function (args) {
            this.inherited(arguments);
        },

        destroy: function (args) {
            this.inherited(arguments);
        },

        //  Hitched actions  ---
        _onOpen: function (event) {
            var selections = this.workunitsGrid.selection.getSelected();
            for (var i = selections.length - 1; i >= 0; --i) {
                this.ensurePane(selections[i].ID, {
                    Wuid: selections[i].ID
                });
            }
        },

        _onDelete: function (event) {
            if (confirm('Delete selected workunits?')) {
                var context = this;
                FileSpray.WUAction(this.workunitsGrid.selection.getSelected(), "Delete", {
                    load: function (response) {
                        context.workunitsGrid.rowSelectCell.toggleAllSelection(false);
                        context.refreshGrid(response);
                    }
                });
            }
        },

        _onSetToFailed: function (event) {
            var context = this;
            FileSpray.WUAction(this.workunitsGrid.selection.getSelected(), "SetToFailed", {
                load: function (response) {
                    context.refreshGrid(response);
                }
            });
        },

        _onProtect: function (event) {
            var context = this;
            FileSpray.WUAction(this.workunitsGrid.selection.getSelected(), "Protect", {
                load: function (response) {
                    context.refreshGrid(response);
                }
            });
        },

        _onUnprotect: function (event) {
            var context = this;
            var selection = this.workunitsGrid.selection.getSelected();
            FileSpray.WUAction(this.workunitsGrid.selection.getSelected(), "Unprotect", {
                load: function (response) {
                    context.refreshGrid(response);
                }
            });
        },

        _onFilterApply: function (event) {
            this.workunitsGrid.rowSelectCell.toggleAllSelection(false);
            if (this.hasFilter()) {
                registry.byId(this.id + "FilterDropDown").closeDropDown();
                this.refreshGrid();
            } else {
                registry.byId(this.id + "FilterDropDown").closeDropDown();
                this.validateDialog.show();
            }
        },

        _onFilterClear: function(event) {
           this.workunitsGrid.rowSelectCell.toggleAllSelection(false);
            var context = this;
            arrayUtil.forEach(registry.byId(this.id + "FilterForm").getDescendants(), function (item, idx) {
                   item.set('value', null);
            });
            this.refreshGrid();
        },

        getFilter: function () {
            var retVal = {
                Owner: dom.byId(this.id + "Owner").value,
                Jobname: dom.byId(this.id + "Jobname").value,
                Cluster: dom.byId(this.id + "Cluster").value,
                State: dom.byId(this.id + "State").value,
                ECL: dom.byId(this.id + "ECL").value,
                LogicalFile: dom.byId(this.id + "LogicalFile").value,
                LogicalFileSearchType: registry.byId(this.id + "LogicalFileSearchType").get("value"),
                StartDate: this.getISOString("FromDate", "FromTime"),
                EndDate: this.getISOString("ToDate", "ToTime"),
                LastNDays: dom.byId(this.id + "LastNDays").value
            };
            if (retVal.StartDate != "" && retVal.EndDate != "") {
                retVal["DateRB"] = "0";
            } else if (retVal.LastNDays != "") {
                retVal["DateRB"] = "0";
                var now = new Date();
                retVal.StartDate = date.add(now, "day", dom.byId(this.id + "LastNDays").value * -1).toISOString();
                retVal.EndDate = now.toISOString();
            }
            return retVal;
        },

         hasFilter: function () {
            var filter = domForm.toObject(this.id + "FilterForm")
            for (var key in filter) {
                if (filter[key] != ""){
                    return true
                }
            }
            return false
        },

        getISOString: function (dateField, timeField) {
            var d = registry.byId(this.id + dateField).attr("value");
            var t = registry.byId(this.id + timeField).attr("value");
            if (d) {
                if (t) {
                    d.setHours(t.getHours());
                    d.setMinutes(t.getMinutes());
                    d.setSeconds(t.getSeconds());
                }
                return d.toISOString();
            }
            return "";
        },

        //  Implementation  ---
        init: function (params) {
            if (this.initalized)
                return;
            this.initalized = true;
        },

        initWorkunitsGrid: function() {
            var pMenu;
            var context = this;
            
            pMenu = new Menu({
                targetNodeIds: [this.id + "WorkunitsGrid"]
            });
            pMenu.addChild(new MenuItem({
                label: "Open",
                onClick: function(){context._onOpen();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Delete",
                onClick: function(){context._onDelete();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Set To Failed",
                onClick: function(){context._onRename();}
            }));
            pMenu.addChild(new MenuSeparator());
            pMenu.addChild(new MenuItem({
                label: "Protect",
                onClick: function(){context._onProtect();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Unprotect",
                onClick: function(){context._onUnprotect();}
            }));
            pMenu.addChild(new MenuSeparator());
            pMenu.addChild(new MenuItem({
                label: "Filter",
                onClick: function(args){dijit.byId(context.id+"FilterDropDown").openDropDown()}
            }));
            pMenu.startup();

            this.workunitsGrid.setStructure([
			    {
				    name: "P",
				    field: "isProtected",
				    width: "20px",
				    formatter: function (_protected) {
				        if (_protected == true) {
					       return ("<img src='../files/img/locked.png'>");
					    }
					    return ""
				    }
			    },
			    { name: "ID", field: "ID", width: "12" },
			    {
			        name: "Type",
			        field: "Command",
			        width: "8",
			        formatter: function (command) {
			            switch (command) {
			                case 1: return "Copy";
			                case 2: return "Remove";
			                case 3: return "Move";
			                case 4: return "Rename";
			                case 5: return "Replicate";
			                case 6: return "Spray";
			                case 7: return "Despray";
			                case 8: return "Add";
			                case 9: return "Transfer";
			                case 10: return "Save Map";
			                case 11: return "Add Group";
			                case 12: return "Server";
			                case 13: return "Monitor";
			                case 14: return "Copy Merge";
			                case 15: return "Super Copy";
			            }
			            return "Unknown";
			        }
			    },
			    { name: "Owner", field: "Owner", width: "8" },
			    { name: "Job Name", field: "JobName", width: "16" },
			    { name: "Cluster", field: "ClusterName", width: "8" },
			    { name: "State", field: "StateMessage", width: "8" },
			    { name: "% Complete", field: "PercentDone", width: "8" }
            ]);
            var store = new FileSpray.GetDFUWorkunits();
            var objStore = new ObjectStore({ objectStore: store });
            this.workunitsGrid.setStore(objStore);
            this.workunitsGrid.setQuery(this.getFilter());

            var context = this;
            this.workunitsGrid.on("RowDblClick", function (evt) {
                if (context._onRowDblClick) {
                    var idx = evt.rowIndex;
                    var item = this.getItem(idx);
                    var id = this.store.getValue(item, "ID");
                    context._onRowDblClick(id);
                }
            }, true);

            this.workunitsGrid.on("RowContextMenu", function (evt) {
                if (context._onRowContextMenu) {
                    var idx = evt.rowIndex;
                    var colField = evt.cell.field;
                    var item = this.getItem(idx);
                    var mystring = "item." + colField;
                    context._onRowContextMenu(idx, item, colField, mystring);
                }
            }, true);

            dojo.connect(this.workunitsGrid.selection, 'onSelected', function (idx) {
                context.refreshActionState();
            });
            dojo.connect(this.workunitsGrid.selection, 'onDeselected', function (idx) {
                context.refreshActionState();
            });

            this.workunitsGrid.startup();
        },

        initFilter: function () {
            this.validateDialog = new Dialog({
                title: "Filter",
                content: "No filter criteria specified."
            });
        },

        refreshGrid: function (args) {
            this.workunitsGrid.setQuery(this.getFilter());
            var context = this;
            setTimeout(function () {
                context.refreshActionState()
            }, 200);
        },

        refreshActionState: function () {
            var selection = this.workunitsGrid.selection.getSelected();
            var hasSelection = false;
            var hasProtected = false;
            var hasNotProtected = false;
            var hasFailed = false;
            var hasNotFailed = false;
            var hasFilter = this.hasFilter();
            for (var i = 0; i < selection.length; ++i) {
                hasSelection = true;
                if (selection[i] && selection[i].isProtected && selection[i].isProtected != "0") {
                    hasProtected = true;
                } else {
                    hasNotProtected = true;
                }
                if (selection[i] && selection[i].State && selection[i].State == "5") {
                    hasFailed = true;
                } else {
                    hasNotFailed = true;
                }
            }

            registry.byId(this.id + "Open").set("disabled", !hasSelection);
            registry.byId(this.id + "Delete").set("disabled", !hasNotProtected);
            registry.byId(this.id + "SetToFailed").set("disabled", !hasNotProtected);
            registry.byId(this.id + "Protect").set("disabled", !hasNotProtected);
            registry.byId(this.id + "Unprotect").set("disabled", !hasProtected);
            dom.byId(this.id + "IconFilter").src = hasFilter ? "img/filter.png" : "img/noFilter.png";
        },

        ensurePane: function (id, params) {
            var retVal = this.tabMap[id];
            if (!retVal) {
                var context = this;
                retVal = new DFUWUDetailsWidget({
                    Wuid: id,
                    title: id,
                    closable: true,
                    onClose: function () {
                        delete context.tabMap[id];
                        return true;
                    },
                    params: params
                });
                this.tabMap[id] = retVal;
                this.tabContainer.addChild(retVal, 2);
            }
            return retVal;
        },

        _onRowDblClick: function (id) {
            var wuTab = this.ensurePane(id, {
                Wuid: id
            });
            this.tabContainer.selectChild(wuTab);
        },

        _onRowContextMenu: function (idx, item, colField, mystring) {
            var selection = this.workunitsGrid.selection.getSelected();
            var found = arrayUtil.indexOf(selection, item);
            if (found == -1) {
                this.workunitsGrid.selection.deselectAll();
                this.workunitsGrid.selection.setSelected(idx, true);
            }

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

    });
});
