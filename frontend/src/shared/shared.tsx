import { Sidebar } from "./components/organisms/sidebar/sidebar";
import { ProgressBar } from "./components/atoms/progress-bar/progress-bar";
import { AppVersion } from "./components/atoms/app-version/app-version";
import Card from "./components/atoms/card-mainmenu/card";
import Titles from "./components/atoms/titles/titles";
import { AnimatedInput } from "./components/atoms/animated-input/animated-input";
import Searchbar from "./components/molecules/searchbar/searchbar";
import { Carousel } from "./components/molecules/Carousel";
import Banner from "./components/molecules/banner/banner";
import { Modal } from "./components/atoms/modal/modal";
import { Pill } from "./components/atoms/pill/pill";
import { Dropdown } from "./components/atoms/dropdown/dropdown";
import { PillDropdown } from "./components/molecules/pill-dropdown/pill-dropdown";
import { EngineFilterPill } from "./components/organisms/engine-filter-pill/engine-filter-pill";
import Utils from "@utils";

/**
 * Global API to access shared components and utilities in Weekbox.
 * Structured using the Atomic Design methodology for a single, centralized access point.
 */
const Shared = {
  /**
   * Atoms: The most basic, indivisible building blocks of the interface.
   */
  atoms: {
    ProgressBar,
    AppVersion,
    Titles,
    AnimatedInput,
    Modal,
    Pill,
    Dropdown,
  },

  /**
   * Molecules: Simple groupings of atoms built to function together as a unit.
   */
  molecules: {
    Card,
    Searchbar,
    Carousel,
    Banner,
    PillDropdown,
  },

  /**
   * Organisms: Complex, independent sections of the interface composed of molecules and/or atoms.
   */
  organisms: {
    Sidebar,
    EngineFilterPill,
  },

  /**
   * Utils: Helper functions and shared logic.
   */
  utils: {
    extractColor: Utils.colors.extractColor,
  },
};

export default Shared;
