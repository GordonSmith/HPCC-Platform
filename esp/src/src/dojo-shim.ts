// import * as _debug from "dojo/main";
// const _debug_keys = Object.keys(_debug).sort();
// if (
//     _debug_keys.join(", ") !==
//     "Animation, Color, Deferred, NodeList, Stateful, _Animation, _Line, _Url, __toPixelValue, _blockAsync, _contentHandlers, _defaultEasing, _destroyElement, _docScroll, _escapeString, _extraNames, _fade, _filterQueryResult, _fixIeBiDiScrollLeft, _getBorderExtents, _getContentBox, _getIeDocumentElementOffset, _getMarginBox, _getMarginExtents, _getMarginSize, _getPadBorderExtents, _getPadExtents, _getText, _hasResource, _hitchArgs, _ioAddQueryToUrl, _ioCancelAll, _ioNotifyStart, _ioSetArgs, _ioWatch, _isBodyLtr, _isDocumentOk, _keypress, _mixin, _name, _scopeName, _toArray, _toDom, _xhrObj, addClass, addOnLoad, addOnUnload, addOnWindowUnload, anim, animateProperty, attr, baseUrl, blendColors, body, byId, cache, clearCache, clone, colorFromArray, colorFromHex, colorFromRgb, colorFromString, config, connect, connectPublisher, contentBox, contentHandlers, cookie, coords, create, data, date, declare, delegate, deprecated, destroy, dijit, disconnect, dnd, doc, docScroll, dojox, empty, eval, every, exists, exit, experimental, extend, fadeIn, fadeOut, fieldToObject, filter, fixEvent, fixIeBiDiScrollLeft, forEach, formToJson, formToObject, formToQuery, fromJson, fx, getAttr, getBorderExtents, getComputedStyle, getContentBox, getIeDocumentElementOffset, getL10nName, getMarginBox, getMarginExtents, getMarginSize, getNodeProp, getObject, getPadBorderExtents, getPadExtents, getProp, getStyle, global, hasAttr, hasClass, hitch, html, i18n, indexOf, isAir, isAlien, isAndroid, isArray, isArrayLike, isAsync, isBodyLtr, isBrowser, isChrome, isCopyKey, isDescendant, isFF, isFunction, isIE, isIos, isKhtml, isMac, isMoz, isMozilla, isObject, isOpera, isQuirks, isSafari, isString, isWebKit, isWii, keys, lastIndexOf, locale, map, marginBox, mixin, moduleUrl, mouseButtons, number, objectToQuery, parser, partial, place, position, prop, publish, query, queryToObject, rawXhrPost, rawXhrPut, ready, regexp, removeAttr, removeClass, replace, replaceClass, safeMixin, scopeMap, setAttr, setContentSize, setContext, setMarginBox, setObject, setProp, setSelectable, setStyle, some, stopEvent, store, string, style, subscribe, toDom, toJson, toJsonIndentStr, toPixelValue, toggleClass, touch, trim, unsubscribe, version, when, window, withDoc, withGlobal, xhr, xhrDelete, xhrGet, xhrPost, xhrPut"
// ) {
//     console.error("Debug export mismatch", _debug_keys.join(", "));
// }
export { Animation, Color, Deferred, NodeList, Stateful, _Animation, _Line, _Url, __toPixelValue, _blockAsync, _contentHandlers, _defaultEasing, _destroyElement, _docScroll, _escapeString, _extraNames, _fade, _filterQueryResult, _fixIeBiDiScrollLeft, _getBorderExtents, _getContentBox, _getIeDocumentElementOffset, _getMarginBox, _getMarginExtents, _getMarginSize, _getPadBorderExtents, _getPadExtents, _getText, _hasResource, _hitchArgs, _ioAddQueryToUrl, _ioCancelAll, _ioNotifyStart, _ioSetArgs, _ioWatch, _isBodyLtr, _isDocumentOk, _keypress, _mixin, _name, _scopeName, _toArray, _toDom, _xhrObj, addClass, addOnLoad, addOnUnload, addOnWindowUnload, anim, animateProperty, attr, baseUrl, blendColors, body, byId, cache, clearCache, clone, colorFromArray, colorFromHex, colorFromRgb, colorFromString, config, connect, connectPublisher, contentBox, contentHandlers, cookie, coords, create, data, date, declare, delegate, deprecated, destroy, dijit, disconnect, dnd, doc, docScroll, dojox, empty, eval, every, exists, exit, experimental, extend, fadeIn, fadeOut, fieldToObject, filter, fixEvent, fixIeBiDiScrollLeft, forEach, formToJson, formToObject, formToQuery, fromJson, fx, getAttr, getBorderExtents, getComputedStyle, getContentBox, getIeDocumentElementOffset, getL10nName, getMarginBox, getMarginExtents, getMarginSize, getNodeProp, getObject, getPadBorderExtents, getPadExtents, getProp, getStyle, global, hasAttr, hasClass, hitch, html, i18n, indexOf, isAir, isAlien, isAndroid, isArray, isArrayLike, isAsync, isBodyLtr, isBrowser, isChrome, isCopyKey, isDescendant, isFF, isFunction, isIE, isIos, isKhtml, isMac, isMoz, isMozilla, isObject, isOpera, isQuirks, isSafari, isString, isWebKit, isWii, keys, lastIndexOf, locale, map, marginBox, mixin, moduleUrl, mouseButtons, number, objectToQuery, parser, partial, place, position, prop, publish, query, queryToObject, rawXhrPost, rawXhrPut, ready, regexp, removeAttr, removeClass, replace, replaceClass, safeMixin, scopeMap, setAttr, setContentSize, setContext, setMarginBox, setObject, setProp, setSelectable, setStyle, some, stopEvent, store, string, style, subscribe, toDom, toJson, toJsonIndentStr, toPixelValue, toggleClass, touch, trim, unsubscribe, version, when, window, withDoc, withGlobal, xhr, xhrDelete, xhrGet, xhrPost, xhrPut } from "dojo/main";
export * as arrayUtil from "dojo/_base/array";
export * as lang from "dojo/_base/lang";

