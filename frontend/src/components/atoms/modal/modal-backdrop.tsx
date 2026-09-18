import React from "react";

interface ModalBackdropProps {
  backdropImage?: string;
  baseOverlayClass: string;
  showCirclePattern?: boolean;
}

export const ModalBackdrop: React.FC<ModalBackdropProps> = ({
  backdropImage,
  baseOverlayClass,
  showCirclePattern,
}) => {
  return (
    <>
      {backdropImage && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src={backdropImage}
            alt=""
            className="w-full h-full object-cover filter blur-xl scale-105 opacity-100 select-none pointer-events-none"
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-colors ${
          backdropImage ? "bg-black/30 backdrop-blur-md" : baseOverlayClass
        }`}
        aria-hidden="true"
      />

      {showCirclePattern && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `radial-gradient(circle, transparent 1.5px, rgba(0, 0, 0, 0.3) 1.5px)`,
            backgroundSize: "6px 6px",
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
};
