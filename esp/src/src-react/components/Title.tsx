import * as React from "react";
import { ContextualMenuItemType, DefaultButton, FontIcon, IconButton, IIconProps, Image, IPanelProps, IPersonaSharedProps, IRenderFunction, Link, mergeStyles, mergeStyleSets, Panel, PanelType, Persona, PersonaSize, SearchBox, Stack, Text, useTheme } from "@fluentui/react";
import { Level } from "@hpcc-js/util";
import { useBoolean } from "@fluentui/react-hooks";
import { Toaster } from "react-hot-toast";
import * as cookie from "dojo/cookie";

import * as WsAccount from "src/ws_account";
import nlsHPCC from "src/nlsHPCC";
import * as Utility from "src/Utility";

import { useBanner } from "../hooks/banner";
import { useECLWatchLogger } from "../hooks/logging";
import { useGlobalStore } from "../hooks/store";

import { TitlebarConfig } from "./forms/TitlebarConfig";
import { ComingSoon } from "./controls/ComingSoon";
import { About } from "./About";
import { MyAccount } from "./MyAccount";
import { toasterScale } from "./controls/CustomToaster";

import "./controls/Logo";

const collapseMenuIcon: IIconProps = { iconName: "CollapseMenu" };

const waffleIcon: IIconProps = { iconName: "hpcc-icon" };
const searchboxStyles = { margin: "5px", height: "auto", width: "100%" };

const personaStyles = {
    root: {
        display: "flex",
        alignItems: "center",
        "&:hover": { cursor: "pointer" }
    }
};

interface DevTitleProps {
}

