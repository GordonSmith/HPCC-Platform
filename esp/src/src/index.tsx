import * as React from "react";
import * as ReactDOM from "react-dom";
import { Frame } from "./react/components/Frame";
import { initSession } from "./Session";
import * as ESPRequest from "./ESPRequest";

import "css!dojo-themes/flat/flat.css";
import "css!hpcc/css/ecl.css";
import "css!hpcc/css/hpcc.css";

declare const dojoConfig: any;

const baseHost = "";
const hashNodes = location.hash.split("#");

dojoConfig.urlInfo = {
    baseHost,
    pathname: location.pathname,
    hash: hashNodes.length >= 2 ? hashNodes[1] : "",
    resourcePath: baseHost + "/esp/files/eclwatch",
    basePath: baseHost + "/esp/files",
    fullPath: location.origin + "/esp/files"
};

function getUserData() {
    return new Promise(function (resolve, reject) {
        ESPRequest.send("ws_account", "MyAccount")
            .then(function (value) {
                resolve(dojoConfig.user = value.MyAccountResponse)
            });
    });
}

initSession();
getUserData();

ReactDOM.render(
    <Frame />,
    document.getElementById("app")
);
