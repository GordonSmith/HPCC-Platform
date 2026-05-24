/**
 * CommandBarV9 — drop-in v9 replacement for v8 `<CommandBar items={...} farItems={...} />`.
 *
 * Accepts the same `ICommandBarItemProps[]` shape as v8 CommandBar so consumers
 * only need to flip the import line. Renders v9 `<Toolbar>` with ToolbarButton /
 * ToolbarToggleButton / ToolbarDivider / Menu+MenuItem children.
 *
 * The v8 string-iconName → v9 react-icon mapping is deferred to Phase N: for now
 * we render icons via v8 `<Icon iconName=... />` so the existing initializeIcons()
 * font registration keeps working unchanged.
 *
 * Re-exports `ICommandBarItemProps` and `ContextualMenuItemType` so consumers can
 * fully drop their `@fluentui/react` import in one swap.
 */
import * as React from "react";
import {
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
} from "@fluentui/react-components";
import {
    ArrowClockwise16Regular, ArrowDownload16Regular, ArrowLeft16Regular, ArrowRight16Regular,
    ArrowUpload16Regular, AutoFitWidth20Regular, CheckmarkCircle16Regular, CodeBlock16Regular,
    ContactCard16Regular, Copy16Regular, DataBarVertical16Regular, Delete16Regular,
    Dismiss16Regular, Eye16Regular, LockClosed16Regular, LockOpen16Regular,
    Maximize16Regular, Save16Regular, Settings16Regular, TableLink16Regular,
    TableRegular, TextBulletListRegular, Timeline20Regular, TopSpeed16Regular,
    WindowEdit16Regular, ZoomFit16Regular, ZoomFit20Regular, ZoomIn16Regular, ZoomOut16Regular,
} from "@fluentui/react-icons";

// ─── Local type replacing @fluentui/react ICommandBarItemProps ────────────────
export interface ICommandBarItemProps {
    key: string;
    text?: string;
    title?: string;
    disabled?: boolean;
    className?: string;
    iconProps?: { iconName?: string };
    /** Custom SVG / react-icon element; takes precedence over iconProps.iconName. */
    iconElement?: React.ReactElement;
    iconOnly?: boolean;
    canCheck?: boolean;
    checked?: boolean;
    hidden?: boolean;
    href?: string;
    subMenuProps?: { items: ICommandBarItemProps[] };
    itemType?: number;
    onRender?: (item: any, dismissMenu?: () => void) => React.ReactNode;
    onClick?: (ev?: React.MouseEvent<HTMLElement>, item?: any) => boolean | void;
    role?: string;
}

// ─── v8 icon name → v9 SVG element mapping ───────────────────────────────────
const ICON_MAP: Record<string, React.ReactElement> = {
    AnalyticsView: <DataBarVertical16Regular />,
    BarChartVertical: <DataBarVertical16Regular />,
    BulletedTreeList: <TextBulletListRegular />,
    Cancel: <Dismiss16Regular />,
    ComplianceAudit: <CheckmarkCircle16Regular />,
    Contact: <ContactCard16Regular />,
    Copy: <Copy16Regular />,
    Delete: <Delete16Regular />,
    Download: <ArrowDownload16Regular />,
    FileHTML: <CodeBlock16Regular />,
    FitPage: <ZoomFit16Regular />,
    FitWidth: <AutoFitWidth20Regular />,
    Lock: <LockClosed16Regular />,
    NavigateBack: <ArrowLeft16Regular />,
    NavigateBackMirrored: <ArrowRight16Regular />,
    Refresh: <ArrowClockwise16Regular />,
    Relationship: <TableLink16Regular />,
    Save: <Save16Regular />,
    ScaleVolume: <Maximize16Regular />,
    Settings: <Settings16Regular />,
    SpeedHigh: <TopSpeed16Regular />,
    Table: <TableRegular />,
    TimelineProgress: <Timeline20Regular />,
    Unlock: <LockOpen16Regular />,
    Upload: <ArrowUpload16Regular />,
    View: <Eye16Regular />,
    WindowEdit: <WindowEdit16Regular />,
    ZoomIn: <ZoomIn16Regular />,
    ZoomOut: <ZoomOut16Regular />,
    ZoomToFit: <ZoomFit20Regular />,
};

