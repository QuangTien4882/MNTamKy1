// Force digits-only so negative signs, 'e'/'.' and invalid values can never
// reach state (browsers report those as '' or raw '-'/'NaN').
export const stripNonDigits = (raw: string): string => raw.replace(/[^0-9]/g, '');