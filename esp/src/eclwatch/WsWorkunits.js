/*##############################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems®.
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
    "dojo/_base/array",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "dojo/store/Observable",
    "dojo/topic",

    "hpcc/ESPRequest",
    "hpcc-platform-comms"
], function (declare, lang, arrayUtil, i18n, nlsHPCC, Deferred, all, Observable, topic,
    ESPRequest, HPCCComms) {

    var EventScheduleStore = declare([ESPRequest.Store], {
        service: "WsWorkunits",
        action: "WUShowScheduled",
        responseQualifier: "WUShowScheduledResponse.Workunits.ScheduledWU",
        idProperty: "calculatedID",

        preProcessRow: function (row) {
            lang.mixin(row, {
                calculatedID: row.Wuid + row.EventText
            });
        }
    });

    var __super = HPCCComms.WsWorkunits.prototype;
    function WsWorkunits(target) {
        HPCCComms.WsWorkunits.call(this);
    }
    WsWorkunits.prototype = Object.create(__super);
    WsWorkunits.prototype.constructor = WsWorkunits;

    WsWorkunits.prototype.espExceptionHandler = function (e) {
        __super.espExceptionHandler.call(this, e);
        if (lang.exists("Source", e) && !e.request.__skipExceptions) {
            var severity = e.request.__suppressExceptionToaster ? "Info" : "Error";
            var source = "WsWorkunits." + e.action;
            if (lang.exists("Exception", e) && e.Exception.length === 1) {
                switch (source) {
                    case "WsWorkunits.WUInfo":
                        if (e.Exception[0].Code === 20080) {
                            severity = "Info";
                        }
                        break;
                    case "WsWorkunits.WUQuery":
                        if (e.Exception[0].Code === 20081) {
                            severity = "Info";
                        }
                        break;
                    case "WsWorkunits.WUCDebug":
                        if (e.Exception[0].Code === -10) {
                            severity = "Info";
                        }
                        break;
                    case "FileSpray.GetDFUWorkunit":
                        if (e.Exception[0].Code === 20080) {
                            severity = "Info";
                        }
                        break;
                    case "WsDfu.DFUInfo":
                        if (e.Exception[0].Code === 20038) {
                            severity = "Info";
                        }
                        break;
                    case "WsWorkunits.WUUpdate":
                        if (e.Exception[0].Code === 20049) {
                            severity = "Error";
                        }
                        break;
                }
            }
            topic.publish("hpcc/brToaster", {
                Severity: severity,
                Source: source,
                Exceptions: e.Exception
            });
        }
        return true;    //  Supress throw in base class;
    };

    WsWorkunits.prototype.States = {
        0: "unknown",
        1: "compiled",
        2: "running",
        3: "completed",
        4: "aborting",
        5: "aborted",
        6: "blocked",
        7: "submitted",
        8: "wait",
        9: "failed",
        10: "compiling",
        11: "uploading_files",
        12: "debugging",
        13: "debug_running",
        14: "paused",
        999: "not found"
    };

    WsWorkunits.prototype.WUCreate = function (request) {
        return __super.WUCreate.call(this, request).then(function (response) {
            topic.publish("hpcc/ecl_wu_created", {
                wuid: response.Workunit.Wuid
            });
            return response;
        });
    };

    WsWorkunits.prototype.WUQuerysetAliasAction = function (selection, action) {
        var requests = [];
        arrayUtil.forEach(selection, function (item, idx) {
            var request = {
                QuerySetName: item.QuerySetId,
                Action: action,
                "Aliases.QuerySetAliasActionItem.0.Name": item.Name,
                "Aliases.QuerySetAliasActionItem.itemcount": 1
            };
            requests.push(__super.WUQuerySetAliasAction.call(this, request));
        });
        return all(requests);
    };

    WsWorkunits.prototype.WUQuerysetQueryAction= function (selection, action) {
        if (action === "Deactivate") {
            return this.WUQuerysetAliasAction(selection, action);
        }
        var requests = [];
        arrayUtil.forEach(selection, function (item, idx) {
            var request = {
                QuerySetName: item.QuerySetId,
                Action: action,
                "Queries.QuerySetQueryActionItem.0.QueryId": item.Id,
                "Queries.QuerySetQueryActionItem.itemcount": 1
            };
            requests.push(__super.WUQuerySetQueryAction.call(this, request));
        });
        return all(requests);
    };
        
    WsWorkunits.prototype.CreateQuerySetStore = function (options) {
        var store = new QuerySetStore(options);
        return Observable(store);
    };

    WsWorkunits.prototype.WUPublishWorkunit = function (request) {
        return __super.WUPublishWorkunit.call(this, request).then(function (response) {
            if (response.ErrorMesssage) {
                throw response.Exceptions;
            } else {
                dojo.publish("hpcc/brToaster", {
                    Severity: "Message",
                    Source: "WsWorkunits.WUPublishWorkunit",
                    Exceptions: [{ Source: request.Wuid, Message: nlsHPCC.Published + ":  " + response.QueryId }]
                });
                topic.publish("hpcc/ecl_wu_published", {
                    wuid: request.Wuid
                });
            }
            return response;
        }).catch(function (e) {
            topic.publish("hpcc/brToaster", {
                Severity: "Error",
                Source: "WsWorkunits.WUPublishWorkunit",
                Exceptions: e
            });
        });
    };

    WsWorkunits.prototype.WUQuery = function (request) {
        return __super.WUQuery.call(this, request).catch(function (e) {
            var response = {};
            arrayUtil.forEach(e.Exception, function (item, idx) {
                if (item.Code === 20081) {
                    lang.mixin(response, {
                        Workunits: {
                            ECLWorkunit: [{
                                Wuid: request.Wuid,
                                StateID: 999,
                                State: "not found"
                            }]
                        }
                    });
                }
            });
            return response;
        });
    };
    
    WsWorkunits.prototype.WUInfo = function (request) {
        return __super.WUInfo.call(this, request).catch(function (e) {
            var response = {};
            arrayUtil.forEach(e.Exception, function (item, idx) {
                if (item.Code === 20080) {
                    lang.mixin(response, {
                        Workunits: {
                            ECLWorkunit: [{
                                Wuid: request.Wuid,
                                StateID: 999,
                                State: "not found"
                            }]
                        }
                    });
                }
            });
            return response;
        });
    };

    WsWorkunits.prototype.WUAction = function (request) {
        return __super.WUAction.call(this, request).then(function (response) {
            if (lang.exists("ActionResults.WUActionResult", response)) {
                arrayUtil.forEach(response.ActionResults.WUActionResult, function (item, index) {
                    if (item.Result.indexOf("Failed:") === 0) {
                        topic.publish("hpcc/brToaster", {
                            Severity: "Error",
                            Source: "WsWorkunits.WUAction",
                            Exceptions: [{ Source: item.Action + " " + item.Wuid, Message: item.Result }]
                        });
                    }
                });
            }
            return response;
        });
    };

    WsWorkunits.prototype.WUActionEx = function (workunits, actionType, callback) {
        var request = {
            Wuids: arrayUtil.map(workunits, function (item) {
                return item.Wuid;
            }),
            WUActionType: actionType
        };
        return this.WUAction.call(this, request).then(function (response) {
            if (lang.exists("ActionResults.WUActionResult", response)) {
                var wuMap = {};
                arrayUtil.forEach(workunits, function (item, index) {
                    wuMap[item.Wuid] = item;
                });
                arrayUtil.forEach(response.ActionResults.WUActionResult, function (item, index) {
                    if (item.Result.indexOf("Failed:") !== 0) {
                        var wu = wuMap[item.Wuid];
                        if (actionType === "delete" && item.Result === "Success") {
                            wu._updateState({
                                StateID: 999
                            });
                            wu.set("StateID", 999);
                            wu.set("State", "not found");
                        } else if (wu.refresh) {
                            wu.refresh();
                        }
                    }
                });
            }
            if (callback && callback.load) {
                callback.load(response);
            }
        }).catch(function (err) {
            if (callback && callback.error) {
                callback.error(err);
            }
        });
    };

    WsWorkunits.prototype.WUCDebug = function (wuid, command) {
        return __super.WUCDebug.call(this, {
            Wuid: wuid,
            Command: command
        }).then(function (response) {
            console.log(JSON.stringify(response));
            return response;
        });
    };

    //  Stub waiting for HPCC-10308
    WsWorkunits.prototype.visualisations = [
            { value: "DojoD3NDChart COLUMN", label: "Column Chart" },
            { value: "DojoD3NDChart BAR", label: "Bar Chart" },
            { value: "DojoD3NDChart LINE", label: "Line Chart" },
            { value: "DojoD3NDChart AREA", label: "Area Chart" },
            { value: "DojoD3NDChart STEP", label: "Step Chart" },
            { value: "DojoD3NDChart SCATTER", label: "Scatter Chart" },
            { value: "DojoD32DChart BUBBLE", label: "Bubble Chart" },
            { value: "DojoD32DChart PIE", label: "Pie Chart" },
            { value: "DojoD32DChart WORD_CLOUD", label: "Word Cloud" },
            { value: "DojoD3Choropleth COUNTRY", label: "Country Choropleth" },
            { value: "DojoD3Choropleth STATE", label: "US State Choropleth" },
            { value: "DojoD3Choropleth COUNTY", label: "US County Choropleth" }
    ];

    WsWorkunits.prototype.GetVisualisations = function() {
        var deferred = new Deferred();
        if (this.visualisations) {
            deferred.resolve(this.visualisations);
        }
        return deferred.promise;
    };
        
    WsWorkunits.prototype.CreateEventScheduleStore = function (options) {
        var store = new EventScheduleStore(options);
        return Observable(store);
    };

    //  Helpers  ---
    WsWorkunits.prototype.isComplete = function (stateID, actionEx, archived) {
        if (archived) {
            return true;
        }
        switch (stateID) {
            case 1: //WUStateCompiled
                if (actionEx && actionEx == "compile") {
                    return true;
                }
                break;
            case 3: //WUStateCompleted:
            case 4: //WUStateFailed:
            case 5: //WUStateArchived:
            case 7: //WUStateAborted:
            case 999: //WUStateDeleted:
                return true;
        }
        return false;
    };

    var wsWorkunits = new WsWorkunits();
    return wsWorkunits;
});
