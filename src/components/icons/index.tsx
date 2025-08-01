// Mushroom Icons
export { default as ChanterelleSvgIcon } from './ChanterelleSvgIcon';
export { default as PorciniIcon } from './PorciniIcon';
export { default as OysterMushroomIcon } from './OysterMushroomIcon';
export { default as GenericMushroomIcon } from './GenericMushroomIcon';

// Berry Icons
export { default as BlueberryIcon } from './BlueberryIcon';
export { default as LingonberryIcon } from './LingonberryIcon';
export { default as CloudberryIcon } from './CloudberryIcon';
export { default as ElderberryIcon } from './ElderberryIcon';
export { default as RoseHipIcon } from './RoseHipIcon';
export { default as SeaBuckthornIcon } from './SeaBuckthornIcon';
export { default as GenericBerryIcon } from './GenericBerryIcon';

// Utility function to get icon by foraging type
import type { ForagingType } from '../types';
import ChanterelleSvgIcon from './ChanterelleSvgIcon';
import PorciniIcon from './PorciniIcon';
import OysterMushroomIcon from './OysterMushroomIcon';
import BlueberryIcon from './BlueberryIcon';
import LingonberryIcon from './LingonberryIcon';
import CloudberryIcon from './CloudberryIcon';
import ElderberryIcon from './ElderberryIcon';
import RoseHipIcon from './RoseHipIcon';
import SeaBuckthornIcon from './SeaBuckthornIcon';
import GenericMushroomIcon from './GenericMushroomIcon';
import GenericBerryIcon from './GenericBerryIcon';

export interface ForagingIconProps {
  size?: number;
  className?: string;
}

// Extended foraging type to include new Danish varieties
export type ExtendedForagingType = ForagingType | 'porcini' | 'oyster' | 'elderberry' | 'rosehip' | 'seabuckthorn' | 'generic_mushroom' | 'generic_berry';

// eslint-disable-next-line react-refresh/only-export-components
export function getForagingIcon(type: ExtendedForagingType, props: ForagingIconProps = {}) {
  const iconProps = { size: 24, ...props };
  
  switch (type) {
    case 'chanterelle':
      return <ChanterelleSvgIcon {...iconProps} />;
    case 'porcini':
      return <PorciniIcon {...iconProps} />;
    case 'oyster':
      return <OysterMushroomIcon {...iconProps} />;
    case 'blueberry':
      return <BlueberryIcon {...iconProps} />;
    case 'lingonberry':
      return <LingonberryIcon {...iconProps} />;
    case 'cloudberry':
      return <CloudberryIcon {...iconProps} />;
    case 'elderberry':
      return <ElderberryIcon {...iconProps} />;
    case 'rosehip':
      return <RoseHipIcon {...iconProps} />;
    case 'seabuckthorn':
      return <SeaBuckthornIcon {...iconProps} />;
    case 'generic_mushroom':
      return <GenericMushroomIcon {...iconProps} />;
    case 'generic_berry':
      return <GenericBerryIcon {...iconProps} />;
    case 'other':
      // For 'other', return a generic mushroom as fallback
      return <GenericMushroomIcon {...iconProps} />;
    default:
      return null;
  }
}

// Icon configuration for easy reference
// eslint-disable-next-line react-refresh/only-export-components
export const foragingIconConfig = {
  // Mushrooms
  chanterelle: { 
    label: 'Kantareller', 
    icon: ChanterelleSvgIcon, 
    color: 'bg-yellow-500',
    description: 'Gyllen trumpetformet svamp med gaffelriller'
  },
  porcini: { 
    label: 'Karl Johan', 
    icon: PorciniIcon, 
    color: 'bg-amber-700',
    description: 'Brun hat svamp, meget værdsat i madlavning'
  },
  oyster: { 
    label: 'Østershat', 
    icon: OysterMushroomIcon, 
    color: 'bg-gray-400',
    description: 'Fanfoldet svamp, der vokser på træer'
  },
  
  // Berries
  blueberry: { 
    label: 'Blåbær', 
    icon: BlueberryIcon, 
    color: 'bg-blue-600',
    description: 'Små mørkeblå bær i klaser'
  },
  lingonberry: { 
    label: 'Tyttebær', 
    icon: LingonberryIcon, 
    color: 'bg-red-500',
    description: 'Små røde bær, populære i skandinavisk madlavning'
  },
  cloudberry: { 
    label: 'Multebær', 
    icon: CloudberryIcon, 
    color: 'bg-orange-400',
    description: 'Sjælden orange aggregatbær, arktisk delikatesse'
  },
  elderberry: { 
    label: 'Hyldebær', 
    icon: ElderberryIcon, 
    color: 'bg-purple-800',
    description: 'Mørk lilla bær i paraplylignende klaser'
  },
  rosehip: { 
    label: 'Hyben', 
    icon: RoseHipIcon, 
    color: 'bg-red-600',
    description: 'Røde frugter af vilde roser, højt indhold af vitamin C'
  },
  seabuckthorn: { 
    label: 'Havtorn', 
    icon: SeaBuckthornIcon, 
    color: 'bg-orange-500',
    description: 'Lys orange bær, der vokser tæt på grene'
  },
  
  // Generic types
  generic_mushroom: { 
    label: 'Andre svampe', 
    icon: GenericMushroomIcon, 
    color: 'bg-green-600',
    description: 'Andre spiselige svampe'
  },
  generic_berry: { 
    label: 'Andre bær', 
    icon: GenericBerryIcon, 
    color: 'bg-green-600',
    description: 'Andre spiselige bær'
  },
  other: { 
    label: 'Andet', 
    icon: null, 
    color: 'bg-green-500',
    description: 'Andre spiselige ting'
  },
} as const;

// Helper to get color class for a foraging type
// eslint-disable-next-line react-refresh/only-export-components
export function getForagingColor(type: ExtendedForagingType): string {
  return foragingIconConfig[type as keyof typeof foragingIconConfig]?.color || 'bg-green-500';
}

// Helper to get label for a foraging type
// eslint-disable-next-line react-refresh/only-export-components
export function getForagingLabel(type: ExtendedForagingType): string {
  return foragingIconConfig[type as keyof typeof foragingIconConfig]?.label || 'Unknown';
}
