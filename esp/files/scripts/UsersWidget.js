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
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/MenuSeparator",

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
    "hpcc/GroupsWidget",
    "hpcc/PermissionsWidget",


    "dojo/text!../templates/UsersWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/form/Form",
    "dijit/form/Button",
    "dijit/ToolbarSeparator",
    "dijit/form/TextBox",
    "dijit/Dialog",

    "dojox/layout/TableContainer",
    "dojox/form/PasswordValidator"
], function (declare, lang, dom, domForm, iframe, arrayUtil,
                _LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin, registry, Menu, MenuItem, MenuSeparator,
                OnDemandGrid, Keyboard, Selection, selector, ColumnResizer, DijitRegistry, Pagination,
                ESPBase, ESPWorkunit, ESPLogicalFile, WsAccess, ESPUtil, GroupsWidget, PermissionsWidget,
                template) {
    return declare("UsersWidget", [_LayoutWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        baseClass: "UsersWidget",

        borderContainer: null,
        usersTab: null,
        usersGrid: null,
        groupsWidget: null,
        groupsWidgetLoaded: false,
        permissionsWidget: null,
        permissionsWidgetLoaded: false,

        initalized: false,
        loaded: false,

        buildRendering: function (args) {
            this.inherited(arguments);
        },

        postCreate: function (args) {
            this.inherited(arguments);
            this.borderContainer = registry.byId(this.id + "BorderContainer");
            this.groupsWidget = registry.byId(this.id + "_Groups");
            this.permissionsWidget = registry.byId(this.id + "_Permissions");
            //this.usersTab = registry.byId(this.id + "_Users");
        },

        startup: function (args) {
            this.inherited(arguments);
            this.initContextMenu();
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
            this.initUsersGrid();
            this.permissionsWidget.init({});
            this.groupsWidget.init({});
        },

        initMemberGrid: function () {
            var context = this;
            var store = new WsAccess.CreateMemberOfStore();
            this.memberofGrid = declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                allowSelectAll: false,
                deselectOnRefresh: false,
                store: store,
                columns: {
                    col1: selector({
                        width: 1,
                        label: " "
                    }),
                    username: {
                        width: 27,
                        label: "Username"
                    },
                    
                },
            },
            this.id + "MembersOfGrid");
            this.memberofGrid.set("noDataMessage", "<span class='dojoxGridNoData'>Zero Workunits (check filter).</span>");
            this.memberofGrid.onSelectionChanged(function (event) {
                context.refreshActionState();
            });
            this.memberofGrid.onContentChanged(function (event) {
                context.refreshActionState();
            });
            this.memberofGrid.startup();
            this.refreshActionState();
        },

        initContextMenu: function() {
            var context = this;
            var pMenu = new Menu({
                targetNodeIds: [this.id + "UsersGrid"]
            });
            pMenu.addChild(new MenuItem({
                label: "Edit",
                onClick: function(args){context._onEdit();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Member Of",
                onClick: function(args){context._onOpen();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Change Password",
                onClick: function(args){context._onPassword();}
            }));
            pMenu.addChild(new MenuItem({
                label: "Change Permissions",
                onClick: function(args){dijit.byId(context.id+"AddtoDropDown").openDropDown()}
            }));
        },

        initUsersGrid: function () {
            var context = this;
            var store = new WsAccess.CreateUsersStore();
            this.usersGrid = declare([OnDemandGrid, Keyboard, Selection, ColumnResizer, DijitRegistry, ESPUtil.GridHelper])({
                allowSelectAll: false,
                deselectOnRefresh: false,
                store: store,
                columns: {
                    check: selector({
                        width: 1, 
                        label: " "
                    },"checkbox"),
                    username: {
                        width: 27,
                        label: "Username"
                    },
                    fullname: {
                        width: 27,
                        label: "Full Name"
                    },
                    passwordexpiration: {
                        width: 27,
                        label: "Password Expiration"
                    },
                },
            },
            this.id + "UsersGrid");
            this.usersGrid.set("noDataMessage", "<span class='dojoxGridNoData'>Zero Workunits (check filter).</span>");
            this.usersGrid.onSelectionChanged(function (event) {
                context.refreshActionState();
            });
            this.usersGrid.onContentChanged(function (event) {
                context.refreshActionState();
            });
            this.usersGrid.startup();
            this.refreshActionState();
        },

        //  Hitched actions  ---
        _onCancelDialog: function (event) {
            registry.byId(this.id + "EditDialog").hide();
            registry.byId(this.id + "PasswordDialog").hide();
        },

        _onEdit: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
            registry.byId(this.id + "EditDialog").show();
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("UsersUsername", null, item.username);
            });
             WsAccess.UserInfoEditInput({
               request: domForm.toObject(this.id + "EditForm")
            }).then(function (response) {
                if(lang.exists("UserInfoEditInputResponse.firstname", response)){
                    context.updateInput("UsersFirstName", null, response.UserInfoEditInputResponse.firstname);
                }
                if(lang.exists("UserInfoEditInputResponse.lastname", response)){
                    context.updateInput("UsersLastName", null, response.UserInfoEditInputResponse.lastname);
                }
            });
        },

        _onMemberOf: function (event) {
        },

        _onPassword: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
            registry.byId(this.id + "PasswordDialog").show();
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("PasswordUsername", null, item.username);
            });
        },

         _onPermissions: function (event) {
        },

        _onEditSubmit: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("UsersUsername", null, item.username);
            });
             WsAccess.UserInfoEdit({
               request: domForm.toObject(this.id + "EditForm")
            }).then(function (response) {
                if(lang.exists("UserInfoEditResponse.retmsg", response)){
                    context.updateInput("Validated", null, response.UserInfoEditResponse.retmsg);
                }
            });
        },

        _onPasswordSubmit: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("PasswordUsername", null, item.username);
            });
            WsAccess.UserResetPass({
               request: domForm.toObject(this.id + "PasswordForm")
            }).then(function (response) {
                if(lang.exists("UserResetPassResponse.retcode", response)){
                    context.updateInput("Validated", null, "yes!");
                }
            });
        },


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

         /*TODO NEED TO ADD A STORE ON CLICK
         _onMemberOf: function (event) {
            var context = this;
            var selections = this.usersGrid.getSelected();
            registry.byId(this.id + "MemberDialog").show();
            
             arrayUtil.forEach(selections, function (item, idx) {
                context.updateInput("MemberUsername", null, item.username);
            });

            var firstTab = null;
            var tab = this.ensurePane(this.id + "_" + selections.username, {
                    username: selections.username
                });
                if (i == 0) {
                    firstTab = tab;
                }
            
            if (firstTab) {
                this.selectChild(firstTab);
            }

             WsAccess.UserEdit({
                    request: domForm.toObject(this.id + "MembersForm")
                }).then(function (response) {
                if(lang.exists("UserEditResponse.username", response)){
                    var groupNames = Groups.Group.name;
                    arrayUtil.forEach(groupNames, function (item, idx) {
                         //context.updateInput("MemberUsername", null, item.username);
                         alert("yes");
                    });
                    //context.updateInput("MemberUsername", null, response.UserEditResponse.username);
                }
                });
        },*/

         

        
        

        refreshActionState: function () {
            var selection = this.usersGrid.getSelected();
            var hasSelection = selection.length;
            registry.byId(this.id + "EditUsers").set("disabled", !hasSelection);
            registry.byId(this.id + "MemberOf").set("disabled", !hasSelection);
            registry.byId(this.id + "Password").set("disabled", !hasSelection);
            registry.byId(this.id + "Permissions").set("disabled", !hasSelection);
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
