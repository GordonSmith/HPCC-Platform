import * as React from "react";
import { Theme, makeStyles, createStyles } from "@material-ui/core/styles";
import { ButtonBase, MenuList, MenuItem, Paper, Avatar, ClickAwayListener, Popper, Grow, Typography, Divider } from "@material-ui/core";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import { UserAccountContext } from '../hooks/userContext';
import { getPrevious } from "../hooks/prevState";
import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";

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
        }
    })
);

export const ProfileManager: React.FC<ProfileManagerProps> = (props) => {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const prevOpen = getPrevious(open);
    const { userAccount } = React.useContext(UserAccountContext);

    const createAvatar = (username) => {
        return username.substring(0, 2).toLocaleUpperCase();
    };

    const handleToggle = () => {
        setOpen(!prevOpen);
    };

    const handleClose = (event: React.MouseEvent<EventTarget>) => {
        setOpen(false);
    }

    React.useEffect(() => {
        if (prevOpen) {
            anchorRef.current?.focus();
        }
    }, [open]);

    return (
        <>
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
                                        <MenuItem onClick={handleClose}>Set Toolbar</MenuItem>
                                        <MenuItem onClick={handleClose}>Lock</MenuItem>
                                        <Divider />
                                        <MenuItem onClick={handleClose} color="error">Logout</MenuItem>
                                    </MenuList>
                                </div>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </>
    );
}