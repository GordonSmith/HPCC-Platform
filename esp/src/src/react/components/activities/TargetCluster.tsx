import { Gauge } from "@hpcc-js/chart";
import { GetTargetClusterUsageEx, SMCActivity } from "@hpcc-js/comms";
import { Avatar, Card, CardContent, CardHeader, createStyles, Divider, IconButton, makeStyles, Table, TableBody, TableCell, TableContainer, TableRow, MenuItem, Menu, CardActions, Collapse, Typography } from "@material-ui/core";
import { green, red } from "@material-ui/core/colors";
import Grid from "@material-ui/core/Grid";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import clsx from "clsx";
import * as React from "react";
import { ActivityConnection } from "../../../comms/activity";
import nlsHPCC from "../../../nlsHPCC";
import { VizAdapter } from "../VizAdapter";

const useStyles = makeStyles(theme =>
    createStyles({
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
    })
);

function avatarColor(tc: { QueueStatus: string }, classes) {
    switch (tc.QueueStatus) {
        case "active":
        case "running":
            return classes.green;
        case "paused":
            return classes.red;
        default:
            console.log("Unknown QueueStatus:  " + tc.QueueStatus);
            return classes.red;
    }
}

const TargetCluster: React.FunctionComponent<SMCActivity.TargetCluster> = (tc) => {

    const [usage, setUsage] = React.useState<GetTargetClusterUsageEx.TargetClusterUsage>();
    const [workunits, setWorkunits] = React.useState<SMCActivity.ActiveWorkunit[]>([]);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [expanded, setExpanded] = React.useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    React.useEffect(() => {
        const activityConnection = ActivityConnection.attach();

        const activityHandle = activityConnection.watch(callback => {
            setUsage(activityConnection.usage(tc.ClusterName));
            setWorkunits(activityConnection.workunits(tc.ClusterName));
        }, true);

        return () => {
            activityHandle.release();
        };
    }, []);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const onMenuClonse = () => {
        setAnchorEl(null);
    };
    const onPause = () => {
        onMenuClonse();
    };
    const onResume = () => {
        onMenuClonse();
    };
    const onRefresh = () => {
        onMenuClonse();
    };
    const classes = useStyles();

    const widgetProps: any = {
        title: nlsHPCC.Disk
    };

    if (usage) {
        widgetProps.showTick = true;
        widgetProps.value = (usage.max || 0) / 100;
        widgetProps.valueDescription = nlsHPCC.Max;
        widgetProps.tickValue = (usage.mean || 0) / 100;
        widgetProps.tickValueDescription = nlsHPCC.Mean;
        widgetProps.tooltip = usage.ComponentUsagesDescription;
    }

    return <Card key={tc.ClusterName} className={classes.cardRoot}>
        <CardHeader
            avatar={
                <Avatar className={avatarColor(tc, classes)} >
                    {tc.ClusterSize}
                </Avatar>
            }
            action={
                <IconButton onClick={handleClick}>
                    <MoreVertIcon />
                </IconButton>
            }
            title={tc.ClusterName}
            subheader={tc.QueueStatus}
        />
        <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={onMenuClonse}
        >
            <MenuItem onClick={onPause}>Pause</MenuItem>
            <MenuItem onClick={onResume}>Resume</MenuItem>
            <Divider />
            <MenuItem onClick={onRefresh}>Refresh</MenuItem>
        </Menu>
        <Divider />
        <CardContent>
            <VizAdapter widget={Gauge} widgetProps={widgetProps} width="120px" height="120px"></VizAdapter>
            <CardActions disableSpacing title={nlsHPCC.Active + `:  ${workunits.length}`}>
                <Typography>{nlsHPCC.Active + `:  ${workunits.length}`}</Typography>
                <IconButton disabled={workunits.length === 0}
                    className={clsx(classes.expand, {
                        [classes.expandOpen]: expanded,
                    })}
                    onClick={handleExpandClick}
                    aria-expanded={expanded}
                    aria-label="show more"
                >
                    <ExpandMoreIcon />
                </IconButton>
            </CardActions>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <TableContainer>
                    <Table size="small">
                        <TableBody>
                            {workunits.map(wu =>
                                <TableRow key={wu.Wuid}>
                                    <TableCell component="th" scope="row">{wu.Wuid}</TableCell>
                                    <TableCell>{wu.Owner}</TableCell>
                                    <TableCell align="right">{wu.Duration}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Collapse>
        </CardContent>
    </Card >;
};

export const TargetClusters: React.FunctionComponent<{ targetClusters: SMCActivity.TargetCluster[] }> = ({ targetClusters }) => {
    return <Grid container justify="center" spacing={3} >
        {targetClusters.map(tc =>
            <Grid item key={tc.QueueName}>
                <TargetCluster {...tc} />
            </Grid>
        )}
    </Grid>;
};

const ServerJobQueue: React.FunctionComponent<SMCActivity.ServerJobQueue> = (sjq) => {
    const classes = useStyles();

    const [workunits, setWorkunits] = React.useState<SMCActivity.ActiveWorkunit[]>([]);

    React.useEffect(() => {
        const activityConnection = ActivityConnection.attach();

        const activityHandle = activityConnection.watch(() => {
            setWorkunits(activityConnection.workunits(sjq.QueueName));
        }, true);

        return () => {
            activityHandle.release();
        };
    }, []);

    return <Card key={sjq.ServerName} className={classes.cardRoot}>
        <CardHeader
            avatar={
                <Avatar className={avatarColor(sjq, classes)} >
                    {""}
                </Avatar>
            }
            action={
                <IconButton >
                    <MoreVertIcon />
                </IconButton>
            }
            title={sjq.ServerName}
            subheader={sjq.QueueStatus}
        />
        <Divider />
        <CardContent>
            <TableContainer>
                <Table size="small">
                    <TableBody>
                        {workunits.map(wu =>
                            <TableRow key={wu.Wuid}>
                                <TableCell component="th" scope="row">{wu.Wuid}</TableCell>
                                <TableCell>{wu.Owner}</TableCell>
                                <TableCell align="right">{wu.Duration}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </CardContent>
    </Card>;
};

export const ServerJobQueues: React.FunctionComponent<{ serverJobQueues: SMCActivity.ServerJobQueue[] }> = ({ serverJobQueues }) => {
    return <Grid container justify="center" spacing={3} >
        {serverJobQueues.map(sjq =>
            <Grid item key={sjq.ServerName}>
                <ServerJobQueue {...sjq} />
            </Grid>
        )}
    </Grid>;
};