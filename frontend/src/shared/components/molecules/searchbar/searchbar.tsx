import Shared from "@shared";
import { Search } from "lucide-react";

interface SearchbarProps {
  placeholders?: string[];
}

export default function Searchbar({
  placeholders = ["Search..."],
}: SearchbarProps) {
  return (
    <div className="flex items-start w-full md:w-auto h-25 rounded-none md:rounded-b-[16px] bg-[var(--wb-surface-container)]/90 backdrop-blur-md mx-0 md:mx-2 px-4 md:px-6">
      <Shared.atoms.AnimatedInput
        placeholders={placeholders}
        icon={
          <Search className="w-10 h-10 ml-4 text-[var(--wb-primary)] shrink-0" />
        }
        className="h-14 mt-5 w-[80%] mx-auto md:w-[40%] md:mx-0"
      />
    </div>
  );
}
