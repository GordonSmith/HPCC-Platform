/*##############################################################################
#    HPCC SYSTEMS software Copyright (C) 2013 HPCC Systems.
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
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/_base/Deferred",
    "dojo/data/ObjectStore",
    "dojo/store/util/QueryResults",
    "dojo/store/Observable",

    //"hpcc/WsPackageMaps",
    "hpcc/ESPUtil"
], function (declare, arrayUtil, lang, Deferred,
    ObjectStore, QueryResults, Observable,
    /*WsPackageMaps,*/ ESPUtil) {

    //var _packageMaps = {};
    var Store = declare(null, {
        idProperty: "Id",

        _watched: {},

        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        getIdentity: function (object) {
            return object[this.idProperty];
        },

        get: function (id) {
            if (!_packageMaps[id]) {
                _packageMaps[id] = new packageMap({
                    Id: id
                });
            }
            return _packageMaps[id];
        },

        query: function (query, options) {
            var request = {};
            lang.mixin(request, options.query);
            if (options.query.target)
                request['Target'] = options.query.target;
            if (options.query.process)
                request['Process'] = options.query.process;
            if (options.query.active)
                request['Active'] = options.query.active;

           /*var results = WsPackageMaps.PackageMapQuery({
                request: request
            });*/

            var deferredResults = new Deferred();
            deferredResults.total = results.then(function (response) {
                if (lang.exists("ListPackagesResponse.NumPackages", response)) {
                    return response.ListPackagesResponse.NumPackages;
                }
                return 0;
            });
            var context = this;
            Deferred.when(results, function (response) {
                var packageMaps = [];
                for (key in context._watched) {
                    context._watched[key].unwatch();
                }
                this._watched = {};
                if (lang.exists("ListPackagesResponse.PackageMapList.PackageListMapData", response)) {
                    arrayUtil.forEach(response.ListPackagesResponse.PackageMapList.PackageListMapData, function (item, index) {
                        var packageMap = context.get(item.Id);
                        packageMap.updateData(item);
                        packageMaps.push(packageMap);
                        context._watched[packageMap.Id] = packageMap.watch("changedCount", function (name, oldValue, newValue) {
                            if (oldValue !== newValue) {
                                context.notify(packageMap, packageMap.Id);
                            }
                        });
                    });
                }
                deferredResults.resolve(packageMaps);
            });

            return QueryResults(deferredResults);
        }
    });

    var packageMap = declare([ESPUtil.Singleton], {
        constructor: function (args) {
            this.inherited(arguments);
            declare.safeMixin(this, args);
            this.packageMap = this;
        }
    });

    return {
        CreatePackageMapQueryObjectStore: function (options) {
            var store = new Store(options);
            store = Observable(store);
            var objStore = new ObjectStore({ objectStore: store });
            return objStore;
        }
    };
});
