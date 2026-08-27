import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

interface AnimatedInputProps {
  placeholders?: string[];
  icon?: React.ReactNode;
  className?: string;
  initialValue?: string;
  onInput?: (text: string, html: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * @description Atom: Animated Input.
 * A highly customizable, content-editable input element that displays a rotating list of placeholders using GSAP animations.
 * Commonly used for search bars or dynamic input fields.
 * @param {AnimatedInputProps} props - The component properties.
 */
export const AnimatedInput = ({
  placeholders = ["Type here..."],
  icon,
  className = "",
  initialValue = "",
  onInput,
  onKeyDown,
}: AnimatedInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editableRef.current && initialValue) {
      editableRef.current.textContent = initialValue;
      setIsEmpty(initialValue.trim() === "");
    }
  }, [initialValue]);

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
              gsap.fromTo(
                placeholderRef.current,
                { y: 15, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" },
              );
            }
          },
        });
      }
    }, 3500); // Wait 3.5s before changing

    return () => clearInterval(interval);
  }, [placeholders]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent?.trim() || "";
    const html = e.currentTarget.innerHTML;
    setIsEmpty(text === "");
    if (onInput) {
      onInput(text, html);
    }
  };

  const currentPlaceholder = placeholders[placeholderIndex];

  return (
    <div
      className={`bg-black rounded-2xl flex items-center overflow-hidden ${className}`}
    >
      {icon && (
        <div className="shrink-0 flex items-center justify-center">{icon}</div>
      )}

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
          ref={editableRef}
          contentEditable="true"
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent outline-none text-lg text-[var(--wb-text-main)] truncate z-10"
        />
      </div>
    </div>
  );
};
