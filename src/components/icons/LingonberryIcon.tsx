interface LingonberryIconProps {
  size?: number;
  className?: string;
}

export default function LingonberryIcon({ size = 24, className = '' }: LingonberryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Berry cluster */}
      <circle cx="9" cy="9" r="2.5" fill="currentColor" opacity="0.9" />
      <circle cx="13" cy="11" r="2" fill="currentColor" opacity="0.85" />
      <circle cx="11" cy="14" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="15" cy="15" r="1.5" fill="currentColor" opacity="0.75" />
      <circle cx="7" cy="13" r="1.5" fill="currentColor" opacity="0.7" />
      
      {/* Highlight spots */}
      <circle cx="9" cy="8" r="0.7" fill="currentColor" opacity="0.3" />
      <circle cx="13" cy="10" r="0.5" fill="currentColor" opacity="0.3" />
      <circle cx="11" cy="13" r="0.5" fill="currentColor" opacity="0.3" />
      
      {/* Branch and leaves */}
      <path
        d="M8 6L12 8L14 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
        fill="none"
      />
      
      {/* Small leaves */}
      <ellipse cx="8" cy="6" rx="2" ry="1" fill="currentColor" opacity="0.4" />
      <ellipse cx="11" cy="7" rx="1.5" ry="0.8" fill="currentColor" opacity="0.4" />
      <ellipse cx="13" cy="9" rx="1.2" ry="0.6" fill="currentColor" opacity="0.4" />
    </svg>
  );
}