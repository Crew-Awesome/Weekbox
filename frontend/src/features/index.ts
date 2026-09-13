import { LoadingScreen } from "./loading";
import { Home } from "./home/home";
import { Engines } from "./engines/engines";
import { Instances } from "./instances/instances";
import { Library } from "./library/library";
import { SettingsModal } from "./settings";
import { InfoModal } from "./info";
export type { LoadingTask } from "./loading";
export * from "./settings";
export * from "./info";

const Features = {
  LoadingScreen,
  Home,
  Engines,
  Instances,
  Library,
  SettingsModal,
  InfoModal,
};

export default Features;

