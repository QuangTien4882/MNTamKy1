export const csvCell = (value: string | number): string => {
  let s = String(value);
  // CSV formula injection: neutralize cells starting with = + - @ (or tab/CR)
  // so they can't become formulas in Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes('"')) s = s.replace(/"/g, '""');
  return `"${s}"`;
};

export const toCsv = (rows: (string | number)[][], separator = ';'): string =>
  rows.map(row => row.map(csvCell).join(separator)).join('\r\n');