import UniversalRouter, { ResolveContext } from "universal-router";
import { parse, pick, stringify } from "query-string";
import { hashSum, scopedLogger } from "@hpcc-js/util";
import { userKeyValStore } from "src/KeyValStore";
import { QuerySortItem } from "src/store/Store";

const logger = scopedLogger("../util/history.ts");

let g_router: UniversalRouter;

export function initialize(routes) {
    if (g_router) {
        console.error("g_router already initialized.");
    }
    g_router = new UniversalRouter(routes);
    return g_router;
}

export function resolve(pathnameOrContext: string | ResolveContext) {
    return g_router.resolve(pathnameOrContext);
}

export interface ParsedSearch {
    [key: string]: string | boolean | number | Array<string | boolean | number>;
}

export interface HistoryLocation {
    pathname: string;
    search: string;
    searchParts: ParsedSearch;
    id: string;
    state?: ParsedSearch
}

export function hasAllSearch(search: string): boolean;
export function hasAllSearch(search: ParsedSearch): boolean;
export function hasAllSearch(search: string | ParsedSearch): boolean {
    if (typeof search === "string") {
        return search[0] === "?";
    }
    return Object.keys(search).length > 0;
}

export function parseAllSearch(_: string): ParsedSearch {
    if (_[0] !== "?") return {};
    return { ...parse(_.substring(1), { parseBooleans: true, parseNumbers: true }) } as ParsedSearch;
}

export function joinAllSearch(search?: ParsedSearch): string {
    if (!search) return "";
    return `?${stringify(search)}`;
}

export function parseHash(hash: string): HistoryLocation {
    if (hash[0] !== "#") {
        return {
            pathname: "/",
            search: "",
            searchParts: {},
            id: hashSum("#/")
        };
    }

    const parts = hash.substring(1).split("?");
    return {
        pathname: parts[0],
        search: parts.length > 1 ? `?${parts[1]}` : "",
        searchParts: parts.length > 1 ? parseAllSearch(`?${parts[1]}`) : {},
        id: hashSum(hash)
    };
}

export function joinHash(hl: HistoryLocation): string {
    return `#${hl.pathname}${joinAllSearch(hl.searchParts)}`;
}

export function parseSearch(_: string): ParsedSearch {
    const parsed = parseAllSearch(_);
    const excludeKeys = ["sortBy", "pageNum", "fullscreen"];
    Object.keys(parsed).forEach(key => {
        if (excludeKeys.includes(key)) {
            delete parsed[key];
        }
    });
    return { ...parsed };
}

export function parseSort(_?: string): QuerySortItem | undefined {
    if (!_) return undefined;
    const filter = parse(pick(_.substring(1), ["sortBy"]));
    let descending = false;
    let sortBy = filter?.sortBy?.toString();
    if (filter?.sortBy?.toString().charAt(0) === "-") {
        descending = true;
        sortBy = filter?.sortBy.toString().substring(1);
    }
    return { attribute: sortBy, descending };
}

export function updateSort(sorted: boolean, descending: boolean, sortBy: string) {
    updateParam("sortBy", sorted ? (descending ? "-" : "") + sortBy : undefined);
}

export function parsePage(_: string): number {
    const filter = parse(pick(_.substring(1), ["pageNum"]));
    const pageNum = filter?.pageNum?.toString() ?? "1";
    return parseInt(pageNum, 10);
}

export function updatePage(pageNum: string) {
    updateParam("pageNum", pageNum);
}

export function parseFullscreen(_: string): boolean {
    const filter = parse(pick(_.substring(1), ["fullscreen"]));
    return filter?.fullscreen !== undefined && filter?.fullscreen !== "false";
}

export function updateFullscreen(fullscreen: boolean) {
    const params = { ...hashHistory.location.searchParts };
    if (fullscreen !== true) {
        delete params["fullscreen"];
    } else {
        params["fullscreen"] = true;
    }
    updateSearch(params);
}

export type ListenerCallback<S extends object = object> = (location: HistoryLocation, action: string) => void;

const globalHistory = globalThis.history;

const STORE_HISTORY_ID = "history";

export function resetHistory() {
    const store = userKeyValStore();
    return store?.delete(STORE_HISTORY_ID);
}

class History<S extends object = object> {

    location: HistoryLocation = {
        pathname: "/",
        search: "",
        searchParts: {},
        id: hashSum("#/")
    };
    state: S = {} as S;
    _store = userKeyValStore();

