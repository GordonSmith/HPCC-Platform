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
import { ContextualMenuItemType, Icon, ICommandBarItemProps } from "@fluentui/react";

export type { ICommandBarItemProps };
export { ContextualMenuItemType };

interface CommandBarV9Props {
    items: ICommandBarItemProps[];
    farItems?: ICommandBarItemProps[];
}

function renderIcon(iconName?: string): React.ReactElement | undefined {
    if (!iconName) return undefined;
    return <Icon iconName={iconName} />;
}

function renderSubMenuItem(sub: ICommandBarItemProps): React.ReactNode {
    if ((sub as any).hidden) return null;
    if (sub.itemType === ContextualMenuItemType.Divider) {
        // MenuList separator is not directly available; render a horizontal rule.
        return <div key={sub.key} style={{ height: 1, background: "var(--colorNeutralStroke2)", margin: "4px 0" }} />;
    }
    return <MenuItem
        key={sub.key}
        icon={renderIcon(sub.iconProps?.iconName)}
        disabled={sub.disabled}
        onClick={sub.onClick as any}
    >
        {sub.text}
    </MenuItem>;
}

function renderItem(item: ICommandBarItemProps): React.ReactNode {
    if ((item as any).hidden) return null;
    if (item.onRender) {
        return <React.Fragment key={item.key}>{item.onRender(item as any, () => undefined) as any}</React.Fragment>;
    }
    if (item.itemType === ContextualMenuItemType.Divider) {
        return <ToolbarDivider key={item.key} />;
    }
    const icon = renderIcon(item.iconProps?.iconName);
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
