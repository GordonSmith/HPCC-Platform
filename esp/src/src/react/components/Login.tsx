import * as React from "react";
import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";
import InputAdornment from "@material-ui/core/InputAdornment";
import PersonIcon from "@material-ui/icons/Person";
import HttpsTwoToneIcon from "@material-ui/icons/HttpsTwoTone";
import { FormGroup, TextField, FormControlLabel, Button, Typography } from "@material-ui/core";
import Checkbox from "@material-ui/core/Checkbox";
import Grid from "@material-ui/core/Grid";
import { localKeyValStore } from "../../KeyValStore";
import nlsHPCC from "../../nlsHPCC";
import * as ESPRequest from "../../ESPRequest";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        wrapper: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh !important",
            width: "100%"
        },
        form: {
            padding: 40,
            maxWidth: "25%",
            flexBasis: "25%",
            boxShadow: theme.shadows[10]
        },
        control: {
            padding: theme.spacing(2),
        },
        button: {
            marginTop: theme.spacing(2),
            padding: theme.spacing(1),
            fontSize: theme.typography.fontSize,
        },
        inputs: {
            marginTop: theme.spacing(2),
            marginBottom: theme.spacing(2)
        },
        textCenter: {
            textAlign: "center"
        },
        heading: {
            fontWeight: 500,
            marginBottom: "10px"
        },
        subtitle: {
            color: "rgba(0, 0, 0, 0.5)",
            marginBottom: "10px"
        },
        userTools: {

        },
        logo: {
            display: "none",
            [theme.breakpoints.up("sm")]: {
                display: "flex"
            },
            marginTop: "40px",
            marginRight: "20px",
            maxWidth: "15%",
            flexBasis: "15%"
        },
        error: {
            color: theme.palette.error.main
        }
    })
);

export interface LoginProps {
}

export const LoginComponent: React.FunctionComponent<LoginProps> = ({
}) => {
    const classes = useStyles();
    const rememberSaveUsernnameCheckBoxState = localKeyValStore();
    const [usernameTextField, setUsernameTextField] = React.useState("");
    const [passwordTextField, setPasswordTextField] = React.useState("");
    const [errorStatus, setErrorStatus] = React.useState("");
    const [checked, setChecked] = React.useState(false);

    const handleTextFieldChange = (e) => {
        setUsernameTextField(e.target.value);
    };

    const handlePasswordFieldChange = (e) => {
        setPasswordTextField(e.target.value);
    };

    const handleSubmit = (evt) => {
        ESPRequest.send("esp", "login", {
            handleAs: "text",
            method: "post"
        }).then(function (status) {
            if (status) {
                setErrorStatus(status);
            } else {
                if (checked) {
                    setErrorStatus("");
                    rememberSaveUsernnameCheckBoxState.set("RememberUsernameState", usernameTextField, false).then(function (val) { });
                } else {
                    setErrorStatus("");
                    rememberSaveUsernnameCheckBoxState.delete("ECLWatch:RememberUsernameState", true).then(function (val) { });
                }
            }
        });
    };

    const toggleCheckbox = () => {
        setChecked(!checked);
    };

    const checkRememberMePreference = () => {
        rememberSaveUsernnameCheckBoxState.get("RememberUsernameState").then(function (val) {
            if (val !== null) {
                setUsernameTextField(val);
                setChecked(true);
            }
        });
    };

    React.useEffect(() => {
        checkRememberMePreference();
    }, []);

    return (
        <div className={classes.wrapper}>
            <Grid container direction="row" justify="center" alignItems="center">
                <Grid item>
                    <div className={classes.logo}>
                        <img src="../eclwatch/img/hpcc_systems_logo2.png" />
                    </div>
                </Grid>
                <div className={classes.form}>
                    <div className={classes.textCenter}>
                        <Typography variant="h4" className={classes.heading}>Log in to your account</Typography>
                        <Typography variant="subtitle1" className={classes.subtitle}>Fill in the fields below to login to your account</Typography>
                        <TextField
                            className={classes.inputs}
                            required
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon />
                                    </InputAdornment>
                                )
                            }}
                            InputLabelProps={{
                                shrink: true
                            }}
                            onChange={handleTextFieldChange}
                            variant="outlined"
                            label="Username"
                            value={usernameTextField}
                        />
                        <TextField
                            className={classes.inputs}
                            required
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <HttpsTwoToneIcon />
                                    </InputAdornment>
                                )
                            }}
                            InputLabelProps={{
                                shrink: true
                            }}
                            onChange={handlePasswordFieldChange}
                            variant="outlined"
                            label="Password"
                            type="password"
                        />
                    </div>
                    <div className={classes.userTools}>
                        <FormGroup row>
                            <FormControlLabel
                                control={<Checkbox checked={checked} onChange={toggleCheckbox} />}
                                label="Remember username"
                            />
                        </FormGroup>
                    </div>
                    <div className={classes.textCenter}>
                        <Typography variant="subtitle1" className={classes.error}>{errorStatus}</Typography>
                        <Button className={classes.button} disabled={usernameTextField === "" && passwordTextField === ""} fullWidth variant="contained" color="primary" onClick={handleSubmit}>{nlsHPCC.Login}</Button>
                    </div>
                </div>
            </Grid>
        </div>
    );
};