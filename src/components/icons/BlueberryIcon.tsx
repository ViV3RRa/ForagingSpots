interface BlueberryIconProps {
  size?: number;
  className?: string;
}

export default function BlueberryIcon({ size = 24, className = '' }: BlueberryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main berry cluster */}
      <circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.9" />
      <circle cx="14" cy="10" r="2.5" fill="currentColor" opacity="0.8" />
      <circle cx="10" cy="13" r="2.5" fill="currentColor" opacity="0.85" />
      <circle cx="16" cy="15" r="2" fill="currentColor" opacity="0.75" />
      
      {/* Small berry details */}
      <circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="10" r="0.8" fill="currentColor" opacity="0.3" />
      <circle cx="10" cy="13" r="0.8" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="15" r="0.6" fill="currentColor" opacity="0.3" />
      
      {/* Stem and leaves */}
      <path
        d="M12 4L12 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M10 5C10 4.5 10.5 4 11 4C11.5 4 12 4.5 12 5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M14 6C14 5.5 14.5 5 15 5C15.5 5 16 5.5 16 6"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}