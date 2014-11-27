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
    "dojo/on",

    "dijit/registry",
    "dijit/form/Button",
    "dijit/ToolbarSeparator",
    "dijit/layout/ContentPane",

    "dgrid/selector",
    "dgrid/tree",

    "hpcc/GridDetailsWidget",
    "hpcc/ESPRequest",
    "hpcc/ESPTopology",
    "hpcc/LogWidget",
    "hpcc/DelayLoadWidget",
    "hpcc/ESPUtil"

], function (declare, lang, i18n, nlsHPCC, arrayUtil, on,
                registry, Button, ToolbarSeparator, ContentPane,
                selector, tree,
                GridDetailsWidget, ESPRequest, ESPTopology, LogWidget, DelayLoadWidget, ESPUtil) {
    return declare("TopologyWidget", [GridDetailsWidget], {

        i18n: nlsHPCC,
        gridTitle: nlsHPCC.title_Topology,
        idProperty: "__hpcc_id",

        postCreate: function (args) {
            this.inherited(arguments);
            this.logsWidget = new LogWidget({
                id: this.id + "Logs",
                region: "right",
                splitter: true,
                style: "width: 66%",
                minSize: 240
            });
            this.logsWidget.placeAt(this.gridTab, "last");
        },

        init: function (params) {
            if (this.inherited(arguments))
                return;

            this.refreshGrid();
        },

        createGrid: function (domID) {
            var context = this;
            this.store = new ESPTopology.Store();
            var retVal = new declare([ESPUtil.Grid(false, true)])({
                store: this.store,
                columns: {
                    __hpcc_displayName: tree({
                        label: this.i18n.Topology,
                        //width: 270,
                        sortable: true
                    })
                }
            }, domID);
            return retVal;
        },

        createDetail: function (id, row, params) {
            return null;
        },

        refreshGrid: function (args) {
            var context = this;
            ESPTopology.GetTopology().then(function (respsone) {
                context.store.setData(respsone);
                context.grid.refresh();
            });
        }
    });
});
