import * as React from "react";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import { InputBase, IconButton, Popper, ClickAwayListener, Paper, Grow, List, ListSubheader, ListItem, ListItemText, ListItemIcon } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import HistoryIcon from "@material-ui/icons/History";
import LaunchIcon from "@material-ui/icons/Launch";
import { DATA } from "src/data/components";
import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";

interface GlobalSearchProps {
    username: string
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        listItem: {
            minWidth: "28px"
        },
        halfWidthList: {
            width: "600px"
        },

        flexCenter: {
            display: "flex",
            width: "600px",
            flexDirection: "column"
        },
        userDetails: {
            marginTop: theme.spacing(1),
            padding: 0
        },
        search: {
            position: "relative",
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.common.white,
            marginLeft: 0,
            width: "600px",
            [theme.breakpoints.up("sm")]: {
                marginLeft: theme.spacing(1),
                width: "auto",
            }
        },
        searchIcon: {
            height: "100%",
            position: "absolute",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            right: 0,
            cursor: "pointer"
        },
        inputRoot: {
            color: "black",
            width: "600px",
            padding: "3px 0"
        },
        inputInput: {
            padding: theme.spacing(1, 1, 1, 0),
            paddingLeft: `calc(1em + ${theme.spacing(0)}px)`,
            transition: theme.transitions.create("width"),
            width: "100%",
            // [theme.breakpoints.up('sm')]: {
            //   width: '12ch',
            //   '&:focus': {
            //     width: '20ch',
            //   }
            // }
        }
    })
)

export const GlobalSearch: React.FC<GlobalSearchProps> = (props) => {
    const classes = useStyles();

    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [searchResults, setSearchResults] = React.useState([]);
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const prevOpen = React.useRef(open);
    const components = DATA;

    const handleToggle = () => {
        setOpen(true);
    };
    const handleSearchText = event => {
        setSearchTerm(event.target.value);
    }
    const handleClose = (event: React.MouseEvent<EventTarget>) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return;
        }
        setOpen(false);
    }
    React.useEffect(() => {
        const autoCompleteSearchTerms = components.components;
        if (searchTerm !== "") {
            setOpen(true)
            const results = autoCompleteSearchTerms.filter(name => (name.name.toLowerCase().includes(searchTerm.toLowerCase())));
            setSearchResults(results);
        }
    }, [searchTerm]);

    React.useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current!.focus();
        }

        prevOpen.current = open;
    }, [open]);

    return (
        <>
            <div className={classes.search}>
                <div className={classes.searchIcon}>
                    <IconButton>
                        <SearchIcon color="primary" />
                    </IconButton>
                </div>
                <InputBase
                    placeholder={nlsHPCC.SearchComponents}
                    classes={{
                        root: classes.inputRoot,
                        input: classes.inputInput,
                    }}
                    inputProps={{ "aria-label": "search" }}
                    onClick={handleToggle}
                    onChange={handleSearchText}
                    ref={anchorRef}
                />
            </div>

            <Popper
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
            >
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: placement === "bottom" ? "center top" : "center bottom"
                        }}
                    >
                        <Paper className={classes.userDetails}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <div className={classes.flexCenter}>
                                    <List
                                        component="ul"
                                        aria-labelledby="nested-list-subheader"
                                        subheader={
                                            <ListSubheader component="div" id="nested-list-subheader">{nlsHPCC.RecentSearches}</ListSubheader>
                                        }
                                    >
                                        <ListItem dense button className={classes.halfWidthList}>
                                            <ListItemIcon className={classes.listItem}>
                                                <HistoryIcon />
                                            </ListItemIcon>
                                            <ListItemText primary="Recent search 1" />
                                        </ListItem>
                                        <ListItem dense button className={classes.halfWidthList}>
                                            <ListItemIcon className={classes.listItem}>
                                                <HistoryIcon />
                                            </ListItemIcon>
                                            <ListItemText primary="Recent search 2" />
                                        </ListItem>
                                        <ListItem dense button className={classes.halfWidthList}>
                                            <ListItemIcon className={classes.listItem}>
                                                <HistoryIcon />
                                            </ListItemIcon>
                                            <ListItemText primary="Recent search 3" />
                                        </ListItem>
                                        <ListItem dense button className={classes.halfWidthList}>
                                            <ListItemIcon className={classes.listItem}>
                                                <HistoryIcon />
                                            </ListItemIcon>
                                            <ListItemText primary="Recent search 4" />
                                        </ListItem>
                                        <ListItem dense button className={classes.halfWidthList}>
                                            <ListItemIcon className={classes.listItem}>
                                                <HistoryIcon />
                                            </ListItemIcon>
                                            <ListItemText primary="Recent search 5" />
                                        </ListItem>
                                    </List>
                                    {searchResults.length > 0 ? (
                                        <List dense disablePadding
                                            subheader={
                                                <ListSubheader component="div" id="nested-list-subheader">{nlsHPCC.Components}</ListSubheader>
                                            }
                                        >
                                            {searchResults.map((item, idx) => (
                                                <ListItem key={idx} role={undefined} dense button className={classes.halfWidthList}>
                                                    <ListItemIcon>
                                                        <LaunchIcon color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText id={item.name} primary={item.name} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : ""}
                                </div>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </>
    )
}
