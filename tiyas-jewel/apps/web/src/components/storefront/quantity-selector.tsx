"use client";
import { Minus, Plus } from "lucide-react";
export function QuantitySelector({
  value,
  max,
  onChange,
  disabled = false,
  label = "Quantity",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="quantity-selector">
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} aria-hidden="true" />
      </button>
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={1}
        max={Math.max(1, max)}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= 1 && next <= max)
            onChange(next);
        }}
      />
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
