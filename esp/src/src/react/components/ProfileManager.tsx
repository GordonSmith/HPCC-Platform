import * as React from "react";
import { Theme, makeStyles, createStyles } from "@material-ui/core/styles";
import { ButtonBase, MenuList, MenuItem, Paper, Avatar, ClickAwayListener, Popper, Grow, Typography, Divider } from "@material-ui/core";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import { getPrevious } from "../hooks/prevState";
import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";

interface ProfileManagerProps {
    username?: string,
    accountType?: string
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
            width: theme.spacing(4),
            height: theme.spacing(4),
            backgroundColor: theme.palette.secondary.main,
            background: "transparent",
            padding: theme.spacing(1)
        },
        user: {
            alignItems: "center",
            fontWeight: "bold",
            color: "white",
            paddingLeft: theme.spacing(2),
            padding: theme.spacing(0, 0, 1, 2)
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

    const handleToggle = () => {
        setOpen(!prevOpen);
    };

    const handleClose = (event: React.MouseEvent<EventTarget>) => {
        setOpen(false);
    }

    React.useEffect(() => {
        if (prevOpen) {
            anchorRef.current!.focus();
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
                    <Avatar className={classes.avatar}>MV</Avatar>
                    <div className={classes.text}>
                        <div className={classes.user}>{props.username || nlsHPCC.Loading}</div>
                        <div className={classes.role}><span>{props.accountType || nlsHPCC.Loading}</span></div>
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
                                    <Avatar className={classes.avatar}>MV</Avatar>
                                    <Typography variant="h5">{props.username}</Typography>
                                    <Typography variant="subtitle2">{props.accountType}</Typography>
                                    <MenuList className={classes.fullWidth} autoFocusItem={open} id="menu-list-grow">
                                        <MenuItem onClick={handleClose}>My Account</MenuItem>
                                        <MenuItem onClick={handleClose}>Set Banner</MenuItem>
                                        <MenuItem onClick={handleClose}>Set Toolbar</MenuItem>
                                        <MenuItem onClick={handleClose}>Lock</MenuItem>
                                        <Divider />
                                        <MenuItem onClick={handleClose}><Typography color="error">Logout</Typography></MenuItem>
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