export * as has from "dojo/has";
export * as dom from "dojo/dom";
export * as on from "dojo/on";
export * as mouse from "dojo/mouse";
export * as domClass from "dojo/dom-class";
export * as domForm from "dojo/dom-form";
export * as topic from "dojo/topic";
export * as DeferredFull from "dojo/Deferred";
export * as domConstruct from "dojo/dom-construct";
export * as all from "dojo/promise/all";
export * as aspect from "dojo/aspect";
export * as domStyle from "dojo/dom-style";
export * as Evented from "dojo/Evented";
export * as json from "dojo/json";
export * as request from "dojo/request";
export * as script from "dojo/request/script";
export * as iframe from "dojo/request/iframe";

import "dojo/Stateful";
import "dojo/cookie";
import "dojo/html";

export * as Observable from "dojo/store/Observable";
export * as QueryResults from "dojo/store/util/QueryResults";
export * as SimpleQueryEngine from "dojo/store/util/SimpleQueryEngine";

// import * as _debugDijit from "dijit/main";
// const _dijit_keys = Object.keys(_debugDijit).sort();
// if (
//     _dijit_keys.join(", ") !==
//     "BackgroundIframe, CheckedMenuItem, Destroyable, Dialog, DialogUnderlay, DropDownMenu, Fieldset, Menu, MenuItem, MenuSeparator, TitlePane, Toolbar, ToolbarSeparator, Tooltip, TooltipDialog, _AttachMixin, _Contained, _Container, _CssStateMixin, _DialogBase, _DialogMixin, _FocusMixin, _HasDropDown, _KeyNavContainer, _KeyNavMixin, _MasterTooltip, _MenuBase, _OnDijitClickMixin, _TemplatedMixin, _Widget, _WidgetBase, _WidgetsInTemplateMixin, _destroyAll, _getTabNavigable, _isElementShown, _scopeName, _setSelectionRange, byId, byNode, defaultDuration, effectiveTabIndex, findWidgets, focus, form, getEnclosingWidget, getFirstInTabbingOrder, getLastInTabbingOrder, getUniqueId, hasDefaultTabStop, hideTooltip, isFocusable, isTabNavigable, layout, place, popup, registry, selectInputText, showTooltip, typematic"
// ) {
//     console.error("Dijit export mismatch", _dijit_keys.join(", "));
// }
export { BackgroundIframe, CheckedMenuItem, Destroyable, Dialog, DialogUnderlay, DropDownMenu, Fieldset, Menu, MenuItem, MenuSeparator, TitlePane, Toolbar, ToolbarSeparator, Tooltip, TooltipDialog, _AttachMixin, _Contained, _Container, _CssStateMixin, _DialogBase, _DialogMixin, _FocusMixin, _HasDropDown, _KeyNavContainer, _KeyNavMixin, _MasterTooltip, _MenuBase, _OnDijitClickMixin, _TemplatedMixin, _Widget, _WidgetBase, _WidgetsInTemplateMixin, _destroyAll, _getTabNavigable, _isElementShown, _setSelectionRange, byNode, defaultDuration, effectiveTabIndex, findWidgets, focus, form, getEnclosingWidget, getFirstInTabbingOrder, getLastInTabbingOrder, getUniqueId, hasDefaultTabStop, hideTooltip, isFocusable, isTabNavigable, layout, popup, registry, selectInputText, showTooltip, typematic } from "dijit/main";
import "dijit/CheckedMenuItem";
import "dijit/Dialog";
import "dijit/Fieldset";
import "dijit/Menu";
import "dijit/MenuItem";
import "dijit/MenuSeparator";
import "dijit/Toolbar";
import "dijit/ToolbarSeparator";
import "dijit/Tooltip";
import "dijit/TooltipDialog";
import "dijit/form/Button";
import "dijit/form/CheckBox";
import "dijit/form/DropDownButton";
import "dijit/form/NumberSpinner";
import "dijit/form/Form";
import "dijit/form/Select";
import "dijit/form/SimpleTextarea";
import "dijit/form/TextBox";
import "dijit/form/ToggleButton";
import "dijit/layout/BorderContainer";
import "dijit/layout/ContentPane";
import "dijit/layout/StackContainer";
import "dijit/layout/StackController";
import "dijit/layout/TabContainer";

