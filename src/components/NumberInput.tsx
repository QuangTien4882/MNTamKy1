import React from 'react';

interface NumberInputProps {
    id: string;
    value: string | number;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    placeholder?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ id, value, onChange, min = 0, max, disabled, placeholder }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Force digits-only so negative signs, 'e'/'.' and invalid values can never
        // reach state (browsers report those as '' or raw '-'/'NaN').
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        onChange(cleaned);
    };

    return (
        <input
            type="number"
            id={id}
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            disabled={disabled}
            placeholder={placeholder}
            className="mt-1 w-full text-center px-3 py-2 bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-900"
        />
    );
};

export default NumberInput;