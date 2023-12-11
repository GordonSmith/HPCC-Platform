import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps } from "@fluentui/react";
import { scopedLogger } from "@hpcc-js/util";
import nlsHPCC from "src/nlsHPCC";
import { HolyGrail } from "../layouts/HolyGrail";
import { DockPanel, DockPanelItems, ResetableDockPanel } from "../layouts/DockPanel";
import { ShortVerticalDivider } from "./Common";

const logger = scopedLogger("src-react/components/ECLArchive.tsx");

const defaultUIState = {
    hasSelection: false
};

interface ECLArchiveProps {
    wuid: string;
    parentUrl?: string;
    selection?: string;
}

export const ECLArchive: React.FunctionComponent<ECLArchiveProps> = ({
    wuid,
    parentUrl = `/workunits/${wuid}/eclsummary`,
    selection
}) => {
    logger.debug({ wuid, parentUrl, selection });

    const [_uiState, _setUIState] = React.useState({ ...defaultUIState });
    const [fullscreen, setFullscreen] = React.useState<boolean>(false);

    const items = React.useMemo<DockPanelItems>(() => {
        const retVal: DockPanelItems = [
            {
                key: "scopesTable",
                title: "Hello",
                component: <h1>Hello</h1>
            },
            {
                key: "metricGraph",
                title: "and",
                component: <h1>and</h1>,
                location: "split-right",
                ref: "scopesTable"
            },
            {
                key: "welcome",
                title: "Welcome",
                component: <h1>Welcome</h1>,
                location: "split-bottom",
                ref: "scopesTable"
            },
            {
                key: "exclamation",
                title: "!!!!!!!!!",
                component: <h1>!!!!!!!!!</h1>,
                location: "tab-after",
                ref: "welcome"
            }
        ];
        return retVal;
    }, []);

    //  Command Bar  ---
    const buttons = React.useMemo((): ICommandBarItemProps[] => [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => {
            }
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ], []);

    const rightButtons = React.useMemo((): ICommandBarItemProps[] => [
        {
            key: "copy", text: nlsHPCC.CopyToClipboard, disabled: !navigator?.clipboard?.writeText, iconOnly: true, iconProps: { iconName: "Copy" },
            onClick: () => {
            }
        },
        {
            key: "download", text: nlsHPCC.DownloadToCSV, iconOnly: true, iconProps: { iconName: "Download" },
            subMenuProps: {
                items: [{
                    key: "downloadCSV",
                    text: nlsHPCC.DownloadToCSV,
                    iconProps: { iconName: "Table" },
                    onClick: () => {
                    }
                },
                {
                    key: "downloadDOT",
                    text: nlsHPCC.DownloadToDOT,
                    iconProps: { iconName: "Relationship" },
                    onClick: () => {
                    }
                }]
            }
        }, {
            key: "fullscreen", title: nlsHPCC.MaximizeRestore, iconProps: { iconName: fullscreen ? "ChromeRestore" : "FullScreen" },
            onClick: () => setFullscreen(!fullscreen)
        }
    ], [fullscreen]);

    return <HolyGrail fullscreen={fullscreen}
        header={<CommandBar items={buttons} farItems={rightButtons} />}
        main={
            <DockPanel items={items} layout={undefined} layoutChanged={undefined} onDockPanelCreate={function (dockpanel: ResetableDockPanel): void {
            }} />
        }
    />;
};
