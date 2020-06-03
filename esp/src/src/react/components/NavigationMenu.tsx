import * as React from "react";
import { List, ListItem, ListItemIcon, ListItemText, ListSubheader } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import Collapse from '@material-ui/core/Collapse';
import SettingsIcon from "@material-ui/icons/Settings";
import StorageIcon from "@material-ui/icons/Storage";
import PublicIcon from "@material-ui/icons/Public";
import AssessmentIcon from "@material-ui/icons/Assessment";
import LayersIcon from "@material-ui/icons/Layers";
import AssignmentIcon from "@material-ui/icons/Assignment";
import MapIcon from "@material-ui/icons/Map";
import BugReportIcon from "@material-ui/icons/BugReport";
import ForumIcon from "@material-ui/icons/Forum";
import MenuBookIcon from "@material-ui/icons/MenuBook";
import InfoIcon from "@material-ui/icons/Info";
import ImportContactsIcon from "@material-ui/icons/ImportContacts";
import HomeIcon from "@material-ui/icons/Home";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

const drawerWidth = 240;

interface MainList {
    getWidgetName: (widgetID: string) => void;
}

const useStyles = makeStyles(theme => ({
    paper: {
        width: drawerWidth,
        top: "65px",
        broderRight: theme.palette.secondary,
        zIndex: 0
    },
    nested: {
        paddingLeft: theme.spacing(4),
    }
}));

