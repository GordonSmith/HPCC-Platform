import * as React from "react";
import { List, ListItem, ListItemIcon, ListItemText /*, ListSubheader */ } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Collapse from "@material-ui/core/Collapse";
import SettingsIcon from "@material-ui/icons/Settings";
import StorageIcon from "@material-ui/icons/Storage";
import PublicIcon from "@material-ui/icons/Public";
import AssessmentIcon from "@material-ui/icons/Assessment";
// import LayersIcon from "@material-ui/icons/Layers";
// import AssignmentIcon from "@material-ui/icons/Assignment";
// import MapIcon from "@material-ui/icons/Map";
// import BugReportIcon from "@material-ui/icons/BugReport";
// import ForumIcon from "@material-ui/icons/Forum";
// import MenuBookIcon from "@material-ui/icons/MenuBook";
// import InfoIcon from "@material-ui/icons/Info";
// import ImportContactsIcon from "@material-ui/icons/ImportContacts";
import HomeIcon from "@material-ui/icons/Home";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

const drawerWidth = 240;

interface MainList {
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

export const MainList: React.FC<MainList> = () => {
    const classes = useStyles();
    const [open, setOpen] = React.useState("");

    const handleClick = id => {
        if (open === id) {
            setOpen("");
        } else {
            setOpen(id);
        }
    };

    return <><List>
        <ListItem button title="Main Page" component="a" href="">
            <ListItemIcon>
                <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Main Page" />
        </ListItem>
        <ListItem button onClick={() => { handleClick("ECL"); }} title="ECL">
            <ListItemIcon>
                <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="ECL" />
            {open === "ECL" ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open === "ECL"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/workunits" className={classes.nested}>
                    <ListItemText primary="Workunits" />
                </ListItem>
                <ListItem button component="a" href="#/workunits/legacy" className={classes.nested}>
                    <ListItemText primary="Workunits (Legacy)" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "ECL"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/play" className={classes.nested}>
                    <ListItemText primary="ECL Playground" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "ECL"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/event" className={classes.nested}>
                    <ListItemText primary="Event Scheduler" />
                </ListItem>
            </List>
        </Collapse>
        <ListItem button onClick={() => { handleClick("Files"); }} title="Files">
            <ListItemIcon>
                <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="Files" />
            {open === "Files" ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/files" className={classes.nested}>
                    <ListItemText primary="Logical Files" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/landingzone" className={classes.nested}>
                    <ListItemText primary="Landing Zones" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/dfuworkunits" className={classes.nested}>
                    <ListItemText primary="Workunits" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Files"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/xref" className={classes.nested}>
                    <ListItemText primary="Xref" />
                </ListItem>
            </List>
        </Collapse>
        <ListItem button onClick={() => { handleClick("Queries"); }} title="Published Queries">
            <ListItemIcon>
                <PublicIcon />
            </ListItemIcon>
            <ListItemText primary="Published Queries" />
            {open === "Queries" ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open === "Queries"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/queries" className={classes.nested}>
                    <ListItemText primary="Queries" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Queries"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/packagemaps" className={classes.nested}>
                    <ListItemText primary="Package Maps" />
                </ListItem>
            </List>
        </Collapse>
        <ListItem button onClick={() => { handleClick("Operations"); }} title="Operations">
            <ListItemIcon>
                <AssessmentIcon />
            </ListItemIcon>
            <ListItemText primary="Operations" />
            {open === "Operations" ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/topology" className={classes.nested}>
                    <ListItemText primary="Topology" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/diskusage" className={classes.nested}>
                    <ListItemText primary="Disk Usage" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/clusters" className={classes.nested}>
                    <ListItemText primary="Target Clusters" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/processes" className={classes.nested}>
                    <ListItemText primary="Cluster Processes" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/servers" className={classes.nested}>
                    <ListItemText primary="System Servers" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/security" className={classes.nested}>
                    <ListItemText primary="Security" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/monitoring" className={classes.nested}>
                    <ListItemText primary="Montoring" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/esdl" className={classes.nested}>
                    <ListItemText primary="Dynamic ESDL" />
                </ListItem>
            </List>
        </Collapse>
        <Collapse in={open === "Operations"} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem button component="a" href="#/elk" className={classes.nested}>
                    <ListItemText primary="Log Visualization" />
                </ListItem>
            </List>
        </Collapse>
    </List>
        {/* <List>
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
        </List> */}
    </>;
};