export const DevTitle: React.FunctionComponent<DevTitleProps> = ({
}) => {
    const theme = useTheme();
    const toolbarThemeDefaults = { active: false, text: "", color: theme.palette.themeLight };
    const [logIconColor, setLogIconColor] = React.useState(theme.semanticColors.link);

    const [showAbout, setShowAbout] = React.useState(false);
    const [showMyAccount, setShowMyAccount] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(undefined);
    const [isOpen, { setTrue: openPanel, setFalse: dismissPanel }] = useBoolean(false);

    const [showTitlebarConfig, setShowTitlebarConfig] = React.useState(false);
    const [showEnvironmentTitle] = useGlobalStore("HPCCPlatformWidget_Toolbar_Active", toolbarThemeDefaults.active, true);
    const [environmentTitle] = useGlobalStore("HPCCPlatformWidget_Toolbar_Text", toolbarThemeDefaults.text, true);
    const [titlebarColor] = useGlobalStore("HPCCPlatformWidget_Toolbar_Color", toolbarThemeDefaults.color, true);

    const [showBannerConfig, setShowBannerConfig] = React.useState(false);
    const [BannerMessageBar, BannerConfig] = useBanner({ showForm: showBannerConfig, setShowForm: setShowBannerConfig });

    const personaProps: IPersonaSharedProps = React.useMemo(() => {
        return {
            text: currentUser?.firstName + " " + currentUser?.lastName,
            secondaryText: currentUser?.accountType,
            size: PersonaSize.size32
        };
    }, [currentUser]);

    const iconClass = mergeStyles({
        fontSize: 50,
        height: 32,
        width: 32,
        margin: "0 4px",
    });

    const onRenderNavigationContent: IRenderFunction<IPanelProps> = React.useCallback(
        (props, defaultRender) => (
            <>
                <IconButton iconProps={waffleIcon} onClick={dismissPanel} className={iconClass} />
                <span style={searchboxStyles} />
                {defaultRender!(props)}
            </>
        ),
        [dismissPanel, iconClass],
    );

    const [log, logLastUpdated] = useECLWatchLogger();

    const advMenuProps = React.useMemo(() => {
        return {
            items: [
                { key: "banner", text: nlsHPCC.SetBanner, onClick: () => setShowBannerConfig(true) },
                { key: "toolbar", text: nlsHPCC.SetToolbar, onClick: () => setShowTitlebarConfig(true) },
                { key: "divider_1", itemType: ContextualMenuItemType.Divider },
                { key: "docs", href: "https://hpccsystems.com/training/documentation/", text: nlsHPCC.Documentation, target: "_blank" },
                { key: "downloads", href: "https://hpccsystems.com/download", text: nlsHPCC.Downloads, target: "_blank" },
                { key: "releaseNotes", href: "https://hpccsystems.com/download/release-notes", text: nlsHPCC.ReleaseNotes, target: "_blank" },
                {
                    key: "additionalResources", text: nlsHPCC.AdditionalResources, subMenuProps: {
                        items: [
                            { key: "redBook", href: "https://wiki.hpccsystems.com/display/hpcc/HPCC+Systems+Red+Book", text: nlsHPCC.RedBook, target: "_blank" },
                            { key: "forums", href: "https://hpccsystems.com/bb/", text: nlsHPCC.Forums, target: "_blank" },
                            { key: "issues", href: "https://track.hpccsystems.com/issues/", text: nlsHPCC.IssueReporting, target: "_blank" },
                        ]
                    }
                },
                { key: "divider_2", itemType: ContextualMenuItemType.Divider },
                {
                    key: "lock", text: nlsHPCC.Lock, disabled: !currentUser?.username, onClick: () => {
                        fetch("esp/lock", {
                            method: "post"
                        }).then(() => { window.location.href = "/esp/files/Login.html"; });
                    }
                },
                {
                    key: "logout", text: nlsHPCC.Logout, disabled: !currentUser?.username, onClick: () => {
                        fetch("/esp/logout", {
                            method: "post"
                        }).then(data => {
                            if (data) {
                                cookie("ECLWatchUser", "", { expires: -1 });
                                cookie("ESPSessionID" + location.port + " = '' ", "", { expires: -1 });
                                cookie("Status", "", { expires: -1 });
                                window.location.reload();
                            }
                        });
                    }
                },
                { key: "divider_3", itemType: ContextualMenuItemType.Divider },
                { key: "config", href: "#/topology/configuration", text: nlsHPCC.Configuration },
                { key: "about", text: nlsHPCC.About, onClick: () => setShowAbout(true) }
            ],
            directionalHintFixed: true
        };
    }, [currentUser?.username]);

    const btnStyles = React.useMemo(() => mergeStyleSets({
        errorsWarnings: {
            border: "none",
            background: "transparent",
            minWidth: 48,
            padding: "0 10px 0 4px",
            color: logIconColor
        },
        errorsWarningsCount: {
            margin: "-3px 0 0 -3px"
        }
    }), [logIconColor]);

    React.useEffect(() => {
        switch (log[0]?.level) {
            case Level.alert:
            case Level.critical:
            case Level.emergency:
                setLogIconColor(theme.semanticColors.severeWarningIcon);
                break;
            case Level.error:
                setLogIconColor(theme.semanticColors.errorIcon);
                break;
            case Level.warning:
                setLogIconColor(theme.semanticColors.warningIcon);
                break;
            case Level.info:
            case Level.notice:
            case Level.debug:
            default:
                setLogIconColor(theme.semanticColors.link);
                break;
        }
    }, [log, logLastUpdated, theme]);

    React.useEffect(() => {
        WsAccount.MyAccount({})
            .then(({ MyAccountResponse }) => {
                setCurrentUser(MyAccountResponse);
            })
            ;
    }, [setCurrentUser]);

    return <div style={{ backgroundColor: showEnvironmentTitle && titlebarColor ? titlebarColor : theme.palette.themeLight }}>
        <BannerMessageBar />
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
            <Stack.Item align="center">
                <Stack horizontal>
                    <Stack.Item>
                        {/* <IconButton iconProps={waffleIcon} onClick={openPanel} style={{ width: 48, height: 48, color: theme.palette.themeDarker }} /> */}
                        <DefaultButton onClick={openPanel}>
                            <FontIcon aria-label="OneDrive logo" iconName="hpcc-icon" className={iconClass} />
                        </DefaultButton>
                    </Stack.Item>
                    <Stack.Item align="center">
                        <Link href="#/activities">
                            <Text variant="large" nowrap block >
                                <b title="ECL Watch v9" style={{ color: showEnvironmentTitle && titlebarColor ? Utility.textColor(titlebarColor) : theme.palette.themeDarker }}>
                                    {showEnvironmentTitle && environmentTitle.length ? environmentTitle : "ECL Watch v9"}
                                </b>
                            </Text>
                        </Link>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item align="center">
                <SearchBox onSearch={newValue => { window.location.href = `#/search/${newValue.trim()}`; }} placeholder={nlsHPCC.PlaceholderFindText} styles={{ root: { minWidth: 320 } }} />
            </Stack.Item>
            <Stack.Item align="center" >
                <Stack horizontal>
                    {currentUser?.username &&
                        <Stack.Item styles={personaStyles}>
                            <Persona {...personaProps} onClick={() => setShowMyAccount(true)} />
                        </Stack.Item>
                    }
                    <Stack.Item align="center" >
                        <ComingSoon defaultValue style={{ color: showEnvironmentTitle && titlebarColor ? Utility.textColor(titlebarColor) : theme.palette.themeDarker }} />
                    </Stack.Item>
                    <Stack.Item align="center">
                        <DefaultButton href="#/log" title={nlsHPCC.ErrorWarnings} iconProps={{ iconName: log.length > 0 ? "RingerSolid" : "Ringer" }} className={btnStyles.errorsWarnings}>
                            <span className={btnStyles.errorsWarningsCount}>{`(${log.length})`}</span>
                        </DefaultButton>
                    </Stack.Item>
                    <Stack.Item align="center">
                        <IconButton title={nlsHPCC.Advanced} iconProps={collapseMenuIcon} menuProps={advMenuProps} />
                    </Stack.Item>
                </Stack>
                <Toaster position="top-right" gutter={8 - (90 - toasterScale(90))} containerStyle={{
                    top: toasterScale(57),
                    right: 8 - (180 - toasterScale(180))
                }} />
            </Stack.Item>
        </Stack>
        <Panel type={PanelType.smallFixedNear}
            onRenderNavigationContent={onRenderNavigationContent}
            headerText={nlsHPCC.Apps}
            isLightDismiss
            isOpen={isOpen}
            onDismiss={dismissPanel}
            hasCloseButton={false}
        >
            <DefaultButton text="Kibana" href="https://www.elastic.co/kibana/" target="_blank" onRenderIcon={() => <Image src="https://www.google.com/s2/favicons?domain=www.elastic.co" />} />
            <DefaultButton text="K8s Dashboard" href="https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/" target="_blank" onRenderIcon={() => <Image src="https://www.google.com/s2/favicons?domain=kubernetes.io" />} />
        </Panel>
        <About eclwatchVersion="9" show={showAbout} onClose={() => setShowAbout(false)} ></About>
        <MyAccount currentUser={currentUser} show={showMyAccount} onClose={() => setShowMyAccount(false)}></MyAccount>
        <TitlebarConfig toolbarThemeDefaults={toolbarThemeDefaults} showForm={showTitlebarConfig} setShowForm={setShowTitlebarConfig} />
        <BannerConfig />
    </div>;
};

