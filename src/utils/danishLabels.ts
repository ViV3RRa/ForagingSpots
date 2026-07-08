import type { ForagingType } from '../components/types';

// Danish labels for foraging types (ordered as FORAGING_TYPES in components/types.ts)
export const DANISH_LABELS: Record<ForagingType, string> = {
  bay_bolete: 'Brunstokket rørhat',
  black_currant: 'Solbær',
  black_trumpet: 'Stor trompetsvamp',
  blackberry: 'Brombær',
  blueberry: 'Blåbær',
  chanterelle: 'Kantareller',
  cloudberry: 'Multebær',
  cranberry: 'Tranebær',
  elderberry: 'Hyldebær',
  field_mushroom: 'Mark-champignon',
  generic_berry: 'Andre bær',
  generic_mushroom: 'Andre svampe',
  hedgehog_mushroom: 'Almindelig pigsvamp',
  lingonberry: 'Tyttebær',
  oyster: 'Østershat',
  parasol_mushroom: 'Parasolhat',
  porcini: 'Karl Johan',
  raspberry: 'Hindbær',
  red_currant: 'Ribs',
  rosehip: 'Hyben',
  seabuckthorn: 'Havtorn',
  sheathed_woodtuft: 'Foranderlig skælhat',
  sloe: 'Slåen',
  wild_strawberry: 'Skovjordbær',
  other: 'Andet'
};

export function getDanishLabel(type: ForagingType): string {
  return DANISH_LABELS[type] || type;
}

export function getDanishFoundTitle(type: ForagingType): string {
  return `${getDanishLabel(type)} fundet`;
}