export const MainList: React.FC<MainList> = ({
    getWidgetName
}) => {
    const classes = useStyles();
    const [open, setOpen] = React.useState("");

    const handleClick = id => {
        if (open === id) {
            setOpen("")
        } else {
            setOpen(id)
        }
    };

    return (
        <Drawer variant="permanent"
            classes={{
                paper: classes.paper
            }}
        >
            <List>
                <ListItem button title="Main Page">
                    <ListItemIcon>
                        <HomeIcon />
                    </ListItemIcon>
                    <ListItemText primary="Main Page" />
                </ListItem>
                <ListItem button onClick={() => {handleClick("ECL")}} title="ECL">
                    <ListItemIcon>
                        <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="ECL" />
                    {open === "ECL" ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={open === "ECL"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("WUQueryWidget")} className={classes.nested}>
                        <ListItemText primary="Workunits" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "ECL"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("ECLPlaygroundWidget")} className={classes.nested}>
                        <ListItemText primary="ECL Playground" />
                        </ListItem>
                    </List>
                </Collapse>
                <ListItem button onClick={() => {handleClick("Files")}} title="Files">
                    <ListItemIcon>
                        <StorageIcon />
                    </ListItemIcon>
                    <ListItemText primary="Files" />
                    {open === "Files" ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("DFUQueryWidget")} className={classes.nested}>
                        <ListItemText primary="Logical Files" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("LandingZoneWidget")} className={classes.nested}>
                        <ListItemText primary="Landing Zones" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("GetDFUWorkunitWidget")} className={classes.nested}>
                        <ListItemText primary="Workunits" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("XrefQueryWidget")} className={classes.nested}>
                        <ListItemText primary="Xref" />
                        </ListItem>
                    </List>
                </Collapse>
                <ListItem button onClick={() => {handleClick("Queries")}} title="Published Queries">
                    <ListItemIcon>
                        <PublicIcon />
                    </ListItemIcon>
                    <ListItemText primary="Published Queries" />
                    {open === "Queries" ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={open === "Queries"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("QuerySetQueryWidget")} className={classes.nested}>
                        <ListItemText primary="Queries" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Queries"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => getWidgetName("PackageMapQueryWidget")} className={classes.nested}>
                        <ListItemText primary="Package Maps" />
                        </ListItem>
                    </List>
                </Collapse>
                <ListItem button onClick={() => {handleClick("Operations")}} title="Operations">
                    <ListItemIcon>
                        <AssessmentIcon />
                    </ListItemIcon>
                    <ListItemText primary="Operations" />
                    {open === "Operations" ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("TopologyWidget")}} className={classes.nested}>
                        <ListItemText primary="Topology" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("DiskUsageWidget")}} className={classes.nested}>
                        <ListItemText primary="Disk Usage" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("TargetClustersQueryWidget")}} className={classes.nested}>
                        <ListItemText primary="Target Clusters" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("CluserProcessesQueryWidget")}} className={classes.nested}>
                        <ListItemText primary="Cluster Processes" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("SystemServersQueryWidget")}} className={classes.nested}>
                        <ListItemText primary="System Servers" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("UserQueryWidget")}} className={classes.nested}>
                        <ListItemText primary="Security" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("MonitoringWidget")}} className={classes.nested}>
                        <ListItemText primary="Montoring" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("DynamicESDLQueryWidget")}} className={classes.nested}>
                        <ListItemText primary="Dynamic ESDL" />
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem button onClick={() => {getWidgetName("IFrameWidget&src=http%3A%2F%2F10.240.61.210%3A5601%2Fapp%2Fkibana%23%2Fdashboard%2FMetricbeat-system-overview-ecs%3F_g%3D(refreshInterval%253A(pause%253A!t%252Cvalue%253A300000)%252Ctime%253A(from%253Anow%252Fd%252Cto%253Anow%252Fd))&__filter=isTrusted%3Dfalse%26screenX%3D0%26screenY%3D0%26clientX%3D0%26clientY%3D0%26ctrlKey%3Dfalse%26shiftKey%3Dfalse%26altKey%3Dfalse%26metaKey%3Dfalse%26button%3D0%26buttons%3D0%26pageX%3D0%26pageY%3D0%26x%3D0%26y%3D0%26offsetX%3D0%26offsetY%3D0%26movementX%3D0%26movementY%3D0%26toElement%3D%255Bobject%2520HTMLInputElement%255D%26layerX%3D-1280%26layerY%3D9994%26getModifierState%3Dfunction%2520getModifierState()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26initMouseEvent%3Dfunction%2520initMouseEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26view%3D%255Bobject%2520Window%255D%26detail%3D0%26which%3D1%26initUIEvent%3Dfunction%2520initUIEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26NONE%3D0%26CAPTURING_PHASE%3D1%26AT_TARGET%3D2%26BUBBLING_PHASE%3D3%26type%3Dclick%26target%3D%255Bobject%2520HTMLInputElement%255D%26currentTarget%3D%255Bobject%2520HTMLInputElement%255D%26eventPhase%3D2%26bubbles%3Dtrue%26cancelable%3Dtrue%26defaultPrevented%3Dfalse%26composed%3Dtrue%26timeStamp%3D265185.10500000045%26srcElement%3D%255Bobject%2520HTMLInputElement%255D%26returnValue%3Dtrue%26cancelBubble%3Dfalse%26path%3D%255Bobject%2520HTMLInputElement%255D%26path%3D%255Bobject%2520HTMLSpanElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLDivElement%255D%26path%3D%255Bobject%2520HTMLBodyElement%255D%26path%3D%255Bobject%2520HTMLHtmlElement%255D%26path%3D%255Bobject%2520HTMLDocument%255D%26path%3D%255Bobject%2520Window%255D%26composedPath%3Dfunction%2520composedPath()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26stopPropagation%3Dfunction%2520stopPropagation()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26stopImmediatePropagation%3Dfunction%2520stopImmediatePropagation()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26preventDefault%3Dfunction%2520preventDefault()%2520%257B%2520%255Bnative%2520code%255D%2520%257D%26initEvent%3Dfunction%2520initEvent()%2520%257B%2520%255Bnative%2520code%255D%2520%257D")}} className={classes.nested}>
                        <ListItemText primary="Log Visualization" />
                        </ListItem>
                    </List>
                </Collapse>
            </List>
            <List>
                <ListSubheader inset>Resources</ListSubheader>
                    <ListItem button title="Release Notes" onClick={() => { window.open("https://hpccsystems.com/download/release-notes") }}>
                        <ListItemIcon>
                            <AssignmentIcon />
                        </ListItemIcon>
                        <ListItemText primary="Release Notes" />
                    </ListItem>
                    <ListItem button title="Documentation" onClick={() => { window.open("https://hpccsystems.com/training/documentation") }}>
                        <ListItemIcon>
                            <ImportContactsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Documentation" />
                    </ListItem>
                    <ListItem button title="About">
                        <ListItemIcon>
                            <InfoIcon />
                        </ListItemIcon>
                        <ListItemText primary="About" />
                    </ListItem>
                    <ListItem button title="Configuration">
                        <ListItemIcon>
                            <LayersIcon />
                        </ListItemIcon>
                        <ListItemText primary="Configuration" />
                    </ListItem>
                    <ListItem button title="Red Book" onClick={() => { window.open("https://wiki.hpccsystems.com/x/fYAb") }}>
                        <ListItemIcon>
                            <MenuBookIcon />
                        </ListItemIcon>
                        <ListItemText primary="Red Book" />
                    </ListItem>
                    <ListItem button title="Forums" onClick={() => { window.open("https://hpccsystems.com/bb/") }}>
                        <ListItemIcon>
                            <ForumIcon />
                        </ListItemIcon>
                        <ListItemText primary="Forums" />
                    </ListItem>
                    <ListItem button title="Issue Reporting" onClick={() => { window.open("https://track.hpccsystems.com/issues") }}>
                        <ListItemIcon>
                            <BugReportIcon />
                        </ListItemIcon>
                        <ListItemText primary="Issue Reporting" />
                    </ListItem>
                    <ListItem button title="Transition Guide" onClick={() => { window.open("https://wiki.hpccsystems.com/display/hpcc/HPCC+ECL+Watch+5.0+Transition+Guide") }}>
                        <ListItemIcon>
                            <MapIcon />
                        </ListItemIcon>
                        <ListItemText primary="Transition Guide" />
                    </ListItem>
            </List>
        </Drawer>
    )};