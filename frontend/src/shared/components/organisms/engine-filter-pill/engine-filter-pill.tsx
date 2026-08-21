import React, { useMemo } from "react";
import { PillDropdown } from "../../molecules/pill-dropdown/pill-dropdown";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";

import { Globe } from "lucide-react";

export interface EngineFilterPillProps {
  value: string;
  onChange: (value: string) => void;
}

export const EngineFilterPill: React.FC<EngineFilterPillProps> = ({ value, onChange }) => {
  const options = useMemo(() => {
    // Mapeamos los engines disponibles desde las constantes del Core
    const engines = Object.keys(ENGINE_CATEGORIES).map((key) => {
      const engine = ENGINE_CATEGORIES[Number(key)];
      return {
        label: engine.name,
        value: engine.id,
        icon: engine.icon,
      };
    });

    return [
      { label: "All Engines", value: "all", icon: <Globe size={16} /> },
      ...engines,
    ];
  }, []);

  return (
    <PillDropdown
      label="Engine"
      value={value}
      onChange={onChange}
      options={options}
      iconPosition="right"
      align="right"
    />
  );
};
