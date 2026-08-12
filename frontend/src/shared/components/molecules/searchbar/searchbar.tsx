import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";

interface SearchbarProps {
  placeholders?: string[];
}

export default function Searchbar({ placeholders = ["Search..."] }: SearchbarProps) {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isEmpty, setIsEmpty] = useState(true);
    const placeholderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!placeholders || placeholders.length <= 1) return;
        
        const interval = setInterval(() => {
            if (placeholderRef.current) {
                gsap.to(placeholderRef.current, {
                    y: -15,
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in",
                    onComplete: () => {
                        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
                        
                        if (placeholderRef.current) {
                            gsap.fromTo(placeholderRef.current, 
                                { y: 15, opacity: 0 }, 
                                { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
                            );
                        }
                    }
                });
            }
        }, 3500); // Wait 3.5s before changing
        
        return () => clearInterval(interval);
    }, [placeholders]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const text = e.currentTarget.textContent?.trim() || "";
        setIsEmpty(text === "");
    };

    const currentPlaceholder = placeholders[placeholderIndex];

    return (
        <div className="flex items-start w-full md:w-auto h-25 rounded-none md:rounded-b-[16px] bg-[var(--wb-surface-container)]/90 backdrop-blur-md mx-0 md:mx-2 px-4 md:px-6">
            <div className="bg-black rounded-2xl h-14 mt-5 w-[80%] mx-auto md:w-[40%] md:mx-0 flex items-center overflow-hidden">
                <Search className="w-10 h-10 ml-4 text-[var(--wb-primary)] shrink-0"></Search>
                
                <div className="relative w-full ml-3 mr-3 flex items-center">
                    {isEmpty && (
                        <div 
                            ref={placeholderRef}
                            className="absolute left-0 right-0 text-lg text-[var(--wb-text-muted)] pointer-events-none truncate"
                        >
                            {currentPlaceholder}
                        </div>
                    )}
                    
                    <div 
                        contentEditable="true"
                        suppressContentEditableWarning={true}
                        onInput={handleInput}
                        className="w-full bg-transparent outline-none text-lg text-[var(--wb-text-main)] truncate z-10"
                    />
                </div>
            </div>
        </div>
    );
}