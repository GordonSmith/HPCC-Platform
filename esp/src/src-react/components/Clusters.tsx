import * as React from "react";
import { useConst } from "@fluentui/react-hooks";
import { CreateTargetClusterStore } from "src/ESPPreflight";
import nlsHPCC from "src/nlsHPCC";
import { getImageHTML } from "src/Utility";
import { DojoGrid, selector, tree } from "./DojoGrid";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps } from "@fluentui/react";
import { HolyGrail } from "src-react/layouts/HolyGrail";
import { ShortVerticalDivider } from "./Common";

interface ClustersProps {
}

export const Clusters: React.FunctionComponent<ClustersProps> = ({
}) => {

    const [grid, setGrid] = React.useState<any>(undefined);
    const [_selection, setSelection] = React.useState([]);

    const gridStore = useConst(CreateTargetClusterStore({}));
    const gridQuery = useConst({});
    const gridSort = useConst([{ attribute: "Wuid", "descending": true }]);
    const gridColumns = useConst({
        col1: selector({
            width: 20,
            selectorType: "checkbox",
            disabled: function (item) {
                return item.type !== "targetClusterProcess";
            }
        }),
        Configuration: {
            label: nlsHPCC.Configuration,
            renderHeaderCell: function (node) {
                node.innerHTML = getImageHTML("configuration.png", nlsHPCC.Configuration);
            },
            width: 12,
            sortable: false,
            formatter: function (configuration, row) {
                if (configuration === true) {
                    return `<a href='#/machines/${row.Netaddress}/${row.Name}/configuration'>${getImageHTML("configuration.png", nlsHPCC.Configuration)}</a>`;
                }
                return "";
            }
        },
        DaliServer: {
            label: nlsHPCC.Dali,
            renderHeaderCell: function (node) {
                node.innerHTML = getImageHTML("server.png", nlsHPCC.Dali);
            },
            width: 16,
            sortable: false,
            formatter: function (dali) {
                if (dali === true) {
                    return getImageHTML("server.png", nlsHPCC.Dali);
                }
                return "";
            }
        },
        Name: tree({
            formatter: function (name, row) {
                if (row.type === "targetClusterComponent") {
                    name = `<a href='#/machines/${row.Netaddress}/${row.Name}/summary' class='dgrid-row-url'>${name}</a>`;
                }
                return name;
            },
            expand: true,
            label: nlsHPCC.Name,
            collapseOnRefresh: false,
            width: 150,
            shouldExpand: function (clusterProcess) {
                if (clusterProcess.data.type === "targetClusterProcess") {
                    return true;
                }
                return false;
            }
        }),
        Type: {
            formatter: function (type, row) {
                if (row.type === "targetClusterComponent") {
                    return type;
                }
                return "";
            },
            label: nlsHPCC.Type,
            width: 100,
        },
        Netaddress: {
            formatter: function (netaddress, row) {
                if (row.type === "targetClusterComponent") {
                    return `<a href='#/machines/${netaddress}' class='dgrid-row-url'>${netaddress}</a>`;
                }
                return "";
            },
            label: nlsHPCC.NetworkAddress,
            width: 70,
        },
        Node: {
            formatter: function (node, row) {
                if (row.type === "targetClusterComponent") {
                    return `<a href='#/machines/${node}' class='dgrid-row-url'>${node}</a>`;
                }
                return "";
            },
            label: nlsHPCC.Node,
            sortable: false,
            width: 100
        },
        Platform: {
            label: nlsHPCC.Platform,
            sortable: false,
            width: 75
        },
        Directory: {
            label: nlsHPCC.Directory,
            sortable: false,
            width: 200
        },
    });

    const refreshTable = React.useCallback((clearSelection = false) => {
        grid?.set("query", {
            Type: "ROOT",
        });
        if (clearSelection) {
            grid?.clearSelection();
        }
    }, [grid]);

    //  Command Bar  ---
    const buttons = React.useMemo((): ICommandBarItemProps[] => [
        {
            key: "refresh", text: nlsHPCC.Refresh, iconProps: { iconName: "Refresh" },
            onClick: () => refreshTable()
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ], [refreshTable]);

    return <HolyGrail
        header={<CommandBar items={buttons} overflowButtonProps={{}} farItems={[]} />}
        main={<DojoGrid store={gridStore} query={gridQuery} sort={gridSort} columns={gridColumns} setGrid={setGrid} setSelection={setSelection} />
        }
    />;
};
