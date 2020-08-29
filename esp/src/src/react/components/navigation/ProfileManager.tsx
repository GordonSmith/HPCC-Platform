import * as React from "react";
import { Theme, makeStyles, createStyles } from "@material-ui/core/styles";
import { ButtonBase, MenuList, MenuItem, Paper, Avatar, ClickAwayListener, Popper, Grow, Typography, Divider, Dialog, DialogTitle, TextField, DialogContent, DialogContentText, DialogActions, Button } from "@material-ui/core";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import { ChromePicker } from "react-color";
import * as ESPRequest from "../../../ESPRequest";
import { globalKeyValStore } from "../../../KeyValStore";
import nlsHPCC from "../../../nlsHPCC";
import { UserAccountContext, GlobalSettingsContext } from "../../hooks/userContext";
import { getPrevious } from "../../hooks/prevState";

declare const dojoConfig;

interface ProfileManagerProps {
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            "&:hover": {
                background: "rgb(56, 79, 107)"
            },
            borderRadius: theme.shape.borderRadius
        },
        container: {
            background: "transparent",
            "&:hover": {
                background: "transparent"
            },
            padding: theme.spacing(1, 2),
            flexDirection: "row",
            display: "flex",
            boxShadow: "none"
        },
        flexCenter: {
            minWidth: "200px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
        },
        avatar: {
            width: theme.spacing(3),
            height: theme.spacing(3),
            backgroundColor: theme.palette.primary.dark,
            background: "transparent",
            padding: theme.spacing(1),
            marginTop: "7px"
        },
        user: {
            alignItems: "center",
            fontWeight: "bold",
            color: "white",
            paddingTop: "3px",
            paddingLeft: theme.spacing(2),
            marginBottom: "0px"
        },
        role: {
            color: theme.palette.primary.contrastText,
            paddingLeft: theme.spacing(2)
        },
        text: {
            textAlign: "left"
        },
        arrow: {
            color: theme.palette.common.white,
            marginTop: "2px",
            padding: theme.spacing(0, 2, 0, 2)
        },
        fullWidth: {
            minWidth: "200px",
            marginTop: theme.spacing(2)
        },
        userDetails: {
            padding: theme.spacing(3, 0, 1, 0)
        },
        dialogInput: {
            marginTop: "15px",
            paddingBottom: "10px"
        },
        headings: {
            padding: "10px 0px"
        }
    })
);

export const ProfileManager: React.FC<ProfileManagerProps> = (props) => {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const prevOpen = getPrevious(open);
    const { userAccount } = React.useContext(UserAccountContext);
    const { globalSettings, setGlobalSettings } = React.useContext(GlobalSettingsContext);
    const [toolbarChange, setToolbarChange] = React.useState(false);
    const [toolBarText, setToolBarText] = React.useState("");
    const [toolBarColor, setToolBarColor] = React.useState("");
    const [openDialog, setOpenDialog] = React.useState(false);
    const global_store = globalKeyValStore();

    const createAvatar = (username) => {
        return username.substring(0, 2).toLocaleUpperCase();
    };

    const handleToggle = () => {
        setOpen(!prevOpen);
    };

    const handleClose = (event: React.MouseEvent<EventTarget>) => {
        setOpen(false);
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
    };

    const handleToolbarApply = () => {
        const updatedTheme = { ...globalSettings, HPCCPlatformWidget_Toolbar_Color: toolBarColor, HPCCPlatformWidget_Toolbar_Text: toolBarText };
        setGlobalSettings(
            updatedTheme
        );
        global_store.set("HPCCPlatformWidget_Toolbar_Color", toolBarColor);
        global_store.set("HPCCPlatformWidget_Toolbar_Text", toolBarText);
        handleDialogClose();
    };

    const handleLogout = () => {
        ESPRequest.send("esp", "logout", {
            handleAs: "text",
            method: "post"
        }).then(function (status) {
            window.location.href = location.origin + "/esp/files/Login.html";
        });
    };

    const handleToolbar = () => {
        setOpenDialog(true);
    };

    const handleTextChange = (evt) => {
        setToolBarText(evt.target.value);
        setToolbarChange(true);
    };

    const handleColorChange = (color) => {
        setToolBarColor(color.hex);
        setToolbarChange(true);
    };

    React.useEffect(() => {
        if (prevOpen) {
            anchorRef.current?.focus();
        }
    }, [open]);

    return (
        <>
            <Dialog onClose={handleDialogClose} aria-labelledby="simple-dialog-title" open={openDialog} maxWidth={"md"}>
                <DialogTitle>Set Custom Toolbar</DialogTitle>
                <DialogContent>
                    <DialogContentText id="toolbar-creator-description">
                        Customize your envrionment with your own color scheme and name.
                    </DialogContentText>
                    <Divider />
                    <TextField className={classes.dialogInput} label="Environment Name" onKeyUp={handleTextChange} defaultValue={globalSettings.HPCCPlatformWidget_Toolbar_Text} placeholder="" variant="outlined" fullWidth />
                    <Typography variant="h6" className={classes.headings}>Toolbar color</Typography>
                    <ChromePicker disableAlpha color={globalSettings.HPCCPlatformWidget_Toolbar_Color} width="100%" onChangeComplete={handleColorChange} />
                    <DialogActions>
                        <Button variant="contained" onClick={handleDialogClose} color="primary">Dismiss</Button>
                        <Button variant="contained" disabled={!toolbarChange} onClick={handleToolbarApply} color="primary">Apply</Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>
            <ButtonBase
                focusRipple
                className={classes.root}
                aria-controls="simple-menu"
                aria-haspopup="true"
                onClick={handleToggle}
                ref={anchorRef}
            >
                <Paper className={classes.container}>
                    <Avatar className={classes.avatar}>{userAccount.username ? createAvatar(userAccount.username) : "..."}</Avatar>
                    <div className={classes.text}>
                        <div className={classes.user}><Typography variant="h6">{userAccount.username ? userAccount.username : nlsHPCC.Loading}</Typography></div>
                        <div className={classes.role}><Typography variant="subtitle1">{userAccount.accountType ? userAccount.accountType : nlsHPCC.Loading}</Typography></div>
                    </div>
                </Paper>
                <span className={classes.arrow}><KeyboardArrowDownIcon></KeyboardArrowDownIcon></span>
            </ButtonBase>
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
                                    <Avatar className={classes.avatar}>{userAccount.username ? createAvatar(userAccount.username) : "..."}</Avatar>
                                    <Typography variant="h5">{userAccount.firstName ? userAccount.firstName + " " + userAccount.lastName : userAccount.username}</Typography>
                                    <Typography variant="subtitle1">{userAccount.accountType}</Typography>
                                    <MenuList className={classes.fullWidth} autoFocusItem={open} id="menu-list-grow">
                                        <MenuItem onClick={handleClose}>My Account</MenuItem>
                                        <MenuItem onClick={handleClose}>Set Banner</MenuItem>
                                        <MenuItem onClick={handleToolbar}>Set Toolbar</MenuItem>
                                        <MenuItem onClick={handleClose}>Lock</MenuItem>
                                        <Divider />
                                        <MenuItem onClick={handleLogout} color="error">Logout</MenuItem>
                                    </MenuList>
                                </div>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </>
    );
};