    constructor() {
        this.location = parseHash(document.location.hash);

        window.addEventListener("hashchange", ev => {
            const prevID = this.location.id;
            this.location = parseHash(document.location.hash);
            if (prevID !== this.location.id) {
                this.state = {} as S;
            }
            this.broadcast("HASHCHANGE");
        });

        window.addEventListener("popstate", ev => {
            logger.debug("popstate: " + document.location + ", state: " + JSON.stringify(ev.state));
            this.state = ev.state;
        });

        this._store.get(STORE_HISTORY_ID).then((str: string) => {
            if (typeof str === "string") {
                const retVal: HistoryLocation[] = JSON.parse(str);
                if (Array.isArray(retVal)) {
                    this._recent = retVal;
                }
            }
        }).catch(err => logger.error(err)).finally(() => {
            this._recent = this._recent === undefined ? [] : this._recent;
        });
    }

    trimRightSlash(str: string): string {
        return str.replace(/\/+$/, "");
    }

    fixHash(hashUrl: string): string {
        if (hashUrl[0] !== "#") {
            return `#${hashUrl}`;
        }
        return hashUrl;
    }

    push(to: { pathname?: string, search?: string }) {
        to.pathname = to.pathname ?? this.location.pathname;
        to.search = to.search ?? this.location.search;
        const newHash = this.fixHash(`${this.trimRightSlash(to.pathname || this.location.pathname)}${to.search || ""}`);
        if (window.location.hash !== newHash) {
            globalHistory.pushState(undefined, "", newHash);
            this.location = parseHash(newHash);
            this.broadcast("PUSH");
        }
    }

    replace(to: { pathname?: string, search?: string }) {
        const newHash = this.fixHash(`${this.trimRightSlash(to.pathname || this.location.pathname)}${to.search || ""}`);
        if (window.location.hash !== newHash) {
            globalHistory.replaceState(globalHistory.state, "", newHash);
            this.location = parseHash(newHash);
            this.broadcast("REPLACE");
        }
    }

    _listenerID = 0;
    _listeners: { [id: number]: ListenerCallback } = {};
    listen(callback: ListenerCallback) {
        const id = ++this._listenerID;
        this._listeners[id] = callback;
        return () => {
            delete this._listeners[id];
        };
    }

    protected _recent;
    recent() {
        return this._recent === undefined ? [] : this._recent;
    }

    updateRecent() {
        if (this._recent !== undefined) {
            this._recent = this._recent?.filter(row => row.id !== this.location.id) || [];
            this._recent.unshift(this.location);
            if (this._recent.length > 10) {
                this._recent.length = 10;
            }
            this._store.set(STORE_HISTORY_ID, JSON.stringify(this._recent)).catch(err => logger.error(err));
        }
    }

    broadcast(action: string) {
        this.updateRecent();
        for (const key in this._listeners) {
            const listener = this._listeners[key];
            listener({ ...this.location, state: { ...globalHistory.state } }, action);
        }
    }
}

export const hashHistory = new History<any>();

export function pushSearch(_: ParsedSearch) {
    hashHistory.push({
        search: joinAllSearch(_)
    });
}

export function updateSearch(_: ParsedSearch) {
    hashHistory.replace({
        search: joinAllSearch(_)
    });
}

export function pushUrl(_: string) {
    hashHistory.push({
        pathname: _
    });
}

export function replaceUrl(_: string, refresh: boolean = false) {
    hashHistory.replace({
        pathname: _
    });
    if (refresh) window.location.reload();
}

export function pushSearchItem(key: string, val?: string | string[] | number | boolean) {
    pushParams({ [key]: val });
}

export function pushSearchItemExact(key: string, val?: string | string[] | number | boolean) {
    pushParams({ [key]: val }, true);
}

function calcParams(search: { [key: string]: string | string[] | number | boolean }, keepEmpty: boolean = false) {
    const params = { ...hashHistory.location.searchParts };
    for (const key in search) {
        const val = search[key];
        //  No empty strings OR "false" booleans...
        if (!keepEmpty && (val === "" || val === false)) {
            delete params[key];
        } else {
            params[key] = val;
        }
    }
    return params;
}

export function pushParams(search: { [key: string]: string | string[] | number | boolean }, keepEmpty: boolean = false) {
    pushSearch(calcParams(search, keepEmpty));
}

export function updateParam(key: string, val?: string | string[] | number | boolean) {
    const params = { ...hashHistory.location.searchParts };
    if (val === undefined) {
        delete params[key];
    } else {
        params[key] = val;
    }
    updateSearch(params);
}

export function updateState(key: string, val?: string | string[] | number | boolean) {
    const state = { ...globalHistory.state };
    if (val === undefined) {
        delete state[key];
    } else {
        state[key] = val;
    }
    globalHistory.replaceState(state, "");
}

export function navCategory(hash: string): string {
    let category = hash.split("/").slice(0, 2).join("/");
    if (category.indexOf("?") > -1) {
        category = category.substring(0, category.indexOf("?"));
    }
    return category;
}