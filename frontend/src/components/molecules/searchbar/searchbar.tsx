import React, { useState, useEffect } from "react";
import { AnimatedInput } from "../../atoms/animated-input/animated-input";
import { Search } from "lucide-react";
import {
  extractModIdOrUrl,
  handleDirectModLookup,
} from "@utils";

interface SearchbarProps {
  placeholders?: string[];
  filterButton?: React.ReactNode;
  initialValue?: string;
  onSearch?: (query: string) => void;
  onInput?: (text: string) => void;
}

/**
 * @description Molecule: Searchbar.
 * A styled search container wrapping the AnimatedInput atom.
 * Intercepts numeric mod IDs and GameBanana URLs, automatically looking up the mod,
 * clearing the search input, and opening the details modal or a not found dialog.
 * @param {SearchbarProps} props - Component properties.
 */
export default function Searchbar({
  placeholders = ["Search..."],
  filterButton,
  initialValue = "",
  onSearch,
  onInput,
}: SearchbarProps) {
  const [internalValue, setInternalValue] = useState(initialValue);

  useEffect(() => {
    setInternalValue(initialValue);
  }, [initialValue]);

  const submitSearch = async (rawText: string) => {
    const text = (rawText || "").replace(/\u00a0/g, " ").trim();
    const directId = extractModIdOrUrl(text);

    if (directId !== null) {
      setInternalValue("");
      if (onInput) onInput("");
      if (onSearch) onSearch("");
      await handleDirectModLookup(directId);
      return;
    }

    if (onSearch) onSearch(text);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = e.currentTarget.textContent || "";
      await submitSearch(text);
    }
  };

  const handleClear = () => {
    setInternalValue("");
    if (onInput) onInput("");
    if (onSearch) onSearch("");
  };

  const handleInputChange = (text: string) => {
    setInternalValue(text);
    if (onInput) onInput(text);
  };

  return (
    <div className="flex items-center w-full md:w-auto h-12 md:h-25 rounded-none md:rounded-b-[16px] bg-transparent md:bg-[var(--wb-surface-container)]/70 backdrop-blur-none md:backdrop-blur-xl mx-0 md:mx-2 px-3 md:px-6">
      {filterButton && <div className="hidden md:block mr-3">{filterButton}</div>}
      <AnimatedInput
        placeholders={placeholders}
        icon={
          <Search className="w-5 h-5 md:w-10 md:h-10 ml-3 md:ml-4 text-[var(--wb-primary)] shrink-0" />
        }
        className="h-10 md:h-14 w-full md:w-[40%] flex-1 md:flex-none"
        initialValue={internalValue}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        onIconClick={() => submitSearch(internalValue)}
        onClear={handleClear}
      />
    </div>
  );
}
