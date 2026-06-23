import React, { useId } from "react";

interface LogoProps {
  className?: string;
  showBackground?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "custom";
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  showBackground = true,
  size = "md",
}) => {
  const maskId = useId();

  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-7 h-7 sm:w-6 sm:h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
    custom: "",
  };

  const finalClassName = `${sizeClasses[size] || ""} ${className}`.trim();

  // Color from user request: A beautiful solid emerald/teal (#1ba081 is highly similar to Klenly green)
  return (
    <svg
      viewBox="0 0 100 100"
      className={finalClassName}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={maskId}>
          {/* White elements are fully visible */}
          <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
          {/* Black elements punch holes through the leaf */}
          <g transform="rotate(-35 50 50)">
            {/* Central vein */}
            <path
              d="M 50,21 L 50,79"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Side branch veins on the right */}
            <path
              d="M 50,36 L 62,41 M 50,49 L 64,56 M 50,62 L 62,71"
              stroke="#000000"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        </mask>
      </defs>

      {/* Rounded-square background exactly mimicking the uploaded squircle */}
      {showBackground && (
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx="28"
          fill="var(--color-accent, #10b981)"
        />
      )}

      {/* Leaf contour */}
      <g mask={`url(#${maskId})`}>
        <path
          transform="rotate(-35 50 50)"
          d="M 50,15 C 69,33 69,67 50,85 C 31,67 31,33 50,15 Z"
          fill={showBackground ? "#FFFFFF" : "currentColor"}
        />
      </g>
    </svg>
  );
};
