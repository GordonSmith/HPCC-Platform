import { CallbackFunction, Observable } from "@hpcc-js/util";
import { userKeyValStore } from "src/KeyValStore";

const STORE_ID = "favorites";
const STORE_CACHE_TIMEOUT = 5000;

type StringArray = string[];
let g_favorites: Favorites;

export class Favorites {

    private _store = userKeyValStore();
    private _observable = new Observable("added", "removed");

    private constructor() {
    }

    static attach(): Favorites {
        if (!g_favorites) {
            g_favorites = new Favorites();
        }
        return g_favorites;
    }

    private _prevPull: Promise<StringArray>;
    private async pull(): Promise<StringArray> {
        if (!this._prevPull) {
            this._prevPull = this._store.get(STORE_ID).then(str => {
                if (typeof str !== "string") return [];
                try {
                    return JSON.parse(str);
                } catch (e) {
                    return [];
                }
            });
            setTimeout(() => delete this._prevPull, STORE_CACHE_TIMEOUT);
        }
        return this._prevPull;
    }

    private async push(favs: StringArray): Promise<void> {
        this._prevPull = Promise.resolve(favs);
        return this._store.set(STORE_ID, JSON.stringify(favs));
    }

    async has(url: string): Promise<boolean> {
        const favs = await this.pull();
        return favs.indexOf(url) >= 0;
    }

    async add(url: string): Promise<void> {
        const favs = await this.pull();
        if (favs.indexOf(url) < 0) {
            favs.push(url);
        }
        this.push(favs);
        this._observable.dispatchEvent("added", url);
    }

    async remove(url: string): Promise<void> {
        let favs = await this.pull();
        favs = favs.filter(row => row !== url);
        this.push(favs);
        this._observable.dispatchEvent("removed", url);
    }

    async all(): Promise<StringArray> {
        return await this.pull();
    }

    listen(callback: CallbackFunction): () => void {
        const added = this._observable.addObserver("added", val => callback("added", val));
        const removed = this._observable.addObserver("removed", val => callback("removed", val));
        return () => {
            added.release();
            removed.release();
        };
    }
}
