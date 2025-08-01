interface OysterMushroomIconProps {
  size?: number;
  className?: string;
}

export default function OysterMushroomIcon({ size = 24, className = '' }: OysterMushroomIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main oyster cap */}
      <path
        d="M4 10C4 8.34315 5.34315 7 7 7H17C18.6569 7 20 8.34315 20 10V12C20 15.3137 17.3137 18 14 18H10C6.68629 18 4 15.3137 4 12V10Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Smaller oyster cap overlay */}
      <path
        d="M6 8C6 7.44772 6.44772 7 7 7H15C15.5523 7 16 7.44772 16 8V10C16 12.2091 14.2091 14 12 14H10C7.79086 14 6 12.2091 6 10V8Z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Stem attachment */}
      <circle
        cx="8"
        cy="14"
        r="2"
        fill="currentColor"
        opacity="0.6"
      />
      {/* Gills indication */}
      <path
        d="M8 9L14 9M8 11L14 11M8 13L12 13"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  );
}