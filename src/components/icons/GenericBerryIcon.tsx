interface GenericBerryIconProps {
  size?: number;
  className?: string;
}

export default function GenericBerryIcon({ size = 24, className = '' }: GenericBerryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Generic berry cluster */}
      <circle cx="10" cy="9" r="2.5" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="11" r="2" fill="currentColor" opacity="0.85" />
      <circle cx="8" cy="13" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="13" cy="15" r="1.8" fill="currentColor" opacity="0.75" />
      <circle cx="16" cy="13" r="1.5" fill="currentColor" opacity="0.7" />
      
      {/* Highlights */}
      <circle cx="10" cy="8" r="0.8" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="10" r="0.6" fill="currentColor" opacity="0.3" />
      <circle cx="8" cy="12" r="0.6" fill="currentColor" opacity="0.3" />
      
      {/* Generic leaf and stem */}
      <path
        d="M12 5L12 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Simple leaf shapes */}
      <ellipse cx="10" cy="6" rx="2" ry="1" fill="currentColor" opacity="0.4" />
      <ellipse cx="14" cy="7" rx="1.5" ry="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}