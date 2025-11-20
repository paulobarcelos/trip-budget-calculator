const toDate = (value: string): Date | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
};

export const shiftDate = (date: string, offset: number): string | null => {
  const parsed = toDate(date);
  if (!parsed) return null;
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().split('T')[0];
};
