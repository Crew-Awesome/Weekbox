import React, { useMemo } from "react";
import { PillDropdown } from "../../molecules/pill-dropdown/pill-dropdown";
import { getSupportedEngineCategories } from "../../../core/services/gamebanana/constants";

import { Globe } from "lucide-react";

export interface EngineFilterPillProps {
  value: string | string[];
  onChange: (value: any) => void;
  isMulti?: boolean;
}

export const EngineFilterPill: React.FC<EngineFilterPillProps> = ({
  value,
  onChange,
  isMulti = false,
}) => {
  const options = useMemo(() => {
    const engines = getSupportedEngineCategories().map((cat) => ({
      label: cat.name,
      value: cat.id,
      icon: cat.icon,
    }));

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
      iconPosition="left"
      align="left"
      isMulti={isMulti}
    />
  );
};
