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
    "dojo/dom",
    "dojo/dom-form",
    "dojo/request/iframe",
    "dojo/_base/array",

    "dijit/layout/_LayoutWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",

    "dgrid/OnDemandGrid",
    "dgrid/Keyboard",
    "dgrid/Selection",
    "dgrid/selector",
    "dgrid/extensions/ColumnResizer",
    "dgrid/extensions/DijitRegistry",
    "dgrid/extensions/Pagination",

    "hpcc/ESPBase",
    "hpcc/ESPWorkunit",
    "hpcc/ESPLogicalFile",
    "hpcc/WsAccess",
    "hpcc/ESPUtil",

    "dojo/text!../templates/GroupsWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/ToolbarSeparator",
    "dijit/form/TextBox",
    "dijit/Dialog"
], function (declare, lang, dom, domForm, iframe, arrayUtil,
                _LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin, registry,
                OnDemandGrid, Keyboard, Selection, selector, ColumnResizer, DijitRegistry, Pagination,
                ESPBase, ESPWorkunit, ESPLogicalFile, WsAccess, ESPUtil,
                template) {
    return declare("GroupsWidget", [_LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        baseClass: "GroupsWidget",

        borderContainer: null,
        groupsGrid: null,

        initalized: false,
        loaded: false,

        buildRendering: function (args) {
            this.inherited(arguments);
        },

        postCreate: function (args) {
            this.inherited(arguments);
            this.borderContainer = registry.byId(this.id + "BorderContainer");
           
        },

        startup: function (args) {
            this.inherited(arguments);
        },

        resize: function (args) {
            this.inherited(arguments);
            this.borderContainer.resize(); //is needed
        },

        layout: function (args) {
            this.inherited(arguments);
        },

        destroy: function (args) {
            this.inherited(arguments);
        },

        init: function (params) {
            this.initGroupsGrid();
        },

        initGroupsGrid: function () {
            var context = this;
            var store = new WsAccess.GroupsStore();
            this.groupsGrid = declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                allowSelectAll: false,
                deselectOnRefresh: false,
                store: store,
                columns: {
                    check: selector({
                        width: 1, 
                        label: " "
                    },"checkbox"),
                    name: {
                        width: 27,
                        label: "name"
                    }
                },
            },

            this.id + "GroupsGrid");
            this.groupsGrid.set("noDataMessage", "<span class='dojoxGridNoData'>Zero Workunits (check filter).</span>");
            this.groupsGrid.onSelectionChanged(function (event) {
                context.refreshActionState();
            });
            this.groupsGrid.onContentChanged(function (event) {
                context.refreshActionState();
            });
            this.groupsGrid.startup();
            this.refreshActionState();
        },

        //  Hitched actions  ---
        _onCancelDialog: function (event) {
            registry.byId(this.id + "EditDialog").hide();
        },

        /*_onEdit: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
            registry.byId(this.id + "EditDialog").show();
            
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("Username", null, item.username);
            });

             WsAccess.UserInfoEditInput({
               request: domForm.toObject(this.id + "UsersForm")
            }).then(function (response) {
                if(lang.exists("UserInfoEditInputResponse.firstname", response)){
                    context.updateInput("FirstName", null, response.UserInfoEditInputResponse.firstname);
                }
                if(lang.exists("UserInfoEditInputResponse.lastname", response)){
                    context.updateInput("LastName", null, response.UserInfoEditInputResponse.lastname);
                }
            });
        },*/

        /*TODO----------------------
        _onUpdateUser: function (event) {
             var context = this;
            var selections = this.usersGrid.getSelected();
            registry.byId(this.id + "EditDialog").show();
            
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("Username", null, item.username);
            });

            WsAccess.UserInfoEdit({
               request: selections.username
            }).then(function (response) {

                if(lang.exists("UserInfoEditResponse.retmsg", response)){
                    context.updateInput("FirstName", null, response.UserInfoEditInputResponse.firstname);
                }
            });
        },*/


         _onPassWord: function (event) {
            
        },

         _onPermissions: function (event) {
        
        },

        refreshActionState: function () {
            var selection = this.groupsGrid.getSelected();
            var hasSelection = selection.length;
            registry.byId(this.id + "Refresh").set("disabled", !hasSelection);
            registry.byId(this.id + "Add").set("disabled", !hasSelection);
            registry.byId(this.id + "Delete").set("disabled", !hasSelection);
            registry.byId(this.id + "EditMembers").set("disabled", !hasSelection);
            registry.byId(this.id + "EditPermissions").set("disabled", !hasSelection);
        },

        updateInput: function (name, oldValue, newValue) {
            var registryNode = registry.byId(this.id + name);
            if (registryNode) {
                registryNode.set("value", newValue);
            } else {
                var domElem = dom.byId(this.id + name);
                if (domElem) {
                    switch (domElem.tagName) {
                        case "SPAN":
                        case "DIV":
                            domAttr.set(this.id + name, "innerHTML", newValue);
                            break;
                        case "INPUT":
                        case "TEXTAREA":
                            domAttr.set(this.id + name, "value", newValue);
                            break;
                        default:
                            alert(domElem.tagName);
                    }
                }
            }
        },

        refresh: function () {
            if (this.result && !this.result.isComplete()) {
                this.grid.showMessage(this.result.getLoadingMessage());
            } else if (!this.loaded) {
                this.loaded = true;
                this.grid.set("query", {
                    id: "*"
                });
            }
        }
    });
});
