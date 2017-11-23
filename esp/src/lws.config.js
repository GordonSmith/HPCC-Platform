const debugServerIP = "192.168.3.22";
module.exports = {
    port: 8080,
    rewrite: [
        {
            from: "/esp/files/dist/*",
            to: "/build/dist/$1"
        },
        {
            from: "/esp/files/*",
            to: "/$1"
        },
        {
            from: "/WsWorkunits/*",
            to: "http://" + debugServerIP + ":8010/WsWorkunits/$1"
        },
        {
            from: "/main",
            to: "http://" + debugServerIP + ":8010/main"
        },
        {
            from: "/WsECL/*",
            to: "http://" + debugServerIP + ":8002/WsECL/$1"
        },
        {
            from: "/WsTopology/*",
            to: "http://" + debugServerIP + ":8010/WsTopology/$1"
        },
        {
            from: "/WsSMC/*",
            to: "http://" + debugServerIP + ":8010/WsSMC/$1"
        },
        {
            from: "/ws_machine/*",
            to: "http://" + debugServerIP + ":8010/ws_machine/$1"
        },
        {
            from: "/ws_account/*",
            to: "http://" + debugServerIP + ":8010/ws_account/$1"
        },
        {
            from: "/ws_access/*",
            to: "http://" + debugServerIP + ":8010/ws_access/$1"
        }
    ]
}
