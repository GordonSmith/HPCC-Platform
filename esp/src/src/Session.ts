import * as cookie from "dojo/cookie";
import * as Evented from "dojo/Evented";
import * as lang from "dojo/_base/lang";
import * as xhr from "dojo/request/xhr";
import * as topic from "dojo/topic";

interface LocalStorage {
    on(type, listener);
    emit(type, event);
}
class LocalStorage extends Evented {
    constructor() {
        super();
        if (typeof Storage !== void (0)) {
            window.addEventListener('storage', function (event) {
                //  Triggered by other tab / browser
                switch (event.key) {
                    case "Status":
                        status(event.newValue as STATUS_TYPE);
                        break;
                }
            });
        } else {
            console.log("Browser doesn't support multi-tab communication");
        };
    }
    setItem(key, value) {
        localStorage && localStorage.setItem(key, value);
    }
    removeItem(key) {
        localStorage && localStorage.removeItem(key);
    }
    getItem(key): string {
        return localStorage ? localStorage.getItem(key) : undefined;
    }
    clear() {
        localStorage && localStorage.clear();
    }
}

const g_storage = new LocalStorage();
export function on(id, callback) {
    g_storage.on(id, callback);
}

export type STATUS_TYPE = "Unknown" | "Locked" | "Unlocked" | "login_attempt" | "logged_out";
export function status(): STATUS_TYPE;
export function status(_: STATUS_TYPE): void;
export function status(_?: STATUS_TYPE): STATUS_TYPE | void {
    const status = cookie("Status") || g_storage.getItem("Status");
    if (!arguments.length) {
        switch (status) {
            case "Locked":
            case "Unlocked":
            case "login_attempt":
                return status;
            case "logged_out":
                return status;
            default:
                console.log(`Session:  Unknown status ${status}`);
                return "Unknown";
        }
    } else if (status !== _) {
        if (_ === null) {
            cookie("Status", _, { expires: -1 });
            g_storage.removeItem("Status");
        } else {
            cookie("Status", _);
            g_storage.setItem("Status", _);
            topic.publish("hpcc/session_management_status", {
                status: _
            });
        }
    }
}

export function login(username, password) {
    return xhr("/esp/login", {
        method: "post",
        data: {
            username,
            password
        }
    }).then(function (response) {
        if (response) {
            status("Unlocked");
        }
        return response;
    });
}

export function logout() {
    return xhr("/esp/logout", {
        method: "post"
    }).then(function (response) {
        if (response) {
            status("Locked");
        }
        return response;
    });
}

export function lock() {
    xhr("/esp/lock.json", {
        method: "post",
    }).then(function (response) {
        if (response) {
            status("Locked");
        }
        return response;
    });
}

export function unlock(username, password) {
    xhr("/esp/unlock.json", {
        method: "post",
        data: {
            username,
            password
        }
    }).then(function (response) {
        if (lang.exists("UnlockResponse.Error", response) && response.UnlockResponse.Error === 0) {
            status("Unlocked");
        }
        return response;
    });
}

export function resetTimeout() {
    return xhr("/esp/reset_session_timeout.json", {
        method: "post"
    }).then(function (response) {
        return response;
    });
}
