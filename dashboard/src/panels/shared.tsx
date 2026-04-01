/**
 * Shared styles, helpers, and sub-components used across all operation panels.
 *
 * Extracted from UserOperationsPanel to avoid duplication across the
 * 7+ panel files in the dashboard.
 */

import { useTransactionExecution, type TransactionExecutionError } from '../hooks/useTransactionExecution';
import { TransactionPreview } from '../components/TransactionPreview';
import { JsonViewer } from '../components/JsonViewer';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: 16,
};

export const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  backgroundColor: '#2244aa',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

export const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

export const executeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#22aa44',
};

export const resetButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#555',
};

export const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  minWidth: 300,
};

export const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: 140,
};

export const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 8,
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#aaa',
  minWidth: 120,
};

export const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

// ---------------------------------------------------------------------------
// Authority warning banner
// ---------------------------------------------------------------------------

const warningStyle: React.CSSProperties = {
  backgroundColor: '#2a2200',
  border: '1px solid #665500',
  borderRadius: 4,
  padding: 10,
  fontSize: 12,
  color: '#ccaa44',
  marginBottom: 16,
};

export function AuthorityWarning({ role }: { role: 'committee' | 'validator' | 'committee/validator' }) {
  return (
    <div style={warningStyle}>
      These operations require {role} authority and will likely fail on devnet without proper signing keys.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction error display
// ---------------------------------------------------------------------------

function TransactionErrorDisplay({ error }: { error: TransactionExecutionError }) {
  return (
    <div style={errorContainerStyle}>
      <div style={errorHeaderStyle}>Transaction Failed</div>
      <div style={errorMessageStyle}>{error.message}</div>
      {error.module && (
        <div style={errorDetailStyle}>
          <span style={errorLabelStyle}>Module:</span> {error.module}
        </div>
      )}
      {error.abortCode !== undefined && (
        <div style={errorDetailStyle}>
          <span style={errorLabelStyle}>Abort Code:</span> {error.abortCode}
        </div>
      )}
      {error.abortDescription && (
        <div style={errorDetailStyle}>
          <span style={errorLabelStyle}>Description:</span> {error.abortDescription}
        </div>
      )}
    </div>
  );
}

const errorContainerStyle: React.CSSProperties = {
  backgroundColor: '#2a0a0a',
  border: '1px solid #661111',
  borderRadius: 4,
  padding: 12,
  fontSize: 13,
};

const errorHeaderStyle: React.CSSProperties = {
  color: '#ff6666',
  fontWeight: 700,
  marginBottom: 8,
};

const errorMessageStyle: React.CSSProperties = {
  color: '#cc8888',
  marginBottom: 8,
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
};

const errorDetailStyle: React.CSSProperties = {
  color: '#cc8888',
  marginTop: 4,
};

const errorLabelStyle: React.CSSProperties = {
  color: '#ff8888',
  fontWeight: 600,
};

// ---------------------------------------------------------------------------
// Transaction success display
// ---------------------------------------------------------------------------

function TransactionSuccessDisplay({
  digest,
  effects,
}: {
  digest: string;
  effects: unknown;
}) {
  return (
    <div style={successContainerStyle}>
      <div style={successHeaderStyle}>Transaction Successful</div>
      <div style={digestRowStyle}>
        <span style={digestLabelStyle}>Digest:</span>{' '}
        <code style={digestCodeStyle}>{digest}</code>
      </div>
      <JsonViewer data={effects} label="Effects" />
    </div>
  );
}

const successContainerStyle: React.CSSProperties = {
  backgroundColor: '#0a2a0a',
  border: '1px solid #116611',
  borderRadius: 4,
  padding: 12,
  fontSize: 13,
};

const successHeaderStyle: React.CSSProperties = {
  color: '#66ff66',
  fontWeight: 700,
  marginBottom: 8,
};

const digestRowStyle: React.CSSProperties = {
  marginBottom: 8,
};

const digestLabelStyle: React.CSSProperties = {
  color: '#88ff88',
  fontWeight: 600,
};

const digestCodeStyle: React.CSSProperties = {
  color: '#a0d0a0',
  fontFamily: 'monospace',
  fontSize: 12,
  wordBreak: 'break-all',
};

// ---------------------------------------------------------------------------
// Shared result renderer
// ---------------------------------------------------------------------------

const executingStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#aaa',
  fontStyle: 'italic',
  marginTop: 8,
};

export function renderTransactionResult(
  state: ReturnType<typeof useTransactionExecution>['state'],
): React.ReactNode {
  switch (state.phase) {
    case 'built':
      return <TransactionPreview transaction={state.transaction} />;
    case 'executing':
      return (
        <div>
          <TransactionPreview transaction={state.transaction} />
          <div style={executingStyle}>Signing and executing transaction...</div>
        </div>
      );
    case 'success':
      return (
        <TransactionSuccessDisplay digest={state.digest} effects={state.effects} />
      );
    case 'error':
      return <TransactionErrorDisplay error={state.error} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Shared action buttons row
// ---------------------------------------------------------------------------

interface ActionButtonsProps {
  phase: ReturnType<typeof useTransactionExecution>['state']['phase'];
  canBuild: boolean;
  onBuild: () => void;
  onExecute: () => void;
  onReset: () => void;
}

export function ActionButtons({
  phase,
  canBuild,
  onBuild,
  onExecute,
  onReset,
}: ActionButtonsProps) {
  return (
    <div style={{ ...rowStyle, marginTop: 12 }}>
      {phase === 'idle' && (
        <button
          onClick={onBuild}
          disabled={!canBuild}
          style={canBuild ? buttonStyle : disabledButtonStyle}
        >
          Build Transaction
        </button>
      )}
      {phase === 'built' && (
        <>
          <button onClick={onExecute} style={executeButtonStyle}>
            Sign & Execute
          </button>
          <button onClick={onReset} style={resetButtonStyle}>
            Reset
          </button>
        </>
      )}
      {(phase === 'success' || phase === 'error') && (
        <button onClick={onReset} style={resetButtonStyle}>
          Reset
        </button>
      )}
    </div>
  );
}
