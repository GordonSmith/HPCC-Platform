import * as React from "react";
import { deepEquals, verboseDeepEquals } from "@hpcc-js/util";

function useDeepCompareMemoize<T>(value: T, verbose: boolean) {
    const ref = React.useRef<T>(value);
    const signalRef = React.useRef<number>(0);

    const equals = verbose ? verboseDeepEquals(value, ref.current, true) : deepEquals(value, ref.current, true);
    if (!equals) {
        ref.current = value;
        signalRef.current += 1;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useMemo(() => ref.current, [signalRef.current]);
}

type UseEffectParams = Parameters<typeof React.useEffect>
type EffectCallback = UseEffectParams[0]
type DependencyList = UseEffectParams[1]
type UseEffectReturn = ReturnType<typeof React.useEffect>

export function useDeepEffect(callback: EffectCallback, dependencies: DependencyList, deepDependencies: DependencyList, verbose = false): UseEffectReturn {

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useEffect(callback, [...dependencies, ...useDeepCompareMemoize(deepDependencies, verbose)]);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function useDeepCallback<T extends Function>(callback: T, dependencies: DependencyList, deepDependencies: DependencyList, verbose = false): T {

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useCallback<T>(callback, [...dependencies, ...useDeepCompareMemoize(deepDependencies, verbose)]);
}

export function useDeepMemo<T>(memo: () => T, dependencies: DependencyList, deepDependencies: DependencyList, verbose = false): T {

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useMemo<T>(memo, [...dependencies, ...useDeepCompareMemoize(deepDependencies, verbose)]);
}
