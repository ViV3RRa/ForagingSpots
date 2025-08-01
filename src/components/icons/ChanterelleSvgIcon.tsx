interface ChanterelleSvgIconProps {
  size?: number;
  className?: string;
}

export default function ChanterelleSvgIcon({ size = 24, className = '' }: ChanterelleSvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chanterelle mushroom shape - trumpet-like with funnel cap */}
      <path
        d="M12 5C8.5 5 6 7.5 6 11C6 12.5 6.5 13.8 7.5 14.8L16.5 14.8C17.5 13.8 18 12.5 18 11C18 7.5 15.5 5 12 5Z"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* Characteristic chanterelle ridges/false gills that fork */}
      <path
        d="M8 11L16 11M7.5 13L16.5 13M9 9L15 9"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.3"
      />
      
      {/* Forked ridges characteristic of chanterelles */}
      <path
        d="M10 10L11 11.5L12 10M13 10L14 11.5L15 10"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
        fill="none"
      />
      
      {/* Wavy cap edge */}
      <path
        d="M6.5 11.5C7 10.5 7.5 11.5 8.5 11C9.5 10.5 10 11.5 11 11C12 10.5 12.5 11.5 13.5 11C14.5 10.5 15 11.5 16 11C17 10.5 17.5 11.5 17.5 11.5"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      
      {/* Hollow stem characteristic of chanterelles */}
      <path
        d="M9.5 14.8L9.5 18.5C9.5 19.3 10.2 20 11 20L13 20C13.8 20 14.5 19.3 14.5 18.5L14.5 14.8"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Hollow center indication */}
      <ellipse
        cx="12"
        cy="17"
        rx="1"
        ry="0.5"
        fill="currentColor"
        opacity="0.2"
      />
      
      {/* Cap highlight */}
      <ellipse
        cx="12"
        cy="8"
        rx="2.5"
        ry="1.2"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}