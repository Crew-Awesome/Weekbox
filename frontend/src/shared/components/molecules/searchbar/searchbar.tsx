import Shared from "@shared";
import { Search } from "lucide-react";

interface SearchbarProps {
  placeholders?: string[];
  filterButton?: React.ReactNode;
  initialValue?: string;
  onSearch?: (query: string) => void;
}

/**
 * @description Molecule: Searchbar.
 * A styled search container wrapping the AnimatedInput atom.
 * @param {SearchbarProps} props - Component properties.
 */
export default function Searchbar({
  placeholders = ["Search..."],
  filterButton,
  initialValue = "",
  onSearch,
}: SearchbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = e.currentTarget.textContent?.trim() || "";
      if (onSearch) onSearch(text);
    }
  };

  return (
    <div className="flex items-center w-full md:w-auto h-25 rounded-none md:rounded-b-[16px] bg-[var(--wb-surface-container)]/90 backdrop-blur-md mx-0 md:mx-2 px-4 md:px-6">
      {filterButton && <div className="mr-3">{filterButton}</div>}
      <Shared.atoms.AnimatedInput
        placeholders={placeholders}
        icon={
          <Search className="w-10 h-10 ml-4 text-[var(--wb-primary)] shrink-0" />
        }
        className="h-14 w-full md:w-[40%] flex-1 md:flex-none"
        initialValue={initialValue}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
