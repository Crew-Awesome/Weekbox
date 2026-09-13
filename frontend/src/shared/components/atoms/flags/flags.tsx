import React from "react";

export interface FlagProps {
  className?: string;
}

/**
 * Clean SVG vector flag of Spain.
 * Strictly vector graphics, no emoji characters.
 */
export const SpainFlag: React.FC<FlagProps> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 640 480"
      className={`w-5 h-3.5 object-cover rounded-xs inline-block shrink-0 shadow-xs border border-white/10 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path fill="#AA151B" d="M0 0h640v480H0z" />
      <path fill="#F1BF00" d="M0 120h640v240H0z" />
      <g transform="translate(130, 200) scale(1.1)">
        <path
          d="M0,0 h30 v25 a15,15 0 0,1 -30,0 z"
          fill="#AA151B"
          stroke="#F1BF00"
          strokeWidth="2"
        />
        <path d="M7,6 h16 v16 a8,8 0 0,1 -16,0 z" fill="#F1BF00" />
      </g>
    </svg>
  );
};

/**
 * Clean SVG vector flag representing the English language (US flag).
 * Strictly vector graphics, no emoji characters.
 */
export const EnglishFlag: React.FC<FlagProps> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 640 480"
      className={`w-5 h-3.5 object-cover rounded-xs inline-block shrink-0 shadow-xs border border-white/10 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="640" height="480" fill="#B22234" />
      <path
        d="M0,37h640v37H0z M0,111h640v37H0z M0,185h640v37H0z M0,259h640v37H0z M0,333h640v37H0z M0,407h640v37H0z"
        fill="#FFFFFF"
      />
      <rect width="260" height="259" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <circle cx="30" cy="30" r="10" />
        <circle cx="80" cy="30" r="10" />
        <circle cx="130" cy="30" r="10" />
        <circle cx="180" cy="30" r="10" />
        <circle cx="230" cy="30" r="10" />
        <circle cx="55" cy="65" r="10" />
        <circle cx="105" cy="65" r="10" />
        <circle cx="155" cy="65" r="10" />
        <circle cx="205" cy="65" r="10" />
        <circle cx="30" cy="100" r="10" />
        <circle cx="80" cy="100" r="10" />
        <circle cx="130" cy="100" r="10" />
        <circle cx="180" cy="100" r="10" />
        <circle cx="230" cy="100" r="10" />
        <circle cx="55" cy="135" r="10" />
        <circle cx="105" cy="135" r="10" />
        <circle cx="155" cy="135" r="10" />
        <circle cx="205" cy="135" r="10" />
        <circle cx="30" cy="170" r="10" />
        <circle cx="80" cy="170" r="10" />
        <circle cx="130" cy="170" r="10" />
        <circle cx="180" cy="170" r="10" />
        <circle cx="230" cy="170" r="10" />
        <circle cx="55" cy="205" r="10" />
        <circle cx="105" cy="205" r="10" />
        <circle cx="155" cy="205" r="10" />
        <circle cx="205" cy="205" r="10" />
        <circle cx="30" cy="240" r="10" />
        <circle cx="80" cy="240" r="10" />
        <circle cx="130" cy="240" r="10" />
        <circle cx="180" cy="240" r="10" />
        <circle cx="230" cy="240" r="10" />
      </g>
    </svg>
  );
};

export interface FlagIconProps extends FlagProps {
  language: "es" | "en" | string;
}

/**
 * General FlagIcon component that renders the appropriate vector flag based on the language code.
 */
export const FlagIcon: React.FC<FlagIconProps> = ({
  language,
  className = "",
}) => {
  if (language === "es") {
    return <SpainFlag className={className} />;
  }
  return <EnglishFlag className={className} />;
};
