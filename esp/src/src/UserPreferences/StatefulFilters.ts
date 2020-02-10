import { userKeyValStore } from "../KeyValStore";

const ws_store = userKeyValStore();

export function addFilterToStore(key, object) {
    ws_store.set(key, object)
}

export function addToStack(key, object) {

}




