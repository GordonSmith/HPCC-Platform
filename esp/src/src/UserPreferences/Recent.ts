import { hashSum } from "@hpcc-js/util";
import { userKeyValStore } from "../KeyValStore";

export function addToStack(key: string, data: any, expectedLength?: number, removeDuplicates?: boolean) {
    const ws_store = userKeyValStore();
    let finalData;
    return new Promise(function (resolve, reject) {
        ws_store.get(key)
            .then(response => {
                if (!response) {
                    ws_store.set(key, JSON.stringify([data]));
                    resolve(finalData = JSON.stringify([data]));
                } else {
                    const encodedData = JSON.parse(response);
                    if (removeDuplicates && hashSum(encodedData[0]) !== hashSum(data)) {
                        if (encodedData?.length >= expectedLength) {
                            encodedData.pop();
                            encodedData.unshift(data);
                            ws_store.set(key, JSON.stringify(encodedData));
                            resolve(finalData = JSON.stringify([data]));
                        } else if (encodedData.length >= 1) {
                            encodedData.unshift(data);
                            ws_store.set(key, JSON.stringify(encodedData));
                            resolve(finalData = JSON.stringify([data]));
                        }
                    }
                }
            });
        return finalData;
    });
}
