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
                <Search className="w-10 h-10 ml-4 text-[var(--wb-icon-default)] shrink-0"></Search>
                <div 
                    contentEditable="true"
                    suppressContentEditableWarning={true}
                    className="ml-3 mr-3 w-full bg-transparent outline-none text-lg text-[var(--wb-text-main)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--wb-text-muted)] empty:before:pointer-events-none transition-all duration-300 truncate"
                    data-placeholder={currentPlaceholder}
                />
            </div>
        </div>
    );
}