import type { ForagingType } from '../components/types';

// Danish labels for foraging types
export const DANISH_LABELS: { [key: string]: string } = {
  chanterelle: 'Kantareller',
  blueberry: 'Blåbær',
  lingonberry: 'Tyttebær',
  cloudberry: 'Multebær',
  porcini: 'Karl Johan',
  oyster: 'Østershat',
  elderberry: 'Hyldebær',
  rosehip: 'Hyben',
  seabuckthorn: 'Havtorn',
  generic_mushroom: 'Andre svampe',
  generic_berry: 'Andre bær',
  other: 'Andet'
};

export function getDanishLabel(type: ForagingType): string {
  return DANISH_LABELS[type] || type;
}

export function getDanishFoundTitle(type: ForagingType): string {
  return `${getDanishLabel(type)} fundet`;
}
