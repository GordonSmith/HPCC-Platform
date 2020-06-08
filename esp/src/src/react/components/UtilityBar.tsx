import * as React from "react";
import { makeStyles, Theme, createStyles, ThemeProvider } from "@material-ui/core/styles";
import { AppBar, Toolbar, Typography, IconButton, Badge, Menu, MenuItem } from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import AccountCircle from "@material-ui/icons/AccountCircle";
import FavoriteIcon from "@material-ui/icons/Favorite";
import NotificationsIcon from "@material-ui/icons/Notifications";
import MoreIcon from "@material-ui/icons/MoreVert";
import { theme } from "../theme";
import { GlobalSearch } from "./GlobalSearch";
import { ProfileManager } from "./ProfileManager";

declare const dojoConfig: any;

interface UtilityBarProps {
	//sendData: any;
}


const useStyles = makeStyles((theme: Theme) =>
	createStyles({
		grow: {
			display: "flex",
			flexGrow: 1,
			alignItems: "center"
		},
		drawerGrow: {
			display: "flex",
			alignItems: "center"
		},
		menuButton: {
			marginRight: theme.spacing(2)
		},
		title: {
			display: "none",
			[theme.breakpoints.up("sm")]: {
				display: "block"
			},
			flexGrow: 1
		},
		icons: {
			paddingRight: theme.spacing(2),
			marginTop: "5px"
		},
		sectionDesktop: {
			display: "none",
			[theme.breakpoints.up("md")]: {
				display: "flex"
			}
		},
		sectionMobile: {
			display: "flex",
			[theme.breakpoints.up("md")]: {
				display: "none"
			}
		}
	})
);

export const UtilityBar: React.FC<UtilityBarProps> = (props) => {
	const classes = useStyles();
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState<null | HTMLElement>(null);
	// let username;

	React.useEffect(() => {
		// username = dojoConfig.username
	}, []);

	const isMenuOpen = Boolean(anchorEl);
	const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

	const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMobileMenuClose = (event: React.MouseEvent<HTMLElement>) => {
		setMobileMoreAnchorEl(null);
	};

	const handleMenuClose = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(null);
		handleMobileMenuClose(event);
	};

	const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setMobileMoreAnchorEl(event.currentTarget);
	};

	const handleDrawer = () => {
		//setOpen(!open);
	};

	const menuId = "primary-search-account-menu";
	const renderMenu = (
		<Menu
			anchorEl={anchorEl}
			anchorOrigin={{ vertical: "top", horizontal: "right" }}
			id={menuId}
			keepMounted
			transformOrigin={{ vertical: "top", horizontal: "right" }}
			open={isMenuOpen}
			onClose={handleMenuClose}
		>
			<MenuItem onClick={handleMenuClose}>Profile</MenuItem>
			<MenuItem onClick={handleMenuClose}>My account</MenuItem>
		</Menu>
	);

	const mobileMenuId = "primary-search-account-menu-mobile";
	const renderMobileMenu = (
		<ThemeProvider theme={theme}>
			<Menu
				anchorEl={mobileMoreAnchorEl}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				id={mobileMenuId}
				keepMounted
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				open={isMobileMenuOpen}
				onClose={handleMobileMenuClose}
			>
				<MenuItem>
					<IconButton aria-label="show 4 new mails" color="inherit">
						<FavoriteIcon />
					</IconButton>
					<p>Messages</p>
				</MenuItem>
				<MenuItem>
					<IconButton aria-label="show 11 new notifications" color="inherit">
						<Badge badgeContent={11} color="secondary">
							<NotificationsIcon />
						</Badge>
					</IconButton>
					<p>Notifications</p>
				</MenuItem>
				<MenuItem onClick={handleProfileMenuOpen}>
					<IconButton
						aria-label="account of current user"
						aria-controls="primary-search-account-menu"
						aria-haspopup="true"
						color="inherit"
					>
						<AccountCircle />
					</IconButton>
					<p>Profile</p>
				</MenuItem>
			</Menu>
		</ThemeProvider>
	);
	return (
		<ThemeProvider theme={theme}>
			<div className={classes.grow}>
				<AppBar position="fixed" color="primary">
					<Toolbar>
						<IconButton
							edge="start"
							className={classes.menuButton}
							color="inherit"
							aria-label="open drawer"
							onClick={handleDrawer}
						>
							<MenuIcon />
						</IconButton>
						<Typography className={classes.title} variant="h6" noWrap>Stu's 160 Cluster</Typography>
						<GlobalSearch username={dojoConfig.username} />
						<div className={classes.grow} />
						<div className={classes.sectionDesktop}>
							<div className={classes.icons}>
								<IconButton aria-label="show your favorite widgets" color="inherit">
									<FavoriteIcon />
								</IconButton>
								<IconButton aria-label="show 17 new notifications" color="inherit">
									<Badge badgeContent={17} color="secondary">
										<NotificationsIcon />
									</Badge>
								</IconButton>
							</div>
							<ProfileManager />
						</div>
						<div className={classes.sectionMobile}>
							<IconButton
								aria-label="show more"
								aria-controls={mobileMenuId}
								aria-haspopup="true"
								onClick={handleMobileMenuOpen}
								color="inherit"
							>
								<MoreIcon />
							</IconButton>
						</div>
					</Toolbar>
				</AppBar>
				{renderMobileMenu}
				{renderMenu}
			</div>
		</ThemeProvider>
	);
}
