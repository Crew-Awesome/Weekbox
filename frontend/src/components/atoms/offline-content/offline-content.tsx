import React from "react";

export interface OfflineContentProps {
  title?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const OfflineContent: React.FC<OfflineContentProps> = ({
  title = "You're Offline",
  message = "No internet connection detected. Please connect to the internet to explore content.",
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: {
      img: "w-36 sm:w-48 h-auto object-contain drop-shadow-md",
      title: "text-base sm:text-lg font-black mt-2.5",
      message: "text-xs sm:text-sm mt-1 max-w-xs",
      container: "py-4 px-3",
    },
    md: {
      img: "w-[75%] max-w-[360px] sm:max-w-[480px] md:max-w-[600px] h-auto max-h-[40vh] object-contain drop-shadow-xl",
      title: "text-xl sm:text-3xl font-black mt-4",
      message: "text-sm sm:text-base md:text-lg mt-2 max-w-md",
      container: "py-6 sm:py-10 px-4",
    },
    lg: {
      img: "w-[85%] max-w-[480px] sm:max-w-[620px] md:max-w-[760px] lg:max-w-[880px] h-auto max-h-[50vh] object-contain drop-shadow-2xl",
      title: "text-2xl sm:text-4xl md:text-5xl font-black mt-6 tracking-tight",
      message: "text-base sm:text-lg md:text-xl mt-3 max-w-xl",
      container: "py-8 sm:py-16 px-6",
    },
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center w-full text-center select-none animate-in fade-in duration-300 ${sizeClasses.container} ${className}`}
    >
      <img
        src="/assets/images/offline.png"
        alt={title}
        className={`${sizeClasses.img} select-none`}
      />
      <h2
        className={`text-[var(--wb-on-surface)] tracking-tight font-extrabold ${sizeClasses.title}`}
      >
        {title}
      </h2>
      <p
        className={`text-[var(--wb-on-surface-variant)] leading-relaxed opacity-80 ${sizeClasses.message}`}
      >
        {message}
      </p>
    </div>
  );
};

export default OfflineContent;