export { } from "dojox/main";
export * as dojoxXmlParser from "dojox/xml/parser";
export * as dojoxHtmlEntities from "dojox/html/entities";

// @ts-expect-error
export * as DGrid from "dgrid/Grid";
// @ts-expect-error
export * as OnDemandGrid from "dgrid/OnDemandGrid";
// @ts-expect-error
export * as StoreMixin from "dgrid/_StoreMixin";
// @ts-expect-error
export * as selector from "dgrid/selector";
// @ts-expect-error
export * as tree from "dgrid/tree";
// @ts-expect-error
export * as editor from "dgrid/editor";
// @ts-expect-error
export * as Keyboard from "dgrid/Keyboard";
// @ts-expect-error
export * as Selection from "dgrid/Selection";

// @ts-expect-error
export * as Pagination from "dgrid/extensions/Pagination";
// @ts-expect-error
export * as ColumnResizer from "dgrid/extensions/ColumnResizer";
// @ts-expect-error
export * as CompoundColumns from "dgrid/extensions/CompoundColumns";
// @ts-expect-error
export * as DijitRegistry from "dgrid/extensions/DijitRegistry";

export * as put from "put-selector/put";

// import "hpcc/JSGraphWidget";
// import "hpcc/TimingTreeMapWidget";
// import "hpcc/TableContainer";
// import "hpcc/TargetSelectWidget";

import "css!dijit-themes/flat/flat.css";
import "css!hpcc/css/ecl.css";
import "css!hpcc/css/hpcc.css";

import "dojo/i18n";
// @ts-expect-error
import * as nlsHPCC from "dojo/i18n!./nls/hpcc";
import nlsHPCCT from "./nls/hpcc";

export default nlsHPCC as typeof nlsHPCCT.root;
