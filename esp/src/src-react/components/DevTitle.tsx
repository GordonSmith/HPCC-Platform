import * as React from "react";
import { DefaultPalette, Icon, ILinkStyles, Image, Link, SearchBox, Stack } from "@fluentui/react";
import { ToggleButton } from "@fluentui/react-button";

import nlsHPCC from "src/nlsHPCC";

import "srcReact/components/DevTitle.css";

const linkStyles: ILinkStyles = {
    root: {}
};

interface DevTitleProps {
    onDebugMenu: (_: boolean) => void;
}

export const DevTitle: React.FunctionComponent<DevTitleProps> = ({
    onDebugMenu
}) => {

    const [mainPage, setMainPage] = React.useState("Main");
    const [debugMenu, _setDebugMenu] = React.useState(true);

    const setDebugMenu = _ => {
        _setDebugMenu(_);
        onDebugMenu(_);
    };

    return <>
        <Stack tokens={{ padding: 9, childrenGap: 9 }} styles={{ root: { background: DefaultPalette.themePrimary } }}>
            <Stack horizontal disableShrink horizontalAlign="space-between">
                <Stack horizontal tokens={{ childrenGap: 18 }}>
                    <Link href="#/activities" onClick={() => setMainPage("Main")}><Image src="/esp/files/eclwatch/img/hpcc_systems_logo.png" /></Link>
                    <Link href="#/workunits" onClick={() => setMainPage("ECL")}><Image src="/esp/files/eclwatch/img/WUCog.png" /></Link>
                    <Link href="#/files" onClick={() => setMainPage("Files")}><Image src="/esp/files/eclwatch/img/LandingZone.png" /></Link>
                    <Link href="#/queries" onClick={() => setMainPage("Roxie")}><Image src="/esp/files/eclwatch/img/Targets.png" /></Link>
                </Stack>
                <Stack.Item>
                    <SearchBox onSearch={newValue => { window.location.href = `#/search/${newValue.trim()}`; }} placeholder={nlsHPCC.PlaceholderFindText} styles={{ root: { minWidth: 320 } }} />
                </Stack.Item>
                <Stack horizontal tokens={{ childrenGap: 18 }} >
                    <Stack.Item align="center" className="titleLink">
                        <Link href="/esp/files/stub.htm">Legacy ECL Watch</Link>
                    </Stack.Item>
                </Stack>
            </Stack>
        </Stack>
        <Stack horizontal tokens={{ padding: 4, childrenGap: 9 }} styles={{ root: { background: DefaultPalette.themeLighter, } }} >
            <ToggleButton checked={debugMenu} onClick={() => setDebugMenu(!debugMenu)} iconOnly ghost icon={<Icon iconName="Bug" styles={{ root: { colorXXX: debugMenu ? DefaultPalette.black : DefaultPalette.white } }} />} />
            {mainPage === "Main" && <>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/activities" styles={linkStyles}>{nlsHPCC.Activity}</Link>
                </Stack.Item>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/events" styles={linkStyles}>{nlsHPCC.EventScheduler}</Link>
                </Stack.Item>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/search" styles={linkStyles}>{nlsHPCC.SearchResults}</Link>
                </Stack.Item>
            </>}
            {mainPage === "ECL" && <>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/workunits" styles={linkStyles}>{nlsHPCC.Workunits}</Link>
                </Stack.Item>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/play" styles={linkStyles}>{nlsHPCC.Playground}</Link>
                </Stack.Item>
            </>}
            {mainPage === "Files" && <>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/files" styles={linkStyles}>{nlsHPCC.LogicalFiles}</Link>
                </Stack.Item>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/dfuworkunits" styles={linkStyles}>{nlsHPCC.Workunits}</Link>
                </Stack.Item>
            </>}
            {mainPage === "Roxie" && <>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/queries" styles={linkStyles}>{nlsHPCC.Queries}</Link>
                </Stack.Item>
                <Stack.Item align="center" className="titleLink2">
                    <Link href="#/packagemaps" styles={linkStyles}>{nlsHPCC.PackageMaps}</Link>
                </Stack.Item>
            </>}
        </Stack>
    </>;

    // return <Stack tokens={{ childrenGap: 4, padding: 4 }} styles={{ root: { background: DefaultPalette.themePrimary, } }} >
    //     <Stack horizontal tokens={primaryStackTokens}>
    //         <Button onClick={() => setMainPage("Main")}>ECL Watch</Button>
    //         <Button onClick={() => setMainPage("ECL")}>{nlsHPCC.ECL}</Button>
    //         <Button onClick={() => setMainPage("Files")}>{nlsHPCC.Files}</Button>
    //         <Button onClick={() => setMainPage("Roxie")}>{nlsHPCC.PublishedQueries}</Button>
    //         <Button onClick={() => setMainPage("Ops")}>{nlsHPCC.Operations}</Button>
    //     </Stack>
    // </Stack >;
};
