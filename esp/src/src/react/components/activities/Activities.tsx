import * as React from "react";
import { SMCActivity } from "@hpcc-js/comms";
import { createStyles, makeStyles } from "@material-ui/core";
import { green, red } from "@material-ui/core/colors";
import Grid from "@material-ui/core/Grid";
import { ActivityConnection } from "../../../comms/activity";
import { TargetClusters, ServerJobQueues } from "./TargetCluster";

const useStyles = makeStyles(theme =>
    createStyles({
        gridRoot: {
            flexGrow: 1,
            padding: "24px"
        },
        cardRoot: {
            // minWidth: 192,
            // padding: 16
            maxHeight: 320
        },
        green: {
            color: theme.palette.getContrastText(green[500]),
            backgroundColor: green[500],
        },
        red: {
            color: theme.palette.getContrastText(red[500]),
            backgroundColor: red[500],
        },
        bullet: {
            // display: "inline-block",
            // margin: "0 2px",
            // transform: "scale(0.8)"
        },
        title: {
            // fontSize: 14
        },
        pos: {
            // marginBottom: 12
        },
        expand: {
            transform: "rotate(0deg)",
            marginLeft: "auto",
            transition: theme.transitions.create("transform", {
                duration: theme.transitions.duration.shortest,
            }),
        },
        expandOpen: {
            transform: "rotate(180deg)",
        }
    }));

export interface Activities {
}

export const Activities: React.FunctionComponent<Activities> = ({
}) => {
    const classes = useStyles();

    const [targetClusters, setTargetClusters] = React.useState<SMCActivity.TargetCluster[]>([]);
    const [serverJobQueues, setServerJobQueues] = React.useState<SMCActivity.ServerJobQueue[]>([]);

    React.useEffect(() => {
        const activityConnection = ActivityConnection.attach();
        const activityHandle = activityConnection.watch(() => {
            setTargetClusters(activityConnection.targetClusters());
            setServerJobQueues(activityConnection.jobQueues());
        }, true);

        return () => {
            activityHandle.release();
        };
    }, []);

    return <Grid container spacing={3} className={classes.gridRoot}>
        <Grid item xs={12}>
            <TargetClusters targetClusters={targetClusters} />
        </Grid>
        <Grid item xs={12}>
            <ServerJobQueues serverJobQueues={serverJobQueues} />
        </Grid>
    </Grid>;
};
