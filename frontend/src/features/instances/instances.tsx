import React, { useState } from "react";
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Cpu,
  HardDrive,
  SlidersHorizontal,
  Play,
} from "lucide-react";
import Utils from "@utils";

export interface InstanceItem {
  id: string;
  name: string;
  version: string;
  engine: string;
  icon?: string;
  path?: string;
  isDefault?: boolean;
  modsCount?: number;
  lastPlayed?: number;
}

/**
 * Organism / Feature: Instances View.
 * Displays local game engine instances, installed standalone engines,
 * and allows launching, configuring, and adding new engine versions.
 */
export const Instances: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  /**
   * Mock / default placeholder instances to demonstrate the UI layout
   * until native instance detection is wired to local paths.
   */
  const [instances] = useState<InstanceItem[]>([
    {
      id: "psych-0.7.3",
      name: "Psych Engine",
      version: "0.7.3",
      engine: "Psych Engine",
      icon: "/assets/icons/engines/psych.webp",
      isDefault: true,
      modsCount: 0,
    },
    {
      id: "codename-1.0.0",
      name: "Codename Engine",
      version: "Latest",
      engine: "Codename Engine",
      icon: "/assets/icons/engines/codename.webp",
      isDefault: false,
      modsCount: 0,
    },
  ]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      Utils.toast.info("Scanning local directories for game engines...", {
        title: "Instances Scanner",
      });
      setTimeout(() => {
        setIsScanning(false);
        Utils.toast.success("Instance scan completed.", {
          title: "Instances Scanner",
        });
      }, 1200);
    } catch {
      setIsScanning(false);
    }
  };

  const filteredInstances = instances.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.engine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--wb-on-surface)] tracking-tight">
            Instances
          </h1>
          <p className="text-sm md:text-base text-[var(--wb-on-surface-variant)] mt-1 opacity-80">
            Manage, configure, and launch your standalone engine installations and game environments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/40 text-[var(--wb-on-surface)] text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>Scan Engines</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Utils.toast.info("Instance creation wizard coming soon.", {
                title: "New Instance",
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-sm font-bold transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Instance</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--wb-on-surface-variant)] opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instances..."
            className="w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-outline-variant)]/40 focus:border-[var(--wb-primary)] rounded-2xl pl-10 pr-4 py-2 text-sm text-[var(--wb-on-surface)] placeholder:text-[var(--wb-on-surface-variant)]/50 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Instances Grid */}
      {filteredInstances.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstances.map((inst) => (
            <div
              key={inst.id}
              className="flex flex-col p-5 rounded-3xl bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/40 hover:border-[var(--wb-primary)]/50 transition-all group shadow-sm hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--wb-surface-bright)] p-2 flex items-center justify-center shrink-0 border border-white/5">
                    {inst.icon ? (
                      <img
                        src={inst.icon}
                        alt={inst.name}
                        className="w-8 h-8 object-contain brightness-125"
                      />
                    ) : (
                      <Cpu className="w-6 h-6 text-[var(--wb-primary)]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--wb-on-surface)] group-hover:text-[var(--wb-primary)] transition-colors">
                      {inst.name}
                    </h2>
                    <span className="text-xs font-semibold text-[var(--wb-on-surface-variant)] opacity-75">
                      v{inst.version}
                    </span>
                  </div>
                </div>

                {inst.isDefault && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 uppercase tracking-wider">
                    Default
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--wb-on-surface-variant)] mb-5 pt-3 border-t border-[var(--wb-outline-variant)]/20">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 opacity-60" />
                  <span>Ready</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 opacity-60" />
                  <span>{inst.modsCount || 0} mods assigned</span>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    Utils.toast.info(`Launching ${inst.name}...`, {
                      title: "Launch Instance",
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    Utils.toast.info(`Configuring ${inst.name}...`, {
                      title: "Configure Instance",
                    });
                  }}
                  className="p-2.5 rounded-xl bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/40 transition-colors cursor-pointer"
                  title="Configure instance"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-[var(--wb-surface-container-low)]/50 border border-white/5 my-8">
          <Layers className="w-12 h-12 text-[var(--wb-on-surface-variant)] opacity-40 mb-3" />
          <h2 className="text-xl font-bold text-[var(--wb-on-surface)]">No instances found</h2>
          <p className="text-sm text-[var(--wb-on-surface-variant)] mt-1 max-w-sm">
            No instances match your search query or none have been added yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default Instances;
