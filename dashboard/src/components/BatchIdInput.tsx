/**
 * BatchIdInput: dynamic list of object IDs with add/remove buttons.
 *
 * Used for operations that accept multiple Sui object IDs as input
 * (e.g. deleteExpiredDeposits, approveWithdrawalRequests).
 */

import { useCallback } from 'react';

interface BatchIdInputProps {
  /** Label displayed above the input list. */
  label: string;
  /** Current list of IDs. */
  ids: string[];
  /** Change handler -- receives the full updated list. */
  onChange: (ids: string[]) => void;
  /** Whether all inputs are disabled. */
  disabled?: boolean;
  /** Placeholder for each input. */
  placeholder?: string;
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  minWidth: 300,
  flex: 1,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  backgroundColor: '#333',
  color: '#aaa',
  border: '1px solid #555',
  borderRadius: 4,
  cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  backgroundColor: '#1a3a1a',
  color: '#8c8',
  border: '1px solid #3a5a3a',
};

const removeBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  backgroundColor: '#3a1a1a',
  color: '#c88',
  border: '1px solid #5a3a3a',
};

export function BatchIdInput({
  label,
  ids,
  onChange,
  disabled = false,
  placeholder = 'Object ID (0x...)',
}: BatchIdInputProps) {
  const handleAdd = useCallback(() => {
    onChange([...ids, '']);
  }, [ids, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(ids.filter((_, i) => i !== index));
    },
    [ids, onChange],
  );

  const handleChange = useCallback(
    (index: number, value: string) => {
      const next = [...ids];
      next[index] = value;
      onChange(next);
    },
    [ids, onChange],
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
        {label} ({ids.length} {ids.length === 1 ? 'entry' : 'entries'})
      </div>
      {ids.map((id, i) => (
        <div key={i} style={rowStyle}>
          <span style={{ fontSize: 11, color: '#666', minWidth: 20 }}>
            {i + 1}.
          </span>
          <input
            style={inputStyle}
            type="text"
            placeholder={placeholder}
            value={id}
            onChange={(e) => handleChange(i, e.target.value)}
            disabled={disabled}
          />
          {!disabled && ids.length > 1 && (
            <button onClick={() => handleRemove(i)} style={removeBtnStyle}>
              Remove
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button onClick={handleAdd} style={addBtnStyle}>
          + Add ID
        </button>
      )}
    </div>
  );
}
