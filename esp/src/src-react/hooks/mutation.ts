
import * as React from "react";
import type { MutableRefObject } from "react";

const defaults: MutationObserverInit = {
    attributeFilter: undefined,
    attributeOldValue: undefined,
    attributes: undefined,
    characterData: undefined,
    characterDataOldValue: undefined,
    childList: undefined,
    subtree: undefined
};

export function useMutationObserver(ref: MutableRefObject<HTMLElement | null>, callback: MutationCallback, options: MutationObserverInit = defaults): void {
    React.useEffect(() => {
        if (ref?.current) {
            const observer = new MutationObserver(callback);
            observer.observe(ref?.current, options);
            return () => {
                observer.disconnect();
            };
        }
    }, [callback, options, ref]);
}

export function useResizeObserverXXX(ref: MutableRefObject<HTMLElement | null>): [number, number] {

    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);

    useMutationObserver(ref, (mutations: MutationRecord[], observer: MutationObserver) => {
        const { width, height } = ref?.current?.getBoundingClientRect();
        setWidth(width);
        setHeight(height);
    }, {
        attributes: true,
        attributeOldValue: true,
        subtree: true
    });

    return [width, height];
}

export function useResizeObserver(ref: MutableRefObject<HTMLElement | null>): [number, number] {

    const [width, setWidth] = React.useState(0);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        const element = ref?.current;
        const ro = new ResizeObserver(entries => {
            if (entries.length) {
                setWidth(entries[0].contentRect.width);
                setHeight(entries[0].contentRect.height);
            }
        });
        ro.observe(element);
        return () => {
            ro.unobserve(element);
            ro.disconnect();
        };
    }, [ref]);

    return [width, height];
}