/**
 * CommitteeSignatureInputs: reusable form group for committee signature fields.
 *
 * Renders inputs for epoch, BLS signature (hex), and signers bitmap (hex).
 * Used across multiple committee/validator operations that require
 * epoch + signature + signersBitmap parameters.
 */

import { HexInput } from './HexInput';

export interface CommitteeSignatureValues {
  epoch: string;
  signature: string;
  signersBitmap: string;
}

interface CommitteeSignatureInputsProps {
  /** Current form values. */
  values: CommitteeSignatureValues;
  /** Change handler -- receives the full updated values. */
  onChange: (values: CommitteeSignatureValues) => void;
  /** Whether all inputs are disabled. */
  disabled?: boolean;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#aaa',
  minWidth: 120,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  minWidth: 140,
};

export function CommitteeSignatureInputs({
  values,
  onChange,
  disabled = false,
}: CommitteeSignatureInputsProps) {
  return (
    <div
      style={{
        border: '1px solid #333',
        borderRadius: 4,
        padding: 10,
        marginBottom: 8,
        backgroundColor: '#141428',
      }}
    >
      <div style={{ fontSize: 11, color: '#777', marginBottom: 8 }}>
        Committee Signature
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Epoch:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="e.g. 1"
          value={values.epoch}
          onChange={(e) => onChange({ ...values, epoch: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Signature (hex):</span>
        <HexInput
          value={values.signature}
          onChange={(v) => onChange({ ...values, signature: v })}
          placeholder="BLS signature (48 bytes hex)"
          disabled={disabled}
          label="Committee BLS signature"
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Signers Bitmap:</span>
        <HexInput
          value={values.signersBitmap}
          onChange={(v) => onChange({ ...values, signersBitmap: v })}
          placeholder="Signers bitmap (hex)"
          disabled={disabled}
          label="Signers bitmap"
        />
      </div>
    </div>
  );
}
