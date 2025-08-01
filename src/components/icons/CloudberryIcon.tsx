interface CloudberryIconProps {
  size?: number;
  className?: string;
}

export default function CloudberryIcon({ size = 24, className = '' }: CloudberryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main berry - cloudberries are aggregate berries */}
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.1" />
      
      {/* Individual drupelets making up the cloudberry */}
      <circle cx="10" cy="10" r="1.2" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="10" r="1.2" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.9" />
      <circle cx="10" cy="14" r="1.2" fill="currentColor" opacity="0.8" />
      <circle cx="14" cy="14" r="1.2" fill="currentColor" opacity="0.85" />
      <circle cx="8" cy="12" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="12" r="1" fill="currentColor" opacity="0.75" />
      
      {/* Highlights on drupelets */}
      <circle cx="10" cy="9.5" r="0.3" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="9.5" r="0.3" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="11.5" r="0.3" fill="currentColor" opacity="0.3" />
      
      {/* Stem */}
      <path
        d="M12 8L12 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Distinctive cloudberry leaf */}
      <path
        d="M12 6C10 6 8 5 8 4C8 5 10 6 12 6C14 6 16 5 16 4C16 5 14 6 12 6Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}