/**
 * Local replacement for v8 ContextualMenuItemType enum — same numeric values.
 * This lets consumers drop their @fluentui/react import for the item-type constant.
 */
export const ContextualMenuItemType = { Normal: 0, Divider: 1, Header: 2, Section: 3 } as const;

interface CommandBarV9Props {
    items: ICommandBarItemProps[];
    farItems?: ICommandBarItemProps[];
}

function renderIcon(iconName?: string, iconElement?: React.ReactElement): React.ReactElement | undefined {
    if (iconElement) return iconElement;
    if (!iconName) return undefined;
    return ICON_MAP[iconName];
}

function renderSubMenuItem(sub: ICommandBarItemProps): React.ReactNode {
    if (sub.hidden) return null;
    if (sub.itemType === ContextualMenuItemType.Divider) {
        // MenuList separator is not directly available; render a horizontal rule.
        return <div key={sub.key} style={{ height: 1, background: "var(--colorNeutralStroke2)", margin: "4px 0" }} />;
    }
    return <MenuItem
        key={sub.key}
        icon={renderIcon(sub.iconProps?.iconName, sub.iconElement)}
        disabled={sub.disabled}
        onClick={sub.onClick as any}
    >
        {sub.text}
    </MenuItem>;
}

function renderItem(item: ICommandBarItemProps): React.ReactNode {
    if (item.hidden) return null;
    if (item.onRender) {
        return <React.Fragment key={item.key}>{item.onRender(item as any, () => undefined) as any}</React.Fragment>;
    }
    if (item.itemType === ContextualMenuItemType.Divider) {
        return <ToolbarDivider key={item.key} />;
    }
    const icon = renderIcon(item.iconProps?.iconName, item.iconElement);
    const title = item.iconOnly ? item.text : undefined;
    const label = item.iconOnly ? undefined : item.text;

    if (item.subMenuProps) {
        return <Menu key={item.key}>
            <MenuTrigger disableButtonEnhancement>
                <ToolbarButton role="menuitem" icon={icon} disabled={item.disabled} disabledFocusable={item.disabled} title={title}>{label}</ToolbarButton>
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    {item.subMenuProps.items.map(renderSubMenuItem)}
                </MenuList>
            </MenuPopover>
        </Menu>;
    }
    if (item.canCheck) {
        // Render as a ToolbarButton that visually reflects the checked state via
        // the v9 `primary` appearance; ToolbarToggleButton requires parent-managed
        // checkedValues which would change the call-site contract.
        return <ToolbarButton
            key={item.key}
            role="menuitem"
            icon={icon}
            disabled={item.disabled}
            disabledFocusable={item.disabled}
            title={title}
            appearance={item.checked ? "primary" : undefined}
            onClick={item.onClick as any}
        >
            {label}
        </ToolbarButton>;
    }
    if (item.href) {
        return <ToolbarButton
            key={item.key}
            role="menuitem"
            as="a"
            href={item.href}
            icon={icon}
            disabled={item.disabled}
            disabledFocusable={item.disabled}
            title={title}
        >
            {label}
        </ToolbarButton>;
    }
    return <ToolbarButton
        key={item.key}
        role="menuitem"
        icon={icon}
        disabled={item.disabled}
        disabledFocusable={item.disabled}
        title={title}
        onClick={item.onClick as any}
    >
        {label}
    </ToolbarButton>;
}

export const CommandBar: React.FunctionComponent<CommandBarV9Props> = ({ items, farItems }) => {
    // role="menubar" preserves the v8 CommandBar ARIA contract (Playwright tests
    // query getByRole("menubar") / getByRole("menuitem")). v9 Toolbar's default
    // role is "toolbar" which would break those locators.
    return <Toolbar role="menubar" size="small" style={{ display: "flex", alignItems: "center" }}>
        {items.map(renderItem)}
        {farItems && farItems.length > 0 && <div style={{ flex: 1 }} />}
        {farItems?.map(renderItem)}
    </Toolbar>;
};
