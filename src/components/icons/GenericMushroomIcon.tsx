interface GenericMushroomIconProps {
  size?: number;
  className?: string;
}

export default function GenericMushroomIcon({ size = 24, className = '' }: GenericMushroomIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Generic mushroom cap */}
      <path
        d="M5 11C5 7.68629 7.68629 5 11 5H13C16.3137 5 19 7.68629 19 11C19 12.6569 17.6569 14 16 14H8C6.34315 14 5 12.6569 5 11Z"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* Mushroom stem */}
      <rect
        x="10"
        y="14"
        width="4"
        height="6"
        rx="2"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Cap highlight */}
      <ellipse
        cx="12"
        cy="9"
        rx="2.5"
        ry="1.2"
        fill="currentColor"
        opacity="0.3"
      />
      
      {/* Small spots on cap for visual interest */}
      <circle cx="9" cy="10" r="0.7" fill="currentColor" opacity="0.4" />
      <circle cx="15" cy="9" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="13" cy="11" r="0.6" fill="currentColor" opacity="0.4" />
    </svg>
  );
}