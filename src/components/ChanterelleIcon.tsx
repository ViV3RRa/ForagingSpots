import chanterelleImage from '/chanterelle.jpg';

interface ChanterelleIconProps {
  size?: number;
  className?: string;
}

export default function ChanterelleIcon({ size = 20, className = '' }: ChanterelleIconProps) {
  return (
    <div 
      className={`inline-block ${className}`}
      style={{ 
        width: size, 
        height: size,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '2px',
        background: 'transparent'
      }}
    >
      <img
        src={chanterelleImage}
        alt="Chanterelle"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'brightness(0.95) contrast(1.15) saturate(1.3)',
          background: 'transparent',
          // Use CSS to remove white background by making it transparent
          WebkitMask: `url(${chanterelleImage}) no-repeat center/contain`,
          mask: `url(${chanterelleImage}) no-repeat center/contain`,
          backgroundColor: '#f97316', // Orange color to match chanterelles
        }}
      />
      {/* Fallback for browsers that don't support mask */}
      <img
        src={chanterelleImage}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          mixBlendMode: 'multiply',
          filter: 'contrast(1.2) saturate(1.4) brightness(0.9)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}