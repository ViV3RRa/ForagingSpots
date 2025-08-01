interface ElderberryIconProps {
  size?: number;
  className?: string;
}

export default function ElderberryIcon({ size = 24, className = '' }: ElderberryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main cluster structure - elderberries grow in umbrella-like clusters */}
      <path
        d="M12 6L10 10L8 14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M12 6L12 10L10 14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M12 6L14 10L16 14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M12 6L13 10L14 14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      
      {/* Berry clusters */}
      <circle cx="8" cy="14" r="1.2" fill="currentColor" opacity="0.9" />
      <circle cx="10" cy="14" r="1.2" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="14" r="1.2" fill="currentColor" opacity="0.85" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" opacity="0.8" />
      
      {/* Additional smaller berries */}
      <circle cx="9" cy="12" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="12" r="1" fill="currentColor" opacity="0.75" />
      <circle cx="13" cy="12" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="15" cy="12" r="1" fill="currentColor" opacity="0.65" />
      
      {/* Top smaller berries */}
      <circle cx="10" cy="10" r="0.8" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="10" r="0.8" fill="currentColor" opacity="0.65" />
      <circle cx="14" cy="10" r="0.8" fill="currentColor" opacity="0.6" />
      
      {/* Central stem */}
      <path
        d="M12 4L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}