interface PorciniIconProps {
  size?: number;
  className?: string;
}

export default function PorciniIcon({ size = 24, className = '' }: PorciniIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Mushroom cap */}
      <path
        d="M5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12C19 13.1046 18.1046 14 17 14H7C5.89543 14 5 13.1046 5 12Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Mushroom stem */}
      <path
        d="M10 14H14V19C14 19.5523 13.5523 20 13 20H11C10.4477 20 10 19.5523 10 19V14Z"
        fill="currentColor"
        opacity="0.8"
      />
      {/* Cap highlight */}
      <ellipse
        cx="12"
        cy="10"
        rx="3"
        ry="1.5"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}