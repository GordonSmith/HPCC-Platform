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
    "dojo/store/Observable",

    "hpcc/ESPRequest"
], function (declare, Observable,
    ESPRequest) {

    var UsersStore = declare([ESPRequest.Store], {
            service: "ws_access",
            action: "Users",
            responseQualifier: "UserResponse.Users.User",
            idProperty: "username",
    });

    var GroupsStore = declare([ESPRequest.Store], {
            service: "ws_access",
            action: "Groups",
            responseQualifier: "GroupResponse.Groups.Group",
            idProperty: "name",
    });

    var PermissionsStore = declare([ESPRequest.Store], {
            service: "ws_access",
            action: "Permissions",
            responseQualifier: "BasednsResponse.Basedns.Basedn",
            idProperty: "name",
    });

    //duplicate of Groups Store for testing
     var CreateMemberOfStore = declare([ESPRequest.Store], {
            service: "ws_access",
            action: "Groups",
            responseQualifier: "GroupResponse.Groups.Group",
            idProperty: "name",
    });


    return {
        Users: function (params) {
            return ESPRequest.send("ws_access", "Users", params);
        },

        UserEdit: function (params) {
            return ESPRequest.send("ws_access", "UserEdit", params);
        },
        
        UserInfoEditInput: function (params) {
            return ESPRequest.send("ws_access", "UserInfoEditInput", params);
        },

        UserInfoEdit: function (params) {
            return ESPRequest.send("ws_access", "UserInfoEdit", params);
        },

        UserResetPassInput: function (params) {
            return ESPRequest.send("ws_access", "UserResetPassInput", params);
        },

        UserResetPass: function (params) {
            return ESPRequest.send("ws_access", "UserResetPass", params);
        },

         CreateUsersStore: function (options) {
            var store = new UsersStore(options);
            return Observable(store);
        },

        CreateMemberOfStore: function (options) {
            var store = new CreateMemberOfStore(options);
            return Observable(store);
        },

        GroupsStore: function (options) {
            var store = new GroupsStore(options);
            return Observable(store);
        },

        PermissionsStore: function (options) {
            var store = new PermissionsStore(options);
            return Observable(store);
        },
    };
});

