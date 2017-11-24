define([
    "dojo/_base/declare",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",

    "dijit/registry",

    "hpcc/_TabContainerWidget",

    "hpcc-ts/dashboard",

    "dojo/text!../templates/DashboardWidget.html",

    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/ToolbarSeparator"

], function (declare, i18n, nlsHPCC,
    registry,
    _TabContainerWidget,
    srcDash,
    template) {
        return declare("DashboardWidget", [_TabContainerWidget], {
            templateString: template,
            baseClass: "DashboardWidget",
            i18n: nlsHPCC,

            postCreate: function (args) {
                this.inherited(arguments);
                this.dashboardTab = registry.byId(this.id + "_Dashboard");
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
                    .on("click", wub => {
                        var wu = wub.workunit();
                        var tab = this.ensurePane(wu.Wuid, { Wuid: wu.Wuid });
                        this.selectChild(tab);                        
                    })
                    ;
                this.refresh();
            },

            refresh: function (params) {
                this._dashboard.render();
            },

            initTab: function () {
                var currSel = this.getSelectedChild();
                if (currSel && !currSel.initalized) {
                    if (currSel.id === this.dashboardTab.id) {
                    } else {
                        if (!currSel.initalized) {
                            currSel.init(currSel.params);
                        }
                    }
                }
            },

            ensurePane: function (id, params) {
                id = this.createChildTabID(id);
                var retVal = registry.byId(id);
                if (!retVal) {
                    var context = this;
                    retVal = new DelayLoadWidget({
                        id: id,
                        title: params.Wuid,
                        closable: true,
                        delayWidget: "WUDetailsWidget",
                        params: params
                    });
                    this.addChild(retVal, 1);
                }
                return retVal;
            }

        });
    });
