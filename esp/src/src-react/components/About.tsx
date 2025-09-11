import * as React from "react";
import { Dialog, Button, SelectTabData, SelectTabEvent, Spinner, Tab, TabList, TabValue, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions, DialogTrigger } from "@fluentui/react-components";
import nlsHPCC from "src/nlsHPCC";
import { useCheckFeatures, fetchLatestReleases } from "../hooks/platform";
import { TableGroup } from "./forms/Groups";
import { Fields } from "./forms/Fields";

interface AboutProps {
    eclwatchVersion: string;
    show?: boolean;
    onClose?: () => void;
}

const dateOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

export const About: React.FunctionComponent<AboutProps> = ({
    eclwatchVersion = "",
    show = false,
    onClose = () => { }
}) => {

    const [activeTab, setActiveTab] = React.useState<TabValue>("about");
    const [loaded, setLoaded] = React.useState(0);
    const [latestReleases, setLatestReleases] = React.useState<Fields>({});

    const features = useCheckFeatures();

    React.useEffect(() => {
        if (show && loaded === 0) {
            setLoaded(1);
            fetchLatestReleases().then(releases => {
                const fields: Fields = {};
                releases.forEach(release => {
                    fields[release.tag_name] = {
                        label: release.tag_name,
                        type: "link",
                        value: release.html_url.replace("github.com/hpcc-systems/HPCC-Platform", "..."),
                        href: release.html_url,
                        newTab: true,
                        readonly: true
                    };
                });
                setLoaded(2);
                setLatestReleases(fields);
            });
        }
    }, [loaded, show]);

    const onTabSelect = React.useCallback((event: SelectTabEvent, data: SelectTabData) => {
        setActiveTab(data.value);
    }, []);

    return <Dialog open={show} modalType="modal">
        <DialogSurface style={{ minWidth: 640 }}>
            <DialogBody>
                <DialogTitle>{nlsHPCC.AboutHPCCSystems}</DialogTitle>
                <DialogContent>
                    <TabList selectedValue={activeTab} onTabSelect={onTabSelect}>
                        <Tab value="about">{nlsHPCC.About}</Tab>
                        <Tab value="latest">{nlsHPCC.LatestReleases}</Tab>
                    </TabList>
                    <div>
                        {activeTab === "about" &&
                            <div style={{ minHeight: "208px", paddingTop: "32px" }}>
                                <TableGroup width="100%" fields={{
                                    platformVersion: { label: `${nlsHPCC.Platform}:`, type: "string", value: features?.version || "???", readonly: true },
                                    platformDate: { label: `${nlsHPCC.BuildDate}:`, type: "string", value: features?.timestamp?.toLocaleDateString(undefined, dateOptions) || "???", readonly: true },
                                    eclwatchVersion: { label: "ECL Watch:", type: "string", value: eclwatchVersion, readonly: true },
                                }}>
                                </TableGroup>
                            </div>
                        }
                        {activeTab === "latest" && (loaded >= 2 ?
                            <div style={{ minHeight: "208px", overflow: "hidden", paddingTop: "32px" }}>
                                <TableGroup width="100%" fields={latestReleases}>
                                </TableGroup>
                            </div> :
                            <div style={{ minHeight: "208px", paddingTop: "32px" }}>
                                <Spinner labelPosition="below" label={nlsHPCC.Loading} />
                            </div>)
                        }
                    </div>
                </DialogContent>
                <DialogActions>
                    <DialogTrigger disableButtonEnhancement>
                        <Button onClick={onClose} appearance="primary" >{nlsHPCC.OK}</Button>
                    </DialogTrigger>
                </DialogActions>
            </DialogBody>
        </DialogSurface>
    </Dialog>;
};
