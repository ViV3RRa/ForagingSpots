import type { ForagingType } from '../components/types';

// Scientific (latin) names — the italic Spectral line under the species name
// in list rows and the detail header (ordered as FORAGING_TYPES). The generic
// buckets have none; the line simply doesn't render for those.
export const LATIN_LABELS: Record<ForagingType, string | null> = {
  bay_bolete: 'Imleria badia',
  black_currant: 'Ribes nigrum',
  black_trumpet: 'Craterellus cornucopioides',
  blackberry: 'Rubus fruticosus',
  blueberry: 'Vaccinium myrtillus',
  chanterelle: 'Cantharellus cibarius',
  cloudberry: 'Rubus chamaemorus',
  cranberry: 'Vaccinium oxycoccos',
  elderberry: 'Sambucus nigra',
  field_mushroom: 'Agaricus campestris',
  generic_berry: null,
  generic_mushroom: null,
  hedgehog_mushroom: 'Hydnum repandum',
  lingonberry: 'Vaccinium vitis-idaea',
  oyster: 'Pleurotus ostreatus',
  parasol_mushroom: 'Macrolepiota procera',
  porcini: 'Boletus edulis',
  raspberry: 'Rubus idaeus',
  red_currant: 'Ribes rubrum',
  rosehip: 'Rosa canina',
  seabuckthorn: 'Hippophae rhamnoides',
  sheathed_woodtuft: 'Kuehneromyces mutabilis',
  sloe: 'Prunus spinosa',
  wild_strawberry: 'Fragaria vesca',
  other: null
};

export function getLatinLabel(type: ForagingType): string | null {
  return LATIN_LABELS[type] ?? null;
}
