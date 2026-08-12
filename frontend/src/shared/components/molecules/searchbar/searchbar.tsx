import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface SearchbarProps {
  placeholders?: string[];
}

export default function Searchbar({ placeholders = ["Search..."] }: SearchbarProps) {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        if (!placeholders || placeholders.length <= 1) return;
        
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        
        return () => clearInterval(interval);
    }, [placeholders]);

    const currentPlaceholder = placeholders[placeholderIndex];

    return (
        <div className="flex items-start w-full md:w-auto h-25 rounded-t-none rounded-b-[16px] bg-[var(--wb-surface-container)] mx-0 md:mx-2 px-4 md:px-6">
            <div className="bg-black rounded-2xl h-14 mt-5 w-[40%] flex items-center overflow-hidden">
                <Search className="w-5 h-5 ml-4 text-[var(--wb-icon-default)] shrink-0"></Search>
                <input 
                    type="text" 
                    className="ml-3 w-full h-full bg-transparent outline-none text-[var(--wb-text-main)] placeholder-[var(--wb-text-muted)] transition-all duration-300"
                    placeholder={currentPlaceholder}
                />
            </div>
        </div>
    );
}