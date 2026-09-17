import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { X } from "lucide-react";

interface AnimatedInputProps {
  placeholders?: string[];
  icon?: React.ReactNode;
  onIconClick?: () => void;
  className?: string;
  initialValue?: string;
  onInput?: (text: string, html: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onClear?: () => void;
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
  onIconClick,
  className = "",
  initialValue = "",
  onInput,
  onKeyDown,
  onClear,
}: AnimatedInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editableRef.current) {
      if (editableRef.current.textContent !== initialValue) {
        editableRef.current.textContent = initialValue;
      }
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
    }, 3500);

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

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const cleanText = text.replace(/[\r\n]+/g, " ");

    if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
      document.execCommand("insertText", false, cleanText);
    } else {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      selection.deleteFromDocument();
      const textNode = document.createTextNode(cleanText);
      const range = selection.getRangeAt(0);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (editableRef.current) {
      const currentText = editableRef.current.textContent?.trim() || "";
      setIsEmpty(currentText === "");
      if (onInput) {
        onInput(currentText, editableRef.current.innerHTML);
      }
    }
  };

  const currentPlaceholder = placeholders[placeholderIndex];

  return (
    <div
      className={`bg-[var(--wb-surface-container-high)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] rounded-2xl flex items-center overflow-hidden transition-colors ${className}`}
    >
      {icon && (
        <div
          onClick={onIconClick}
          className={`shrink-0 flex items-center justify-center text-[var(--wb-icon-default)] ${
            onIconClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
          }`}
          title={onIconClick ? "Search" : undefined}
        >
          {icon}
        </div>
      )}

      <div className="relative w-full ml-3 mr-3 flex items-center">
        {isEmpty && (
          <div
            ref={placeholderRef}
            className="absolute left-0 right-0 text-sm md:text-lg text-[var(--wb-text-muted)] pointer-events-none truncate"
          >
            {currentPlaceholder}
          </div>
        )}

        <div
          ref={editableRef}
          contentEditable="true"
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent outline-none text-sm md:text-lg text-[var(--wb-text-main)] truncate z-10"
        />

        {onClear && !isEmpty && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (editableRef.current) {
                editableRef.current.textContent = "";
              }
              setIsEmpty(true);
              onClear();
            }}
            className="p-1.5 text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer rounded-full z-20 shrink-0"
            title="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
