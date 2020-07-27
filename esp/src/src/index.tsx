import * as React from "react";
import * as ReactDOM from "react-dom";
import { Frame } from "./react/components/Frame";
import { initSession } from "./Session";
import UniversalRouter, { Routes } from 'universal-router'
import { createHashHistory } from "history";

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
dojoConfig.disableLegacyHashing = true;

initSession();

const routes: Routes = [
    { path: '/', action: () => <Frame widgetClassID="ActivityWidget" /> },
    { path: '/activities', action: () => <Frame widgetClassID="ActivityWidget" /> },
    {
        path: '/workunits',
        children: [
            { path: '', action: () => <Frame widgetClassID="WUQueryWidget" /> },
            { path: '/:Wuid', action: (ctx, params) => <Frame widgetClassID="WUDetailsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/files',
        children: [
            { path: '', action: () => <Frame widgetClassID="DFUQueryWidget" /> },
            { path: '/:File', action: (ctx, params) => <Frame widgetClassID="LFDetailsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/dfuworkunits',
        children: [
            { path: '', action: () => <Frame widgetClassID="GetDFUWorkunitsWidget" /> },
            { path: '/:Wuid', action: (ctx, params) => <Frame widgetClassID="DFUWUDetailsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/xref',
        children: [
            { path: '', action: () => <Frame widgetClassID="XrefQueryWidget" /> },
            { path: '/:XrefTarget', action: (ctx, params) => <Frame widgetClassID="XrefDetailsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/queries',
        children: [
            { path: '', action: () => <Frame widgetClassID="QuerySetQueryWidget" /> },
            { path: '/:Queries', action: (ctx, params) => <Frame widgetClassID="QuerySetDetailsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/security',
        children: [
            { path: '', action: () => <Frame widgetClassID="UserQueryWidget" /> },
            { path: '/:Users', action: (ctx, params) => <Frame widgetClassID="UserDetailsWidget" widgetParams={params} /> }
        ]
    },
    { path: '/(W\\d*-\\d*-?\\d?)', action: (ctx, params) => <Frame widgetClassID="WUDetailsWidget" widgetParams={{ Wuid: params[0] }} /> },
    {
        path: '/search',
        children: [
            { path: '/:searchText', action: (ctx, params) => <Frame widgetClassID="SearchResultsWidget" widgetParams={params} /> }
        ]
    },
    {
        path: '/event',
        children: [
            { path: '', action: () => <Frame widgetClassID="EventScheduleWorkunitWidget" /> },
            { path: '/:Event', action: (ctx, params) => <Frame widgetClassID="WUDetailsWidget" widgetParams={params} /> }
        ]
    },
    { path: '/play', action: () => <Frame widgetClassID="ECLPlaygroundWidget" /> },
    { path: '/landingzone', action: () => <Frame widgetClassID="LZBrowseWidget" /> },
    { path: '/packagemaps', action: () => <Frame widgetClassID="PackageMapQueryWidget" /> },
    { path: '/topology', action: () => <Frame widgetClassID="TopologyWidget" /> },
    { path: '/diskusage', action: () => <Frame widgetClassID="DiskUsageWidget" /> },
    { path: '/clusters', action: () => <Frame widgetClassID="TargetClustersQueryWidget" /> },
    { path: '/processes', action: () => <Frame widgetClassID="CluserProcessesQueryWidget" /> },
    { path: '/servers', action: () => <Frame widgetClassID="SystemServersQueryWidget" /> },
    { path: '/monitoring', action: () => <Frame widgetClassID="MonitoringWidget" /> },
    { path: '/esdl', action: () => <Frame widgetClassID="DynamicESDLQueryWidget" /> },
    { path: '/elk', action: () => <Frame widgetClassID="IFrameWidget&src=http%3A%2F%2F10.240.61.210%3A5601%2Fapp%2Fkibana%23%2Fdashboard%2FMetricbeat-system-overview-ecs%3F_g%3D(refreshInterval%253A(pause%253A!t%252Cvalue%253A300000)%252Ctime%253A(from%253Anow%252Fd%252Cto%253Anow%252Fd))&__filter=isTrusted%3Dfalse%26screenX%3D0%26screenY%3D0%26clientX%3D0%26clientY%3D0%26ctrlKey%3Dfalse%26shiftKey%3Dfalse%26altKey%3Dfalse%26metaKey%3Dfalse%26button%3D0%26buttons%3D0%26pageX%3D0%26pageY%3D0%26x%3D0%26y%3D0%26offsetX%3D0%26offsetY%3D0%26movementX%3D0%26movementY%3D0%26toElement%3D%255Bobject%2520HTMLInputElement%255D%26layerX%3D-1280%26layerY%3D9994%26getModifierState%3Dfunction%2520getModifierState()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26initMouseEvent%3Dfunction%2520initMouseEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26view%3D%255Bobject%2520Window%255D%26detail%3D0%26which%3D1%26initUIEvent%3Dfunction%2520initUIEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26NONE%3D0%26CAPTURING_PHASE%3D1%26AT_TARGET%3D2%26BUBBLING_PHASE%3D3%26type%3Dclick%26target%3D%255Bobject%2520HTMLInputElement%255D%26currentTarget%3D%255Bobject%2520HTMLInputElement%255D%26eventPhase%3D2%26bubbles%3Dtrue%26cancelable%3Dtrue%26defaultPrevented%3Dfalse%26composed%3Dtrue%26timeStamp%3D265185.10500000045%26srcElement%3D%255Bobject%2520HTMLInputElement%255D%26returnValue%3Dtrue%26cancelBubble%3Dfalse%26path%3D%255Bobject%2520HTMLInputElement%255D%26path%3D%255Bobject%2520HTMLSpanElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLBodyElement%255D%26path%3D%255Bobject%2520HTMLHtmlElement%255D%26path%3D%255Bobject%2520HTMLDocument%255D%26path%3D%255Bobject%2520Window%255D%26composedPath%3Dfunction%2520composedPath()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26stopPropagation%3Dfunction%2520stopPropagation()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26stopImmediatePropagation%3Dfunction%2520stopImmediatePropagation()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26preventDefault%3Dfunction%2520preventDefault()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26initEvent%3Dfunction%2520initEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D" /> }
]

const router = new UniversalRouter(routes)

const history = createHashHistory();

const render = async (location) => {
    console.log(location);
    const element = await router.resolve(location);
    if (element) {
        ReactDOM.render(
            element,
            document.getElementById('app'),
        );
    }
};

// Listening for the history changes to the current location
history.listen(({ location, action }) => {
    console.log(action, location.pathname, location.state);
    render(location);
});

render(history.location);
