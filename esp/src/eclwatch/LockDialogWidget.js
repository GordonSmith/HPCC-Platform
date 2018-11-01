define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/dom-form",
    "dojo/dom-class",
    "dojo/on",
    "dojo/dom-style",
    "dojo/request/xhr",
    "dojo/keys",
    "dojo/cookie",
    "dojo/topic",
    "dojo/query",

    "dijit/registry",
    "dijit/form/Select",
    "dijit/form/CheckBox",

    "hpcc/_Widget",
    "src/Utility",
    "src/ws_account",
    "src/ESPUtil",
    "src/Session",

    "dojo/text!../templates/LockDialogWidget.html",

    "dijit/Dialog",
    "dijit/form/Form",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",

    "hpcc/TableContainer"

], function (declare, lang, i18n, nlsHPCC, arrayUtil, dom, domForm, domClass, on, domStyle, xhr, keys, cookie, topic, query,
    registry, Select, CheckBox,
    _Widget, Utility, WsAccount, ESPUtil, Session,
    template) {
        return declare("LockDialogWidget", [_Widget], {
            templateString: template,
            baseClass: "LockDialogWidget",
            i18n: nlsHPCC,

            _width: "480px",
            lockDialogWidget: null,
            idleFired: null,

            postCreate: function (args) {
                this.inherited(arguments);
                this.unlockDialog = registry.byId(this.id + "UnlockDialog");
                this.tableContainer = registry.byId(this.id + "TableContainer");
                this.unlockUserName = registry.byId(this.id + "UnlockUserName");
                this.unlockPassword = registry.byId(this.id + "UnlockPassword");
                this.unlockForm = registry.byId(this.id + "UnlockForm");
                this.unlockStatus = dom.byId(this.id + "UnlockStatus");
            },

            startup: function (args) {
                this.inherited(arguments);
            },

            show: function (event) {
                var context = this;
                on(this.unlockPassword, "keypress", function (event) {
                    if (event.key === "Enter") {
                        context._onUnlock();
                    }
                });

                this.unlockDialog.show();
                domClass.add("SessionLock", "overlay");
                this.unlockUserName.set("value", dojoConfig.username);
            },

            hide: function (event) {
                domClass.remove("SessionLock", "overlay");
                this.unlockDialog.hide();
                this.unlockDialog.destroyRecursive()
                dojo.query(".dijitDialogUnderlayWrapper").forEach(function (node) {
                    dojo.destroy(node.id);
                });
                dojo.query(".unlockDialogToHide").forEach(function (node) {
                    dojo.destroy(node.id);
                });
            },

            _onUnlock: function (event) {
                var context = this;

                if (this.unlockForm.validate()) {
                    Session.unlock(this.unlockUserName.get("value"), this.unlockPassword.get("value")).then(function (response) {
                        if (response.UnlockResponse.Error === 0) {
                            if (context.unlockStatus.innerHTML !== "") {
                                context.unlockStatus.innerHTML = "";
                            }
                            domClass.remove("SessionLock", "overlay");
                            context.unlockDialog.hide();
                            context.unlockDialog.destroyRecursive();
                            Session.status("Unlocked");
                            if (context.idleFired) {
                                dojo.publish("hpcc/brToaster", {
                                    Exceptions: [{
                                        Source: context.i18n.ECLWatchSessionManagement,
                                        Message: context.i18n.YourScreenWasLocked,
                                        duration: -1
                                    }]
                                });
                                context.idleFired = null;
                            }
                        } else {
                            context.unlockStatus.innerHTML = response.UnlockResponse.Message;
                            Session.status("Locked");
                        }
                    });
                }
            },

            _onLock: function (idleCreator) {
                var context = this;

                on(this.unlockPassword, "keypress", function (event) {
                    if (event.key === "Enter") {
                        context._onUnlock();
                    }
                });

                if (idleCreator && idleCreator.status === "firedIdle") {
                    context.idleFired = true;
                    context.unlockDialog.show();
                    domClass.add("SessionLock", "overlay");
                    context.unlockUserName.set("value", cookie("User"));
                    topic.publish("hpcc/session_management_status", {
                        status: "Locked"
                    });
                    Session.status("Locked");
                } else if (Session.status() === "Unlocked") {
                    Session.lock();
                    context.unlockDialog.show();
                    domClass.add("SessionLock", "overlay");
                    context.unlockUserName.set("value", dojoConfig.username);
                }
            },

            init: function (params) {
                if (this.inherited(arguments))
                    return;
            }
        });
    });
