import * as React from "react";
import { Overflow, OverflowItem, SelectTabData, SelectTabEvent, Tab, TabList } from "@fluentui/react-components";
import { parseHash, joinHash } from "../../../util/history";
import { OverflowMenu } from "../OverflowMenu";
import { Count } from "./Count";
import { TabInfo } from "./TabInfo";

export interface OverflowTabListProps {
    tabs: TabInfo[];
    selected: string;
    onTabSelect: (tab: TabInfo) => void;
    hash: string;
    size?: "small" | "medium" | "large";
}

export const OverflowTabList: React.FunctionComponent<OverflowTabListProps> = ({
    tabs,
    selected,
    onTabSelect,
    hash,
    size = "medium"
}) => {

    const state = React.useMemo(() => {
        const hashParts = parseHash(hash);
        delete hashParts.searchParts.fullscreen;
        return joinHash(hashParts);
    }, [hash]);

    const [overflowItems, tabsIndex] = React.useMemo(() => {
        const tabsIndex = {};
        return [tabs.map(tab => {
            tabsIndex[tab.id] = tab;
            if (tab.id === selected) {
                tab.__state = state;
            }
            return <OverflowItem key={tab.id} id={tab.id} priority={tab.id === selected ? 2 : 1}>
                <Tab value={tab.id} icon={tab.icon} disabled={tab.disabled}>{tab.label}<Count value={tab.count} /></Tab>
            </OverflowItem>;
        }), tabsIndex];
    }, [selected, state, tabs]);

    const localTabSelect = React.useCallback((evt: SelectTabEvent, data: SelectTabData) => {
        onTabSelect(tabsIndex[data.value as string]);
    }, [onTabSelect, tabsIndex]);

    return <Overflow minimumVisible={2}>
        <TabList selectedValue={selected} onTabSelect={localTabSelect} size={size}>
            {...overflowItems}
            <OverflowMenu onMenuSelect={onTabSelect} menuItems={tabs} />
        </TabList>
    </Overflow>;
};
