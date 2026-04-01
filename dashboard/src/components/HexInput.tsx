/**
 * HexInput: text input that accepts hex-encoded byte strings.
 *
 * Provides visual validation feedback -- the border turns red if the value
 * is not valid hexadecimal, and turns green when valid.
 * Exposes a static helper to convert a hex string to Uint8Array.
 */

import { useMemo } from 'react';

interface HexInputProps {
  /** Current hex string value. */
  value: string;
  /** Change handler. */
  onChange: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** Minimum width override. */
  minWidth?: number;
  /** Label for accessibility. */
  label?: string;
}

/** Check whether a string is valid hex (even-length, only hex chars). */
function isValidHex(s: string): boolean {
  if (s.length === 0) return false;
  const clean = s.startsWith('0x') ? s.slice(2) : s;
  if (clean.length === 0 || clean.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(clean);
}

/** Convert a hex string (with optional 0x prefix) to Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function HexInput({
  value,
  onChange,
  placeholder = 'Hex string (0x...)',
  disabled = false,
  minWidth = 300,
  label,
}: HexInputProps) {
  const valid = useMemo(() => {
    if (value.trim().length === 0) return null; // no validation when empty
    return isValidHex(value.trim());
  }, [value]);

  const borderColor =
    valid === null ? '#444' : valid ? '#336633' : '#663333';

  return (
    <input
      aria-label={label}
      style={{
        padding: '6px 10px',
        fontSize: 13,
        backgroundColor: '#111',
        color: '#e0e0e0',
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        minWidth,
      }}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
