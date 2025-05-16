import { ToggleButton } from "@fluentui/react-components";
import * as React from "react";
import { Hamburger, NavDrawer, NavDrawerBody, NavDrawerHeader, NavDrawerFooter, NavItem, NavDivider } from "@fluentui/react-nav-preview";
import { Tooltip, makeStyles, tokens } from "@fluentui/react-components";
import {
    Home20Filled, Home20Regular, TextGrammarLightning20Filled, TextGrammarLightning20Regular,
    DatabaseWindow20Filled, DatabaseWindow20Regular,
    Globe20Filled, Globe20Regular,
    Organization20Filled, Organization20Regular,
    ShieldBadge20Filled, ShieldBadge20Regular,
    WeatherSunnyRegular, WeatherMoonRegular,
    bundleIcon, FluentIcon
} from "@fluentui/react-icons";
import nlsHPCC from "src/nlsHPCC";
import { containerized, bare_metal } from "src/BuildInfo";
import { navCategory } from "../util/history";
import { MainNav, routes } from "../routes";
import { useUserTheme } from "../hooks/theme";

const useStyles = makeStyles({
    root: {
        overflow: "hidden",
        display: "flex",
        height: "100%"
    },
    nav: {
        maxWidth: "200px",
    },
    navSmall: {
        maxWidth: "52px",
    },
    content: {
        flex: "1",
        padding: "16px",
        display: "grid",
        justifyContent: "flex-start",
        alignItems: "flex-start",
    },
    field: {
        display: "flex",
        marginTop: "4px",
        marginLeft: "8px",
        flexDirection: "column",
        gridRowGap: tokens.spacingVerticalS,
    },
});

interface NavItem {
    name: string;
    href: string;
    icon: FluentIcon;
    key: string;
    value: string;
}

const Home = bundleIcon(Home20Filled, Home20Regular);
const TextGrammarLightning = bundleIcon(TextGrammarLightning20Filled, TextGrammarLightning20Regular);
const DatabaseWindow = bundleIcon(DatabaseWindow20Filled, DatabaseWindow20Regular);
const Globe = bundleIcon(Globe20Filled, Globe20Regular);
const Organization = bundleIcon(Organization20Filled, Organization20Regular);
const ShieldBadge = bundleIcon(ShieldBadge20Filled, ShieldBadge20Regular);

function navLinkGroups(): NavItem[] {
    let links: NavItem[] = [
        {
            name: nlsHPCC.Activities,
            href: "#/activities",
            icon: Home,
            key: "activities",
            value: "activities"
        },
        {
            name: nlsHPCC.ECL,
            href: "#/workunits",
            icon: TextGrammarLightning,
            key: "workunits",
            value: "workunits"
        },
        {
            name: nlsHPCC.Files,
            href: "#/files",
            icon: DatabaseWindow,
            key: "files",
            value: "files"
        },
        {
            name: nlsHPCC.PublishedQueries,
            href: "#/queries",
            icon: Globe,
            key: "queries",
            value: "queries"
        },
        {
            name: nlsHPCC.Topology,
            href: "#/topology",
            icon: Organization,
            key: "topology",
            value: "topology"
        },
        {
            name: nlsHPCC.Operations,
            href: "#/operations",
            icon: ShieldBadge,
            key: "operations",
            value: "operations"
        }
    ];
    if (!containerized) {
        links = links.filter(l => l.key !== "topology");
    }
    if (!bare_metal) {
        links = links.filter(l => l.key !== "operations");
    }
    return links;
}

const _navIdx: { [id: string]: MainNav[] } = {};

function navIdx(id) {
    id = id.split("!")[0];
    if (!_navIdx[id]) {
        _navIdx[id] = [];
    }
    return _navIdx[id];
}

function append(route, path) {
    route.mainNav?.forEach(item => {
        navIdx(path).push(item);
    });
}

routes.forEach((route: any) => {
    if (Array.isArray(route.path)) {
        route.path.forEach(path => {
            append(route, path);
        });
    } else {
        append(route, route.path);
    }
});

function navSelectedKey(hashPath) {
    const rootPath = navIdx(`/${navCategory(hashPath)?.split("/")[1]}`);
    if (rootPath?.length) {
        return rootPath[0];
    }
    return null;
}

interface MainNavigation2Props {
    hashPath: string;
}

export const MainNavigation2: React.FunctionComponent<MainNavigation2Props> = ({
    hashPath
}) => {
    const styles = useStyles();

    const selKey = React.useMemo(() => {
        return navSelectedKey(hashPath);
    }, [hashPath]);

    const [isOpen, setIsOpen] = React.useState(true);

    const { setTheme, isDark } = useUserTheme();

    return (
        <div className={styles.root}>
            <NavDrawer selectedValue={selKey} open={true} type={"inline"} density="medium" className={isOpen ? styles.nav : styles.navSmall} >
                <NavDrawerHeader>
                    {
                        true ? <Tooltip content="Close Navigation" relationship="label">
                            <Hamburger onClick={() => setIsOpen(!isOpen)} />
                        </Tooltip> : <></>
                    }
                </NavDrawerHeader>

                <NavDrawerBody>
                    {
                        navLinkGroups().map((item: NavItem) => (
                            <NavItem key={item.key} href={item.href} icon={<item.icon href={item.href} />} value={item.value} >
                                {isOpen ? item.name : ""}
                            </NavItem>
                        ))
                    }
                    <NavDivider />

                </NavDrawerBody>

                <NavDrawerFooter>
                    <ToggleButton appearance="transparent" icon={isDark ? < WeatherSunnyRegular /> : <WeatherMoonRegular />} style={{ justifyContent: "flex-start", width: "100%" }} onClick={() => {
                        setTheme(isDark ? "light" : "dark");
                        const themeChangeEvent = new CustomEvent("eclwatch-theme-toggle", {
                            detail: { dark: !isDark }
                        });
                        document.dispatchEvent(themeChangeEvent);
                    }} >
                        {isOpen ? nlsHPCC.Theme : ""}
                    </ToggleButton>
                </NavDrawerFooter>
            </NavDrawer>
        </div>
    );
};

