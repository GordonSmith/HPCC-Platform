const fs = require("fs");

let ip = "192.168.99.103";
if (fs.existsSync("./lws.target.txt")) {
    ip = fs.readFileSync("./lws.target.txt").toString().replace("\r\n", "\n").split("\n")[0];
}

let protocol = "http";
let tartgetParts = ip.split("://");
if (tartgetParts.length > 1) {
    protocol = tartgetParts[0];
    ip = tartgetParts[1];
}

let port = "8010";
tartgetParts = ip.split(":");
if (tartgetParts.length > 1) {
    ip = tartgetParts[0];
    port = tartgetParts[1];
}

let path = "";
let portPathParts = port.split("/");
if (portPathParts.length > 1) {
    port = tartgetParts[0];
    path = tartgetParts[1];
}

console.log("Protocol:  " + protocol);
console.log("IP:  " + ip);
console.log("Port:  " + port);
console.log("Path:  " + path);

let rewrite = [
    { from: "/esp/titlebar(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/titlebar$1" },
    { from: "/esp/login", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/login" },
    { from: "/esp/logout", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/logout" },
    { from: "/esp/lock", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/lock" },
    { from: "/esp/reset_session_timeout", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/reset_session_timeout" },
    { from: "/esp/getauthtype", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/getauthtype" },
    { from: "/esp/files/esp/getauthtype", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/getauthtype" },
    { from: "/esp/files/esp/lock", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/lock" },
    { from: "/esp/unlock.json", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/unlock.json" },
    { from: "/esp/files/esp/logout", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/logout" },
    { from: "/ws_elk/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "ws_elk/$1" },
    { from: "/esp/files/esp/reset_session_timeout", to: protocol + "://" + ip + ":" + port + "/" + path + "esp/reset_session_timeout" },
    { from: "/esp/files/node_modules/@hpcc-js/(.*)/dist/index.min.js", to: "/node_modules/@hpcc-js/$1/dist/index.js" },
    { from: "/esp/files/dist/(.*)", to: "/build/dist/$1" },
    { from: "/esp/files/(.*)", to: "/$1" },
    { from: "/ws_elk/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "ws_elk/$1" },
    { from: "/FileSpray/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "FileSpray/$1" },
    { from: "/WsWorkunits/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsWorkunits/$1" },
    { from: "/main", to: protocol + "://" + ip + ":" + port + "/" + path + "main" },
    { from: "/WsECL/(.*)", to: protocol + "://" + ip + ":8002/WsECL/$1" },
    { from: "/WsTopology/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsTopology/$1" },
    { from: "/WsSMC/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsSMC/$1" },
    { from: "/ws_machine/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "ws_machine/$1" },
    { from: "/ws_account/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "ws_account/$1" },
    { from: "/ws_access/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "ws_access/$1" },
    { from: "/WsESDLConfig/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsESDLConfig/$1" },
    { from: "/WsDfu/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsDfu/$1" },
    { from: "/WsDFUXRef/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsDFUXRef/$1" },
    { from: "/WsPackageProcess/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsPackageProcess/$1" },
    { from: "/WsStore/(.*)", to: protocol + "://" + ip + ":" + port + "/" + path + "WsStore/$1" },
    { from: "/(.*)", to: "/$1" }
];
//  Fake Proxy
//  rewrite.forEach(row => row.from = "/xxx" + row.from); 

module.exports = {
    port: 8080,
    rewrite: rewrite
};