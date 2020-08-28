import { createMuiTheme } from "@material-ui/core/styles";

declare const dojoConfig;

export const theme = createMuiTheme({
    typography: {
        fontSize: 15
    },
    palette: {
        primary: {
            main: "#199bd7", // teal
            light: "#65ccff", //light complementary color to teal (for hovers and such) 
            dark: "#000642", //dark blue
            contrastText: "#fff"
        },
        secondary: {
            main: "#ff8302", // orange accent
            light: "#ffb444",
            dark: "#c55400",
            contrastText: "#fff"
        }
    },
    overrides: {  // lets make everything look the same. if we want to overwrite use the useStyles hook inside the component
        MuiStepIcon: {
            root: {
                color: "rgba(0, 0, 0, 0.38)"
            },
            completed: {
                color: "#1a9bd7"
            }
        },
        MuiTableContainer: {
            root: {
                margin: "20px 0px"
            }
        },
        MuiButton: {
            root: {
                "color": "white",
                "&:hover": {
                    background: "primary",
                    color: "white",
                    boxShadow: "none"
                }
            }
        },
        MuiTableCell: {
            head: {
                fontWeight: 600,
                width: "50%"
            }
        },
        MuiBadge: {
            badge: {
                "color": "white",
                "background": "#000642"
            }
        },
        MuiDialogActions: {
            root: {
                padding: "25px 8px 15px 8px"
            }
        },
        MuiDialogTitle: {
            root:{
                h2: {
                    fontSize: "2rem"
                }
            }
        }
    }
});
