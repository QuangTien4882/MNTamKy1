import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import NumberInput from './NumberInput';
import { stripNonDigits } from '../utils/numbers';

describe('stripNonDigits', () => {
  it('removes all non-digit characters', () => {
    expect(stripNonDigits('12a-3.5e')).toBe('1235');
    expect(stripNonDigits('-12')).toBe('12');
    expect(stripNonDigits('NaN')).toBe('');
    expect(stripNonDigits('1e2')).toBe('12');
  });
});

describe('NumberInput', () => {
  it('passes digits through unchanged', () => {
    const onChange = vi.fn();
    render(<NumberInput id="qty" value="" onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '042' } });
    expect(onChange).toHaveBeenCalledWith('042');
  });

  it('handles empty input', () => {
    const onChange = vi.fn();
    render(<NumberInput id="qty" value="5" onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });
});