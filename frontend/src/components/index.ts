import { AnimatedInput } from "./atoms/animated-input/animated-input";
import { AppVersion } from "./atoms/app-version/app-version";
import Card from "./atoms/card-mainmenu/card";
import { Dropdown } from "./atoms/dropdown/dropdown";
import { FlagIcon, SpainFlag, EnglishFlag } from "./atoms/flags/flags";
import { Modal } from "./atoms/modal/modal";
import { Pill } from "./atoms/pill/pill";
import { ProgressBar } from "./atoms/progress-bar/progress-bar";
import Titles from "./atoms/titles/titles";
import { Toast } from "./atoms/toast";
import { LoadingContent } from "./atoms/loading-content/loading-content";
import { OfflineContent } from "./atoms/offline-content/offline-content";

import { Carousel } from "./molecules/Carousel";
import Banner from "./molecules/banner/banner";
import { ConfirmationModal } from "./molecules/confirmation-modal/confirmation-modal";
import { PillDropdown } from "./molecules/pill-dropdown/pill-dropdown";
import Searchbar from "./molecules/searchbar/searchbar";
import { ToastContainer } from "./molecules/toast-container";

import { EngineFilterPill } from "./organisms/engine-filter-pill/engine-filter-pill";
import { Sidebar } from "./organisms/sidebar/sidebar";
import { InfoModal } from "./organisms/info-modal/info-modal";
import { LoadingScreen } from "./organisms/loading-screen/loading-screen";
import { SettingsModal } from "./organisms/settings-modal/settings-modal";
import { ErrorBoundary } from "./organisms/error-boundary/error-boundary";

export * from "./atoms/animated-input/animated-input";
export * from "./atoms/app-version/app-version";
export { default as Card } from "./atoms/card-mainmenu/card";
export * from "./atoms/dropdown/dropdown";
export * from "./atoms/flags/flags";
export * from "./atoms/modal/modal";
export * from "./atoms/pill/pill";
export * from "./atoms/progress-bar/progress-bar";
export { default as Titles } from "./atoms/titles/titles";
export * from "./atoms/toast";
export * from "./atoms/loading-content/loading-content";
export * from "./atoms/offline-content/offline-content";

export * from "./molecules/Carousel";
export { default as Banner } from "./molecules/banner/banner";
export * from "./molecules/confirmation-modal/confirmation-modal";
export * from "./molecules/pill-dropdown/pill-dropdown";
export { default as Searchbar } from "./molecules/searchbar/searchbar";
export * from "./molecules/toast-container";

export * from "./organisms/engine-filter-pill/engine-filter-pill";
export * from "./organisms/sidebar/sidebar";
export * from "./organisms/info-modal/info-modal";
export * from "./organisms/loading-screen/loading-screen";
export * from "./organisms/settings-modal/settings-modal";
export * from "./organisms/error-boundary/error-boundary";

/**
 * Atomic Design Components Catalog (Atoms, Molecules, Organisms).
 */
export const Components = {
  atoms: {
    AnimatedInput,
    AppVersion,
    Card,
    Dropdown,
    FlagIcon,
    SpainFlag,
    EnglishFlag,
    Modal,
    Pill,
    ProgressBar,
    Titles,
    Toast,
    LoadingContent,
    OfflineContent,
  },
  molecules: {
    Carousel,
    Banner,
    Card,
    ConfirmationModal,
    PillDropdown,
    Searchbar,
    ToastContainer,
  },
  organisms: {
    EngineFilterPill,
    Sidebar,
    InfoModal,
    LoadingScreen,
    SettingsModal,
    ErrorBoundary,
  },
};

export default Components;
