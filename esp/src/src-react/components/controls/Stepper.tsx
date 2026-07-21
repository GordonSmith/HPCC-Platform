import * as React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";

const useStepStyles = makeStyles({
    wrapper: {
        display: "flex",
        flexDirection: "row",
        position: "relative",
        alignItems: "center",
        padding: "3px 8px",
        marginLeft: "1px",
        border: `1px solid ${tokens.colorNeutralForegroundDisabled}`,
        borderRadius: "5px"
    },
    svg: {
        color: tokens.colorNeutralForeground1,
        fill: "currentColor",
        width: "1em",
        height: "1em",
        fontSize: "1.5rem",
        marginRight: "3px",
        "& text": { color: tokens.colorNeutralBackground1 }
    },
    failed: { color: `${tokens.colorPaletteRedForeground1} !important` },
    completed: {
        color: tokens.colorBrandBackground,
        "& circle": { color: tokens.colorNeutralBackground1 }
    },
    label: {
        fontSize: "0.875rem",
        fontWeight: 500,
        fontFamily: "'Segoe UI', 'Segoe UI Web (West European)', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
    },
    timing: {
        marginLeft: "6px",
        fontSize: "0.75rem",
    },
    connector: {
        height: "2px",
        width: "14px",
        backgroundColor: tokens.colorNeutralForegroundDisabled,
        position: "relative",
        "::after": {
            content: '""',
            position: "absolute",
            right: "-1px",
            top: "-5px",
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: `6px solid ${tokens.colorNeutralForegroundDisabled}`,
        }
    }
});

const useStepperStyles = makeStyles({
    wrapper: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        marginLeft: "auto",
        padding: "0 8px 8px 0",
        "@container (max-width: 900px)": {
            margin: "4px 0 0 10px"
        }
    },
});

export interface StepProps {
    label?: string;
    completed?: boolean;
    failed?: boolean;
    step?: number;
    timing?: string;
    showConnector?: boolean;
}

const Step: React.FunctionComponent<StepProps> = ({
    label = "",
    completed = false,
    failed = false,
    step = 1,
    timing = "",
    showConnector = false
}) => {

    const stepStyles = useStepStyles();

    return <>
        {showConnector ? <div className={stepStyles.connector}></div> : ""}
        <div className={stepStyles.wrapper}>
            {failed ?
                <svg className={[stepStyles.svg, stepStyles.failed].join(" ")} viewBox={"0 0 24 24"}>
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
                </svg> :
                completed ?
                    <svg className={[stepStyles.svg, stepStyles.completed].join(" ")} viewBox={"0 0 24 24"}>
                        <circle cx="12" cy="12" r="12"></circle>
                        <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"></path>
                    </svg> :
                    <svg className={stepStyles.svg} viewBox={"0 0 24 24"}>
                        <circle cx="12" cy="12" r="12"></circle>
                        <text x="7" y="18">{step}</text>
                    </svg>
            }
            {failed ?
                <span className={[stepStyles.failed, stepStyles.label].join(" ")}>{label}</span> :
                <>
                    <span className={stepStyles.label}>{label}</span>
                    {timing ? <span className={stepStyles.timing}>{timing}</span> : <></>}
                </>
            }
        </div>
    </>;

};

export type Orientation = "horizontal" | "vertical";

interface StepperProps {
    activeStep?: number;
    steps: StepProps[];
    orientation?: Orientation;
}

export const Stepper: React.FunctionComponent<StepperProps> = ({
    activeStep = 0,
    steps,
    orientation = "horizontal",
}) => {
    const stepperStyles = useStepperStyles();

    return <div className={stepperStyles.wrapper}>
        {steps && steps.map((props, i) => {
            const { label, completed, failed, step, timing, showConnector } = { ...props };
            return <Step key={`${label}_${i}`} label={label} step={step} failed={failed} completed={completed} timing={timing} showConnector={showConnector}></Step>;
        })}
    </div >;

};