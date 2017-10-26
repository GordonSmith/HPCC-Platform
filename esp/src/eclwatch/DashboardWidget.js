define([
    "dojo/_base/declare",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",

    "hpcc/_Widget",

    "hpcc-ts/dashboard",

    "dojo/text!../templates/DashboardWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/ToolbarSeparator"

], function (declare, i18n, nlsHPCC,
    _Widget,
    srcDash,
    template) {
        return declare("DashboardWidget", [_Widget], {
            templateString: template,
            baseClass: "DashboardWidget",
            i18n: nlsHPCC,

            postCreate: function (args) {
                this.inherited(arguments);
            },

            resize: function (args) {
                this.inherited(arguments);
                this.widget.BorderContainer.resize();
                this._dashboard && this._dashboard.safeResize();
            },

            _onRefresh: function (event) {
                this._dashboard
                    .clearData()
                    .render()
                    ;
            },

            //  Implementation  ---
            init: function (params) {
                if (this.inherited(arguments))
                    return;

                this._dashboard = new srcDash.Dashboard()
                    .target(this.id + "DashboardCP")
                    ;
                this.refresh();
            },

            refresh: function (params) {
                this._dashboard.render();
            }
        });
    });
