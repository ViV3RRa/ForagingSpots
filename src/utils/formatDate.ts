// The design's "2. okt 2026" format (da-DK month abbreviation without the trailing dot)
export const formatFoundDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  const month = date.toLocaleDateString('da-DK', { month: 'short' }).replace('.', '');
  return `${date.getDate()}. ${month} ${date.getFullYear()}`;
};
