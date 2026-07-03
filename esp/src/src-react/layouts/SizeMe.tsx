import * as React from "react";

export interface Size {
    width: number;
    height: number;
}

interface SizeMeProps {
    hidden?: boolean;
    children: ({ size }: { size: Size }) => React.ReactNode;
}

export const SizeMe: React.FunctionComponent<SizeMeProps> = ({
    hidden = false,
    children
}) => {
    const [size, setSize] = React.useState<Size>({ width: 1, height: 1 });
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                const { width, height } = entries[0].contentRect;
                if (!isNaN(width) && !isNaN(height)) {
                    setSize({ width, height });
                }
            });
            resizeObserver.observe(containerRef.current);

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, []);

    return <div ref={containerRef} style={{ width: "100%", height: hidden ? "1px" : "100%", display: hidden ? "none" : undefined, position: "relative" }}>
        {children({ size })}
    </div>;
};

export interface AutoSizeMeProps {
    children: React.ReactNode;
    setSize?: (size: Size) => void;
}

export const AutoSizeMe: React.FunctionComponent<AutoSizeMeProps> = ({
    children,
    setSize
}) => {

    return <SizeMe>{({ size }) => {
        if (setSize) {
            setSize(size);
        }
        return <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div style={{ position: "absolute", width: "100%", height: `${size.height}px` }}>
                {children}
            </div>
        </div>;
    }}</SizeMe>;
};


