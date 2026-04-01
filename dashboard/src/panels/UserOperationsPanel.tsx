/**
 * UserOperationsPanel: sub-panels for the three user-facing transaction operations.
 *
 * - createDepositRequest: submit a Bitcoin deposit request
 * - requestWithdrawal: request a BTC withdrawal
 * - cancelWithdrawal: cancel a pending withdrawal request
 *
 * Each sub-panel uses WalletGuard to require a connected wallet,
 * the useTransactionExecution hook for the build/execute flow,
 * and TransactionPreview for displaying built transactions.
 */

import { useState, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useHashiClient } from '../context/HashiClientContext';
import {
  useTransactionExecution,
  type TransactionExecutionError,
} from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { TransactionPreview } from '../components/TransactionPreview';
import { OperationPanel } from '../components/OperationPanel';
import { JsonViewer } from '../components/JsonViewer';

// ---------------------------------------------------------------------------
// Shared styles (consistent with QueriesPanel)
// ---------------------------------------------------------------------------

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  backgroundColor: '#2244aa',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const executeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#22aa44',
};

const resetButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#555',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  minWidth: 300,
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: 140,
};

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

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

// ---------------------------------------------------------------------------
// Shared error display for transaction execution errors
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
// Shared success display
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
      <div style={digestStyle}>
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

const digestStyle: React.CSSProperties = {
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
// Shared result renderer for transaction execution state
// ---------------------------------------------------------------------------

function renderTransactionResult(
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

const executingStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#aaa',
  fontStyle: 'italic',
  marginTop: 8,
};

// ---------------------------------------------------------------------------
// 1. createDepositRequest
// ---------------------------------------------------------------------------

function CreateDepositRequestPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [txid, setTxid] = useState('');
  const [vout, setVout] = useState('');
  const [amount, setAmount] = useState('');

  const canBuild = txid.trim() && vout.trim() && amount.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.createDepositRequest({
      txid: txid.trim(),
      vout: Number(vout.trim()),
      amount: BigInt(amount.trim()),
    });
    build(builder);
  }, [client, txid, vout, amount, canBuild, build]);

  const handleExecute = useCallback(async () => {
    await execute();
  }, [execute]);

  return (
    <OperationPanel
      title="createDepositRequest"
      description="Submit a Bitcoin deposit request. Provide the Bitcoin transaction ID, output index, and amount in satoshis."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Bitcoin txid:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="64-char hex string (display byte order)"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>vout:</span>
        <input
          style={smallInputStyle}
          type="number"
          placeholder="0"
          min="0"
          value={vout}
          onChange={(e) => setVout(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Amount (sats):</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={hintStyle}>
        Amount is in satoshis (1 BTC = 100,000,000 satoshis).
      </div>
      <div style={{ ...rowStyle, marginTop: 12 }}>
        {state.phase === 'idle' && (
          <button
            onClick={handleBuild}
            disabled={!canBuild}
            style={canBuild ? buttonStyle : disabledButtonStyle}
          >
            Build Transaction
          </button>
        )}
        {state.phase === 'built' && (
          <>
            <button onClick={handleExecute} style={executeButtonStyle}>
              Sign & Execute
            </button>
            <button onClick={reset} style={resetButtonStyle}>
              Reset
            </button>
          </>
        )}
        {(state.phase === 'success' || state.phase === 'error') && (
          <button onClick={reset} style={resetButtonStyle}>
            Reset
          </button>
        )}
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. requestWithdrawal
// ---------------------------------------------------------------------------

function RequestWithdrawalPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [amount, setAmount] = useState('');

  const canBuild = bitcoinAddress.trim() && amount.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    // bitcoinAddress is passed as hex bytes string
    const builder = client.requestWithdrawal({
      bitcoinAddress: bitcoinAddress.trim(),
      amount: BigInt(amount.trim()),
    });
    build(builder);
  }, [client, bitcoinAddress, amount, canBuild, build]);

  const handleExecute = useCallback(async () => {
    await execute();
  }, [execute]);

  return (
    <OperationPanel
      title="requestWithdrawal"
      description="Request a BTC withdrawal. Provide the Bitcoin destination address as hex bytes and the amount in satoshis."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Bitcoin address:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Hex bytes (20 or 32 bytes)"
          value={bitcoinAddress}
          onChange={(e) => setBitcoinAddress(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Amount (sats):</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={hintStyle}>
        Bitcoin address should be hex-encoded bytes (e.g., 20 bytes for P2PKH/P2SH, 32 bytes for P2TR).
      </div>
      <div style={{ ...rowStyle, marginTop: 12 }}>
        {state.phase === 'idle' && (
          <button
            onClick={handleBuild}
            disabled={!canBuild}
            style={canBuild ? buttonStyle : disabledButtonStyle}
          >
            Build Transaction
          </button>
        )}
        {state.phase === 'built' && (
          <>
            <button onClick={handleExecute} style={executeButtonStyle}>
              Sign & Execute
            </button>
            <button onClick={reset} style={resetButtonStyle}>
              Reset
            </button>
          </>
        )}
        {(state.phase === 'success' || state.phase === 'error') && (
          <button onClick={reset} style={resetButtonStyle}>
            Reset
          </button>
        )}
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 3. cancelWithdrawal
// ---------------------------------------------------------------------------

function CancelWithdrawalPanel() {
  const client = useHashiClient();
  const account = useCurrentAccount();
  const { state, build, execute, reset } = useTransactionExecution();

  const [requestId, setRequestId] = useState('');
  const [recipient, setRecipient] = useState('');

  const canBuild = requestId.trim() && recipient.trim();

  // Pre-fill recipient with connected wallet address
  const handleUseMyAddress = useCallback(() => {
    if (account) {
      setRecipient(account.address);
    }
  }, [account]);

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.cancelWithdrawal({
      requestId: requestId.trim(),
      recipient: recipient.trim(),
    });
    build(builder);
  }, [client, requestId, recipient, canBuild, build]);

  const handleExecute = useCallback(async () => {
    await execute();
  }, [execute]);

  return (
    <OperationPanel
      title="cancelWithdrawal"
      description="Cancel a pending withdrawal request. The refunded BTC coin is sent to the recipient address."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Request ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Withdrawal request object ID (0x...)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Recipient:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Sui address to receive refunded BTC (0x...)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
        {state.phase === 'idle' && account && (
          <button onClick={handleUseMyAddress} style={smallButtonStyle}>
            Use my address
          </button>
        )}
      </div>
      <div style={{ ...rowStyle, marginTop: 12 }}>
        {state.phase === 'idle' && (
          <button
            onClick={handleBuild}
            disabled={!canBuild}
            style={canBuild ? buttonStyle : disabledButtonStyle}
          >
            Build Transaction
          </button>
        )}
        {state.phase === 'built' && (
          <>
            <button onClick={handleExecute} style={executeButtonStyle}>
              Sign & Execute
            </button>
            <button onClick={reset} style={resetButtonStyle}>
              Reset
            </button>
          </>
        )}
        {(state.phase === 'success' || state.phase === 'error') && (
          <button onClick={reset} style={resetButtonStyle}>
            Reset
          </button>
        )}
      </div>
    </OperationPanel>
  );
}

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 11,
  backgroundColor: '#333',
  color: '#aaa',
  border: '1px solid #555',
  borderRadius: 4,
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Main UserOperationsPanel
// ---------------------------------------------------------------------------

export function UserOperationsPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>User Operations</h2>
      <WalletGuard>
        <CreateDepositRequestPanel />
        <RequestWithdrawalPanel />
        <CancelWithdrawalPanel />
      </WalletGuard>
    </div>
  );
}
