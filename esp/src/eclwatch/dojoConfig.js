var dojoConfig;

function getConfig(env) {
    // dojoRoot is defined if we're running in node (i.e. building)
    var dojoRoot = env.dojoRoot;
    var baseUrl = dojoRoot ? "." : "/esp/files";

    return {
        baseUrl: baseUrl,
        deps: ["hpcc/stub"],
        async: true,

        parseOnLoad: false,
        isDebug: (typeof debugConfig !== "undefined"),
        vizDebug: false,
        selectorEngine: "lite",
        blankGif: "/esp/files/eclwatch/img/blank.gif",
        paths: {
            "hpcc": baseUrl + "/eclwatch",
            "src": baseUrl + "/lib",
            "templates": baseUrl + "/eclwatch/templates",
            "ecl": baseUrl + "/eclwatch/ecl",
            "css": baseUrl + "/loader/css",
            "d3-svg-annotation": "node_modules/d3-svg-annotation/d3-annotation",
            "d3-array": "node_modules/d3-array/build/d3-array",
            "d3-color": "node_modules/d3-color/build/d3-color",
            "d3-collection": "node_modules/d3-collection/build/d3-collection",
            "d3-dispatch": "node_modules/d3-dispatch/build/d3-dispatch",
            "d3-drag": "node_modules/d3-drag/build/d3-drag",
            "d3-ease": "node_modules/d3-ease/build/d3-ease",
            "d3-format": "node_modules/d3-format/build/d3-format",
            "d3-path": "node_modules/d3-path/build/d3-path",
            "d3-interpolate": "node_modules/d3-interpolate/build/d3-interpolate",
            "d3-selection": "node_modules/d3-selection/build/d3-selection",
            "d3-scale": "node_modules/d3-scale/build/d3-scale",
            "d3-shape": "node_modules/d3-shape/build/d3-shape",
            "d3-time": "node_modules/d3-time/build/d3-time",
            "d3-time-format": "node_modules/d3-time-format/build/d3-time-format",
            "d3-timer": "node_modules/d3-timer/build/d3-timer",
            "d3-transition": "node_modules/d3-transition/build/d3-transition",
            "@hpcc-js/api": baseUrl + "/node_modules/@hpcc-js/api/dist/api",
            "@hpcc-js/chart": baseUrl + "/node_modules/@hpcc-js/chart/dist/chart",
            "@hpcc-js/common": baseUrl + "/node_modules/@hpcc-js/common/dist/common",
            "@hpcc-js/comms": baseUrl + "/node_modules/@hpcc-js/comms/dist/comms",
            "@hpcc-js/composite": baseUrl + "/node_modules/@hpcc-js/composite/dist/composite",
            "@hpcc-js/form": baseUrl + "/node_modules/@hpcc-js/form/dist/form",
            "@hpcc-js/graph": baseUrl + "/node_modules/@hpcc-js/graph/dist/graph",
            "@hpcc-js/layout": baseUrl + "/node_modules/@hpcc-js/layout/dist/layout",
            "@hpcc-js/map": baseUrl + "/node_modules/@hpcc-js/map/dist/map",
            "@hpcc-js/other": baseUrl + "/node_modules/@hpcc-js/other/dist/other",
            "@hpcc-js/util": baseUrl + "/node_modules/@hpcc-js/util/dist/util",
            "@hpcc-js/TopoJSON": dojoRoot ? "/esp/files/dist/TopoJSON" : baseUrl + "/node_modules/@hpcc-js/map/TopoJSON",
            "clipboard": baseUrl + "/node_modules/clipboard/dist/clipboard",
            "codemirror": baseUrl + "/node_modules/codemirror",
            "crossfilter": baseUrl + "/crossfilter/crossfilter.min",
            "font-awesome": baseUrl + "/node_modules/@hpcc-js/common/font-awesome",
            "tslib": baseUrl + "/node_modules/tslib/tslib"
        },
        packages: [
            {
                name: 'dojo',
                location: baseUrl + '/node_modules/dojo',
                lib: '.'
            },
            {
                name: 'dijit',
                location: baseUrl + '/node_modules/dijit',
                lib: '.'
            },
            {
                name: 'dojox',
                location: baseUrl + '/node_modules/dojox',
                lib: '.'
            },
            {
                name: 'dojo-themes',
                location: baseUrl + '/node_modules/dojo-themes',
                lib: '.'
            },
            {
                name: 'dgrid',
                location: baseUrl + '/dgrid',
                lib: '.'
            },
            {
                name: 'xstyle',
                location: baseUrl + '/xstyle',
                lib: '.'
            },
            {
                name: 'put-selector',
                location: baseUrl + '/put-selector',
                lib: '.'
            }
        ]
    };
}

// For Webpack, export the config.  This is needed both at build time and on the client at runtime
// for the packed application.
if (typeof module !== 'undefined' && module) {
    module.exports = getConfig;
} else {
    dojoConfig = getConfig({});
}
