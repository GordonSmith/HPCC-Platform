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
    "dojo/_base/array",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/store/util/QueryResults",

    "hpcc/WsTopology",
    "hpcc/ESPUtil"
], function (declare, lang, arrayUtil, Deferred, all, Memory, Observable, QueryResults,
    WsTopology, ESPUtil) {

    var ThorCache = {
    };
    var Thor = declare([ESPUtil.Singleton], {
        constructor: function (args) {
            if (args) {
                declare.safeMixin(this, args);
            }
        },

        refresh: function () {
            var context = this;
            return WsTopology.TpThorStatus({
                request: {
                    Name: this.Name
                }
            }).then(function (response) {
                if (lang.exists("TpThorStatusResponse", response)) {
                    context.updateData(response.TpThorStatusResponse);
                    if (response.TpThorStatusResponse.Graph && response.TpThorStatusResponse.SubGraph) {
                        context.updateData({
                            GraphSummary:  response.TpThorStatusResponse.Graph + "-" + response.TpThorStatusResponse.SubGraph
                        });
                    }
                }
                return response;
            })
        }
    });

    var Store = declare([Memory], {
        idProperty: "__hpcc_id",
        mayHaveChildren: function (item) {
            return item.mayHaveChildren && item.mayHaveChildren();
        },
        getChildren: function (parent, options) {
            return parent.getChildren(options);
        }
    });

    var TopologyItem = declare([ESPUtil.Singleton], {
        constructor: function (args) {
            args.__hpcc_id = (args.__hpcc_parent ? args.__hpcc_parent.__hpcc_id + "::" : "") + args.__hpcc_id;  //  args get set to "this" in base class Stateful ---
            this.children = new Store();
        },

        mayHaveChildren: function () {
            return this.children.data.length;
        },

        getChildren: function (options) {
            return this.children.query({}, options);
        }
    });

    var TpMachine = declare([TopologyItem], {
        constructor: function (args) {
            args.__hpcc_type = "Machine";  //  args get set to "this" in base class Stateful ---
        },

        _NetaddressSetter: function (Netaddress) {
            this.__hpcc_displayName = "[" + this.__hpcc_type + "] " + Netaddress;
        }
    });

    var TpCommon = declare([TopologyItem], {
        _NameSetter: function (Name) {
            this.__hpcc_displayName = "[" + (this.Type ? this.Type : this.__hpcc_type) + "] " + Name;
        },

        _TpMachinesSetter: function (TpMachines) {
            if (lang.exists("TpMachine", TpMachines)) {
                arrayUtil.forEach(TpMachines.TpMachine, function (item, idx) {
                    var tpMachine = new TpMachine({ __hpcc_parent: this, __hpcc_id: item.Netaddress + "::" + item.ProcessNumber });
                    tpMachine.updateData(item);
                    this.children.add(tpMachine);
                }, this);
            }
        }
    });

    var TpEclAgent = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "EclAgent";  //  args get set to "this" in base class Stateful ---
        },
    });

    var TpEclServer = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "EclServer";  //  args get set to "this" in base class Stateful ---
        },
    });

    var TpEclScheduler = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "EclScheduler";  //  args get set to "this" in base class Stateful ---
        },
    });

    var TpCluster = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "Cluster";  //  args get set to "this" in base class Stateful ---
        },
    });

    var Cluster = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "C";  //  args get set to "this" in base class Stateful ---
        }
    });

    var Service = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "S";  //  args get set to "this" in base class Stateful ---
        }
    });

    var ServiceType = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "ST";  //  args get set to "this" in base class Stateful ---
        },

        addService: function (items) {
            arrayUtil.forEach(items, function (item) {
                var child = new Service({ __hpcc_parent: this, __hpcc_id: item.Name });
                child.updateData(item);
                this.children.add(child);
            }, this);
        }
    });

    var Services = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "Ss";  //  args get set to "this" in base class Stateful ---
            args.__hpcc_displayName = "Services";
        },

        _TpDalisSetter: function (TpDalis) {
            if (lang.exists("TpDali", TpDalis)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpDali", __hpcc_displayName: "Dali Servers" });
                serviceType.addService(TpDalis.TpDali);
                this.children.add(serviceType);
            }
        },
        _TpDfuServersSetter: function (TpDfuServers) {
            if (lang.exists("TpDfuServer", TpDfuServers)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpDfuServer", __hpcc_displayName: "DFU Servers" });
                serviceType.addService(TpDfuServers.TpDfuServer);
                this.children.add(serviceType);
            }
        },
        _TpDropZonesSetter: function (TpDropZones) {
            if (lang.exists("TpDropZone", TpDropZones)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpDropZone", __hpcc_displayName: "Drop Zones" });
                serviceType.addService(TpDropZones.TpDropZone);
                this.children.add(serviceType);
            }
        },
        _TpEclAgentsSetter: function (TpEclAgents) {
            if (lang.exists("TpEclAgent", TpEclAgents)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpEclAgent", __hpcc_displayName: "ECl Agents" });
                serviceType.addService(TpEclAgents.TpEclAgent);
                this.children.add(serviceType);
            }
        },
        _TpEclCCServersSetter: function (TpEclCCServers) {
            if (lang.exists("TpEclCCServer", TpEclCCServers)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpEclCCServer", __hpcc_displayName: "EClCC Servers" });
                serviceType.addService(TpEclCCServers.TpEclCCServer);
                this.children.add(serviceType);
            }
        },
        _TpEclSchedulersSetter: function (TpEclSchedulers) {
            if (lang.exists("TpEclScheduler", TpEclSchedulers)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpEclScheduler", __hpcc_displayName: "ECl Schedulers" });
                serviceType.addService(TpEclSchedulers.TpEclScheduler);
                this.children.add(serviceType);
            }
        },
        _TpEspServersSetter: function (TpEspServers) {
            if (lang.exists("TpEspServer", TpEspServers)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpEspServer", __hpcc_displayName: "ESP Servers" });
                serviceType.addService(TpEspServers.TpEspServer);
                this.children.add(serviceType);
            }
        },
        _TpFTSlavesSetter: function (TpFTSlaves) {
            if (lang.exists("TpFTSlave", TpFTSlaves)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpFTSlave", __hpcc_displayName: "FT Slaves" });
                serviceType.addService(TpFTSlaves.TpFTSlave);
                this.children.add(serviceType);
            }
        },
        _TpSashaServersSetter: function (TpSashaServers) {
            if (lang.exists("TpSashaServer", TpSashaServers)) {
                var serviceType = new ServiceType({ __hpcc_parent: this, __hpcc_id: "TpSashaServer", __hpcc_displayName: "Sasha Servers" });
                serviceType.addService(TpSashaServers.TpSashaServer);
                this.children.add(serviceType);
            }
        }
    });

    var TargetCluster = declare([TpCommon], {
        constructor: function (args) {
            args.__hpcc_type = "TC";  //  args get set to "this" in base class Stateful ---
        },

        _TpEclAgentsSetter: function (TpEclAgents) {
            var context = this;
            if (lang.exists("TpEclAgent", TpEclAgents)) {
                arrayUtil.forEach(TpEclAgents.TpEclAgent, function (item, idx) {
                    var tpEclAgent = new TpEclAgent({ __hpcc_parent: this, __hpcc_id: item.Name });
                    tpEclAgent.updateData(item);
                    this.children.add(tpEclAgent);
                }, this);
            }
        },

        _TpEclCCServersSetter: function (TpEclCCServers) {
            if (lang.exists("TpEclServer", TpEclCCServers)) {
                arrayUtil.forEach(TpEclCCServers.TpEclServer, function (item, idx) {
                    var tpEclServer = new TpEclServer({ __hpcc_parent: this, __hpcc_id: item.Name });
                    tpEclServer.updateData(item);
                    this.children.add(tpEclServer);
                }, this);
            }
        },

        _TpEclServersSetter: function (TpEclServers) {
            if (lang.exists("TpEclServer", TpEclServers)) {
                arrayUtil.forEach(TpEclServers.TpEclServer, function (item, idx) {
                    var tpEclServer = new TpEclServer({ __hpcc_parent: this, __hpcc_id: item.Name });
                    tpEclServer.updateData(item);
                    this.children.add(tpEclServer);
                }, this);
            }
        },

        _TpEclSchedulersSetter: function (TpEclSchedulers) {
            if (lang.exists("TpEclScheduler", TpEclSchedulers)) {
                arrayUtil.forEach(TpEclSchedulers.TpEclScheduler, function (item, idx) {
                    var tpEclScheduler = new TpEclScheduler({ __hpcc_parent: this, __hpcc_id: item.Name });
                    tpEclScheduler.updateData(item);
                    this.children.add(tpEclScheduler);
                }, this);
            }
        },

        _TpClustersSetter: function (TpClusters) {
            if (lang.exists("TpCluster", TpClusters)) {
                arrayUtil.forEach(TpClusters.TpCluster, function (item, idx) {
                    var tpCluster = new TpCluster({ __hpcc_parent: this, __hpcc_id: item.Name });
                    tpCluster.updateData(item);
                    this.children.add(tpCluster);
                }, this);
            }
        }
    });

    var Topology = declare([TopologyItem], {
        __hpcc_displayName: "Topology",

        constructor: function () {
            this.store = new Store({ data: [this] });
        },

        getStore: function () {
            return this.store;
        },

        mayHaveChildren: function() {
            return true;
        },

        getChildren: function () {
            var context = this;
            var deferred = WsTopology.TpTargetClusterQuery({
                request: {
                    Type: "ROOT"
                }
            }).then(function (response) {
                var retVal = [];
                if (lang.exists("TpTargetClusterQueryResponse.TpTargetClusters.TpTargetCluster", response)) {
                    arrayUtil.forEach(response.TpTargetClusterQueryResponse.TpTargetClusters.TpTargetCluster, function (item, idx) {
                        var targetCluster = new TargetCluster({ __hpcc_parent: context, __hpcc_id: item.Name });
                        targetCluster.updateData(item);
                        retVal.push(targetCluster);
                    });
                }
                return retVal;
            });
            deferred.total = deferred.then(function (response) {
                return response.length;
            });
            return new QueryResults(deferred);
        },

        refresh: function () {
            var context = this;
            return WsTopology.TpThorStatus({
                request: {
                    Name: this.Name
                }
            }).then(function (response) {
                if (lang.exists("TpThorStatusResponse", response)) {
                    context.updateData(response.TpThorStatusResponse);
                    if (response.TpThorStatusResponse.Graph && response.TpThorStatusResponse.SubGraph) {
                        context.updateData({
                            GraphSummary: response.TpThorStatusResponse.Graph + "-" + response.TpThorStatusResponse.SubGraph
                        });
                    }
                }
                return response;
            })
        }
    });

    return {
        GetThor: function (thorName) {
            if (!ThorCache[thorName]) {
                ThorCache[thorName] = new Thor({
                    Name: thorName
                });
            }
            return ThorCache[thorName];
        },
        Store: Store,

        GetTopology: function () {
            var calls = [];
            return all({
                clusterQuery: WsTopology.TpClusterQuery({
                    request: {
                        Type:"ROOT"
                    }
                }).then(function (response) {
                    var retVal = [];
                    if (lang.exists("TpClusterQueryResponse.TpClusters.TpCluster", response)) {
                        arrayUtil.forEach(response.TpClusterQueryResponse.TpClusters.TpCluster, function (item, idx) {
                            var cluster = new Cluster({ __hpcc_parent: null, __hpcc_id: item.Name });
                            cluster.updateData(item);
                            retVal.push(cluster);
                        });
                    }
                    return retVal;
                }),
                serviceQuery: WsTopology.TpServiceQuery({
                    request: {
                        Type: "ALLSERVICES"
                    }
                }).then(function (response) {
                    var retVal = [];
                    if (lang.exists("TpServiceQueryResponse.ServiceList", response)) {
                        var services = new Services({ __hpcc_parent: null, __hpcc_id: "Services" });
                        services.updateData(response.TpServiceQueryResponse.ServiceList);
                        retVal.push(services);
                    }
                    return retVal;
                }),
                targetClusterQuery: WsTopology.TpTargetClusterQuery({
                    request: {
                        Type: "ROOT"
                    }
                }).then(function (response) {
                    var retVal = [];
                    if (lang.exists("TpTargetClusterQueryResponse.TpTargetClusters.TpTargetCluster", response)) {
                        arrayUtil.forEach(response.TpTargetClusterQueryResponse.TpTargetClusters.TpTargetCluster, function (item, idx) {
                            var targetCluster = new TargetCluster({ __hpcc_parent: null, __hpcc_id: item.Name });
                            targetCluster.updateData(item);
                            retVal.push(targetCluster);
                        });
                    }
                    return retVal;
                })
            }).then(function (responses) {
                return responses.targetClusterQuery.concat(responses.clusterQuery.concat(responses.serviceQuery));
            });
        }
    };
});
