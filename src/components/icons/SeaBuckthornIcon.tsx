interface SeaBuckthornIconProps {
  size?: number;
  className?: string;
}

export default function SeaBuckthornIcon({ size = 24, className = '' }: SeaBuckthornIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main branch */}
      <path
        d="M6 12L18 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      
      {/* Berries along the branch - sea buckthorn berries cluster tightly along branches */}
      <circle cx="7" cy="12" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="9" cy="11" r="1.3" fill="currentColor" opacity="0.85" />
      <circle cx="9" cy="13" r="1.3" fill="currentColor" opacity="0.8" />
      <circle cx="11" cy="12" r="1.4" fill="currentColor" opacity="0.9" />
      <circle cx="13" cy="11" r="1.2" fill="currentColor" opacity="0.85" />
      <circle cx="13" cy="13" r="1.2" fill="currentColor" opacity="0.8" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" opacity="0.9" />
      <circle cx="17" cy="11" r="1.1" fill="currentColor" opacity="0.75" />
      <circle cx="17" cy="13" r="1.1" fill="currentColor" opacity="0.75" />
      
      {/* Additional berries for density */}
      <circle cx="8" cy="12" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="10" cy="12" r="1" fill="currentColor" opacity="0.75" />
      <circle cx="12" cy="11" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="13" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="14" cy="12" r="1" fill="currentColor" opacity="0.75" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" opacity="0.7" />
      
      {/* Highlights on some berries */}
      <circle cx="7" cy="11.2" r="0.4" fill="currentColor" opacity="0.3" />
      <circle cx="11" cy="11.2" r="0.4" fill="currentColor" opacity="0.3" />
      <circle cx="15" cy="11.2" r="0.3" fill="currentColor" opacity="0.3" />
      
      {/* Narrow leaves characteristic of sea buckthorn */}
      <path
        d="M10 9L11 7L12 9"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M14 9L15 7L16 9"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M10 15L11 17L12 15"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M14 15L15 17L16 15"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}