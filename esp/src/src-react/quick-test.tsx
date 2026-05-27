import { ReactRoot } from "src/react/render";
import { DockPanelTest } from "./components/DockPanelTest";

import "src-react-css/index.css";

const root = ReactRoot.create(document.getElementById("placeholder"));
root.render(DockPanelTest, {});
