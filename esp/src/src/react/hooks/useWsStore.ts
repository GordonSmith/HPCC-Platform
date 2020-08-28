import { useEffect, useState } from "react";
import { userKeyValStore, localKeyValStore, globalKeyValStore } from "../../KeyValStore";

export const useGet = (key: string, filter?: object) => {
    const user_store = userKeyValStore();
    const [responseState, setResponseState] = useState({ data: null, loading: true });
    useEffect(() => {
        setResponseState({ data: null, loading: true });
        user_store.get(key)
            .then(item => (item ? JSON.parse(item) : undefined))
            .then(response => {
                setResponseState({ data: response, loading: false });
            });
    }, [filter]);
    return responseState;
};

export const useLocalStorage = (key: string, param?: string) => {
    const localStorage_store = localKeyValStore();
    const [responseState, setResponseState] = useState({data: null, loading: true });
    useEffect(() => {
        setResponseState({ data: null, loading: true });
        localStorage_store.get(key)
            .then(item => (item ? JSON.parse(item) : undefined))
            .then(response => {
                setResponseState({ data: response, loading: false });
            });
    }, [param]);
    return responseState;
};

export const useGlobalStorage = (key: string, param?: string) => {
    const globalStorage_store = globalKeyValStore();
    const [responseState, setResponseState] = useState({data: null, loading: true });
    useEffect(() => {
        setResponseState({ data: null, loading: true });
        globalStorage_store.get(key)
            .then(item => (item ? item : JSON.parse(item)))
            .then(response => {
                setResponseState({ data: response, loading: false });
            });
    }, []);
    return responseState;
};
