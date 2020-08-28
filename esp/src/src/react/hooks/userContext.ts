import * as React from "react";

export const UserAccountContext = React.createContext(null);
export const GlobalSettingsContext = React.createContext(null);
export const UserNotificationCount = React.createContext(0); //TODO
export const FavoritePages = React.createContext([]); //TODO
export const ToolbarTheme = React.createContext({color: "#199bd7", text: "HPCC Systems | ECL Watch"});

