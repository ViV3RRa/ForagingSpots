interface RoseHipIconProps {
  size?: number;
  className?: string;
}

export default function RoseHipIcon({ size = 24, className = '' }: RoseHipIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main hip body - oval shaped */}
      <ellipse cx="12" cy="13" rx="3" ry="4" fill="currentColor" opacity="0.9" />
      
      {/* Hip crown/sepals at the bottom */}
      <path
        d="M10 17L9 19M12 17L12 19M14 17L15 19M11 17L10.5 19M13 17L13.5 19"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Highlight on the hip */}
      <ellipse cx="11" cy="11" rx="1" ry="1.5" fill="currentColor" opacity="0.3" />
      
      {/* Stem attachment */}
      <path
        d="M12 9L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Small thorns on stem */}
      <path
        d="M11 7L10.5 6.5M13 8L13.5 7.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
      
      {/* Rose hip characteristic ridges */}
      <path
        d="M9.5 12C9.5 12 10.5 11.5 12 11.5C13.5 11.5 14.5 12 14.5 12"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
        fill="none"
      />
      <path
        d="M9.5 14C9.5 14 10.5 13.5 12 13.5C13.5 13.5 14.5 14 14.5 14"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
        fill="none"
      />
    </svg>
  );
}