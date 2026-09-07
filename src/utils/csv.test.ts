import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('wraps plain values in quotes', () => {
    expect(csvCell('abc')).toBe('"abc"');
    expect(csvCell(5)).toBe('"5"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
  });

  it('neutralizes leading formula characters (=, +, -, @, tab, CR)', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe(`"'=SUM(A1:A2)"`);
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2+3')).toBe(`"'-2+3"`);
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
    expect(csvCell('\t=cmd')).toBe(`"'\t=cmd"`);
  });

  it('does not neutralize values that just contain formula characters later', () => {
    expect(csvCell('2+2')).toBe('"2+2"');
    expect(csvCell('sum=1')).toBe('"sum=1"');
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF and the given separator', () => {
    const out = toCsv([
      ['Lớp', 'Ngày'],
      ['=1+1', '08/09/2026'],
    ]);
    expect(out).toBe('"Lớp";"Ngày"\r\n"\'=1+1";"08/09/2026"');
  });
});