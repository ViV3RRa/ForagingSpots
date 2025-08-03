import type { ForagingType } from '../types';
import { assertUnreachable } from '../../utils/utils';
import type { JSX } from 'react';

export interface ForagingSpotConfig {
  label: string
  icon: JSX.Element | null
  background: string
  description: string
}

const getGradientBackground = (color1: string = '#77DB89', color2: string = '#4FA459', angle: number = 45) => {
  return `bg-[linear-gradient(${angle}deg,${color1},${color2})]`;
}

const getImage = (src: string, label: string, iconSize: number) => {
  return <img
    src={src}
    alt={label}
    width={iconSize}
    height={iconSize}
    loading={'eager'}
  />
}

export const getForagingSpotConfig = (type: ForagingType, iconSize: number = 24): ForagingSpotConfig => {
  switch (type) {
    case 'bay_bolete':
      return {
        label: 'Brunstokket Rørhat',
        icon: getImage('/spot_types/bay_bolete.png', 'Brunstokket Rørhat', iconSize),
        background: getGradientBackground('#A5A86F', '#5E4F3B'),
        description: 'En spiselig svamp med en karakteristisk bøjleformet hat'
      };
    case 'black_currant':
      return {
        label: 'Solbær',
        icon: getImage('/spot_types/black_currant.png', 'Solbær', iconSize),
        background: getGradientBackground('#9A5BA0', '#6B3B78'),
        description: 'Små sorte bær, ofte brugt i saft og marmelade'
      };
    case 'black_trumpet':
      return {
        label: 'Tragtkantarel',
        icon: getImage('/spot_types/black_trumpet.png', 'Tragtkantarel', iconSize),
        background: getGradientBackground('#A68B6C', '#5A4C42'),
        description: 'En mørk svamp med en tragtformet hat, kendt for sin rige smag'
      };
    case 'blackberry':
      return {
        label: 'Brombær',
        icon: getImage('/spot_types/blackberry.png', 'Brombær', iconSize),
        background: getGradientBackground('#A270A3', '#9C27B0'),
        description: 'Små sorte bær, der vokser i klynger'
      };
    case 'blueberry':
      return {
        label: 'Blåbær',
        icon: getImage('/spot_types/blueberry.png', 'Blåbær', iconSize),
        background: getGradientBackground('#5B91B6', '#2E4F6B'),
        description: 'Små mørkeblå bær i klaser'
      };
    case 'chanterelle':
      return {
        label: 'Kantareller',
        icon: getImage('/spot_types/chanterelle.png', 'Kantareller', iconSize),
        background: getGradientBackground('#F4B942', '#B27300'),
        description: 'Gyllen trumpetformet svamp med gaffelriller'
      };
    case 'cloudberry':
      return {
        label: 'Multebær',
        icon: getImage('/spot_types/cloudberry.png', 'Multebær', iconSize),
        background: getGradientBackground('#FFE29B', '#F57C00'),
        description: 'Sjælden orange aggregatbær, arktisk delikatesse'
      };
    case 'cranberry':
      return {
        label: 'Tranebær',
        icon: getImage('/spot_types/cranberry.png', 'Tranebær', iconSize),
        background: getGradientBackground('#FFBABA', '#C62828'),
        description: 'Små røde bær, ofte brugt i saft og saucer'
      };
    case 'elderberry':
      return {
        label: 'Hyldebær',
        icon: getImage('/spot_types/elderberry.png', 'Hyldebær', iconSize),
        background: getGradientBackground('#D09AC9', '#6A1B9A'),
        description: 'Mørk lilla bær i paraplylignende klaser'
      };
    case 'field_mushroom':
      return {
        label: 'Mark Champignon',
        icon: getImage('/spot_types/field_mushroom.png', 'Mark Champignon', iconSize),
        background: getGradientBackground('#DCC7A0', '#A4907C'),
        description: 'Hvid svamp med en bred hat, almindelig i græsmarker'
      };
    case 'generic_berry':
      return {
        label: 'Andre bær',
        icon: getImage('/spot_types/generic_berry.png', 'Andre bær', iconSize),
        background: getGradientBackground(),
        description: 'Andre spiselige bær'
      };
    case 'generic_mushroom':
      return {
        label: 'Andre svampe',
        icon: getImage('/spot_types/generic_mushroom.png', 'Andre svampe', iconSize),
        background: getGradientBackground(),
        description: 'Andre spiselige svampe'
      };
    case 'hedgehog_mushroom':
      return {
        label: 'Almindelig Pigsvamp',
        icon: getImage('/spot_types/hedgehog_mushroom.png', 'Almindelig Pigsvamp', iconSize),
        background: getGradientBackground('#F9E4B7', '#D6A867'),
        description: 'En svamp med en karakteristisk pigget underside'
      };
    case 'lingonberry':
      return {
        label: 'Tyttebær',
        icon: getImage('/spot_types/lingonberry.png', 'Tyttebær', iconSize),
        background: getGradientBackground('#B6D379', '#7E9E4F'),
        description: 'Små røde bær, populære i skandinavisk madlavning'
      };
    case 'oyster':
      return {
        label: 'Østershat',
        icon: getImage('/spot_types/oyster.png', 'Østershat', iconSize),
        background: getGradientBackground('#CFCAC1', '#A8A29E'),
        description: 'Fanfoldet svamp, der vokser på træer'
      };
    case 'parasol_mushroom':
      return {
        label: 'Parasolhat',
        icon: getImage('/spot_types/parasol_mushroom.png', 'Parasolhat', iconSize),
        background: getGradientBackground('#D5C3A3', '#A98E6F'),
        description: 'Stor svamp med en paraplyformet hat'
      };
    case 'porcini':
      return {
        label: 'Karl Johan',
        icon: getImage('/spot_types/porcini.png', 'Karl Johan', iconSize),
        background: getGradientBackground('#D6B98C', '#8B5A2B'),
        description: 'Brun hat svamp, meget værdsat i madlavning'
      };
    case 'raspberry':
      return {
        label: 'Hindbær',
        icon: getImage('/spot_types/raspberry.png', 'Hindbær', iconSize),
        background: getGradientBackground('#F48FB1', '#E91E63'),
        description: 'Små røde bær, der vokser i klynger'
      };
    case 'red_currant':
      return {
        label: 'Ribs',
        icon: getImage('/spot_types/red_currant.png', 'Ribs', iconSize),
        background: getGradientBackground('#F8D7DA', '#B71C1C'),
        description: 'Små røde bær, ofte brugt i saft og gelé'
      }; 
    case 'rosehip':
      return {
        label: 'Hyben',
        icon: getImage('/spot_types/rosehip.png', 'Hyben', iconSize),
        background: getGradientBackground('#FFCEB3', '#C1440E'),
        description: 'Røde frugter af vilde roser, højt indhold af vitamin C'
      };
    case 'seabuckthorn':
      return {
        label: 'Havtorn',
        icon: getImage('/spot_types/seabuckthorn.png', 'Havtorn', iconSize),
        background: getGradientBackground('#FAF3E0', '#7B4F27'),
        description: 'Lys orange bær, der vokser tæt på grene'
      };
    case 'sheathed_woodtuft':
      return {
        label: 'Foranderlig skælhat',
        icon: getImage('/spot_types/sheathed_woodtuft.png', 'Foranderlig skælhat', iconSize),
        background: getGradientBackground('#D6A257', '#8B5B2C'),
        description: 'En spiselig svamp der vokser i klaser på dødt løvtræ.'
      };
    case 'sloe':
      return {
        label: 'Slåen',
        icon: getImage('/spot_types/sloe.png', 'Slåen', iconSize),
        background: getGradientBackground('#6E84A3', '#4B4862'),
        description: 'Små mørke bær, der vokser på tornebuske'
      };
    case 'wild_strawberry':
      return {
        label: 'Skovjordbær',
        icon: getImage('/spot_types/wild_strawberry.png', 'Skovjordbær', iconSize),
        background: getGradientBackground('#F6B785', '#D93636'),
        description: 'Små søde bær, der vokser tæt på jorden'
      };
    case 'other':
      // For 'other', return a generic mushroom as fallback
      return {
        label: 'Andet',
        icon: null,
        background: getGradientBackground(),
        description: 'Andet spiseligt'
      };
    default:
      assertUnreachable(type);
  }
}
