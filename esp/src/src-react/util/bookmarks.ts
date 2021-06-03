import { CallbackFunction, Observable } from "@hpcc-js/util";
import { userKeyValStore } from "src/KeyValStore";

const STORE_ID = "bookmark";
interface Bookmark {
    id: string;
    url: string;
}
type BookmarkMap = { [id: string]: Bookmark };
let g_bookmarks: Bookmarks;
export class Bookmarks {

    private _store = userKeyValStore();
    private _observable = new Observable("added", "removed");

    private constructor() {
    }

    static attach(): Bookmarks {
        if (!g_bookmarks) {
            g_bookmarks = new Bookmarks();
        }
        return g_bookmarks;
    }

    private async pull(): Promise<BookmarkMap> {
        return this._store.get(STORE_ID).then(str => {
            try {
                return JSON.parse(str);
            } catch (e) {
                return {};
            }
        });
    }

    private async push(bms: BookmarkMap): Promise<void> {
        return this._store.set(STORE_ID, JSON.stringify(bms));
    }

    async add(id: string, url: string): Promise<void> {
        const bms = await this.pull();
        bms[id] = { id, url };
        await this.push(bms);
        this._observable.dispatchEvent("added", id);
    }

    async remove(id: string): Promise<void> {
        const bms = await this.pull();
        delete bms[id];
        await this.push(bms);
        this._observable.dispatchEvent("removed", id);
    }

    async all(): Promise<BookmarkMap> {
        return await this.pull();
    }

    async ids(): Promise<string[]> {
        return await this.pull().then(bms => Object.keys(bms));
    }

    async urls(): Promise<string[]> {
        return await this.pull().then(bms => Object.values(bms).map(bm => bm.url));
    }

    async url(id: string): Promise<string> {
        const bms = await this.pull();
        return bms[id].url;
    }

    listen(callback: CallbackFunction): () => void {
        const added = this._observable.addObserver("added", callback);
        const removed = this._observable.addObserver("removed", callback);
        return () => {
            added.release();
            removed.release();
        };
    }
}
