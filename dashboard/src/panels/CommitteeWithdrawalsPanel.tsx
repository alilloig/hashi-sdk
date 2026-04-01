/**
 * CommitteeWithdrawalsPanel: sub-panels for committee withdrawal operations.
 *
 * - approveWithdrawalRequests: Batch-approve withdrawal requests
 * - commitWithdrawalTx: Complex form with nested UTXO/output inputs
 * - signWithdrawal: Sign a pending withdrawal with ECDSA signatures
 * - confirmWithdrawal: Confirm a withdrawal after Bitcoin broadcast
 * - deleteExpiredSpentUtxo: Clean up a single expired spent UTXO
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { useTransactionExecution } from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { OperationPanel } from '../components/OperationPanel';
import { CommitteeSignatureInputs, type CommitteeSignatureValues } from '../components/CommitteeSignatureInputs';
import { BatchIdInput } from '../components/BatchIdInput';
import { HexInput, hexToBytes } from '../components/HexInput';
import {
  sectionTitleStyle,
  inputStyle,
  smallInputStyle,
  rowStyle,
  labelStyle,
  hintStyle,
  renderTransactionResult,
  ActionButtons,
  AuthorityWarning,
} from './shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyCommitteeSig(): CommitteeSignatureValues {
  return { epoch: '', signature: '', signersBitmap: '' };
}

interface UtxoInputState {
  txid: string;
  vout: string;
}

interface OutputUtxoState {
  amount: string;
  bitcoinAddress: string;
}

const nestedBlockStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 4,
  padding: 10,
  marginBottom: 8,
  backgroundColor: '#141428',
};

const nestedTitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#777',
  marginBottom: 8,
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

// ---------------------------------------------------------------------------
// 1. approveWithdrawalRequests
// ---------------------------------------------------------------------------

function ApproveWithdrawalRequestsPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [requestIds, setRequestIds] = useState<string[]>(['']);
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    requestIds.some((id) => id.trim().length > 0) &&
    sig.epoch.trim() &&
    sig.signature.trim() &&
    sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const ids = requestIds.map((id) => id.trim()).filter((id) => id.length > 0);
    const builder = client.approveWithdrawalRequests({
      requestIds: ids,
      epoch: BigInt(sig.epoch.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, requestIds, sig, canBuild, build]);

  return (
    <OperationPanel
      title="approveWithdrawalRequests"
      description="Batch-approve withdrawal requests. Each request receives the same committee signature."
      result={renderTransactionResult(state)}
    >
      <BatchIdInput
        label="Withdrawal Request IDs"
        ids={requestIds}
        onChange={setRequestIds}
        disabled={state.phase !== 'idle'}
        placeholder="Withdrawal request object ID (0x...)"
      />
      <CommitteeSignatureInputs
        values={sig}
        onChange={setSig}
        disabled={state.phase !== 'idle'}
      />
      <ActionButtons
        phase={state.phase}
        canBuild={!!canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. commitWithdrawalTx (COMPLEX)
// ---------------------------------------------------------------------------

function CommitWithdrawalTxPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [requestIds, setRequestIds] = useState<string[]>(['']);
  const [utxos, setUtxos] = useState<UtxoInputState[]>([{ txid: '', vout: '0' }]);
  const [outputs, setOutputs] = useState<OutputUtxoState[]>([{ amount: '', bitcoinAddress: '' }]);
  const [txid, setTxid] = useState('');
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    requestIds.some((id) => id.trim().length > 0) &&
    utxos.some((u) => u.txid.trim().length > 0) &&
    outputs.some((o) => o.amount.trim().length > 0 && o.bitcoinAddress.trim().length > 0) &&
    txid.trim() &&
    sig.epoch.trim() &&
    sig.signature.trim() &&
    sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const ids = requestIds.map((id) => id.trim()).filter((id) => id.length > 0);
    const selectedUtxos = utxos
      .filter((u) => u.txid.trim().length > 0)
      .map((u) => ({ txid: u.txid.trim(), vout: Number(u.vout) }));
    const outputList = outputs
      .filter((o) => o.amount.trim().length > 0)
      .map((o) => ({
        amount: BigInt(o.amount.trim()),
        bitcoinAddress: hexToBytes(o.bitcoinAddress.trim()),
      }));

    const builder = client.commitWithdrawalTx({
      requestIds: ids,
      selectedUtxos,
      outputs: outputList,
      txid: txid.trim(),
      epoch: BigInt(sig.epoch.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, requestIds, utxos, outputs, txid, sig, canBuild, build]);

  const addUtxo = useCallback(() => {
    setUtxos([...utxos, { txid: '', vout: '0' }]);
  }, [utxos]);

  const removeUtxo = useCallback(
    (idx: number) => {
      setUtxos(utxos.filter((_, i) => i !== idx));
    },
    [utxos],
  );

  const updateUtxo = useCallback(
    (idx: number, field: keyof UtxoInputState, value: string) => {
      const next = [...utxos];
      const existing = next[idx];
      if (existing) {
        next[idx] = { ...existing, [field]: value };
        setUtxos(next);
      }
    },
    [utxos],
  );

  const addOutput = useCallback(() => {
    setOutputs([...outputs, { amount: '', bitcoinAddress: '' }]);
  }, [outputs]);

  const removeOutput = useCallback(
    (idx: number) => {
      setOutputs(outputs.filter((_, i) => i !== idx));
    },
    [outputs],
  );

  const updateOutput = useCallback(
    (idx: number, field: keyof OutputUtxoState, value: string) => {
      const next = [...outputs];
      const existing = next[idx];
      if (existing) {
        next[idx] = { ...existing, [field]: value };
        setOutputs(next);
      }
    },
    [outputs],
  );

  const isIdle = state.phase === 'idle';

  return (
    <OperationPanel
      title="commitWithdrawalTx"
      description="Commit a withdrawal transaction with BCS-encoded UTXOs and outputs. This is the most complex operation."
      result={renderTransactionResult(state)}
    >
      <BatchIdInput
        label="Withdrawal Request IDs"
        ids={requestIds}
        onChange={setRequestIds}
        disabled={!isIdle}
        placeholder="Withdrawal request object ID (0x...)"
      />

      {/* Selected UTXOs */}
      <div style={nestedBlockStyle}>
        <div style={nestedTitleStyle}>
          Selected UTXOs ({utxos.length} {utxos.length === 1 ? 'entry' : 'entries'})
        </div>
        {utxos.map((u, i) => (
          <div key={i} style={{ ...rowStyle, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, color: '#666', minWidth: 20, paddingTop: 6 }}>
              {i + 1}.
            </span>
            <div style={{ flex: 1 }}>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, minWidth: 50 }}>txid:</span>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Bitcoin txid (64 hex chars)"
                  value={u.txid}
                  onChange={(e) => updateUtxo(i, 'txid', e.target.value)}
                  disabled={!isIdle}
                />
              </div>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, minWidth: 50 }}>vout:</span>
                <input
                  style={smallInputStyle}
                  type="number"
                  placeholder="0"
                  min="0"
                  value={u.vout}
                  onChange={(e) => updateUtxo(i, 'vout', e.target.value)}
                  disabled={!isIdle}
                />
              </div>
            </div>
            {isIdle && utxos.length > 1 && (
              <button onClick={() => removeUtxo(i)} style={removeBtnStyle}>
                Remove
              </button>
            )}
          </div>
        ))}
        {isIdle && (
          <button onClick={addUtxo} style={addBtnStyle}>
            + Add UTXO
          </button>
        )}
      </div>

      {/* Outputs */}
      <div style={nestedBlockStyle}>
        <div style={nestedTitleStyle}>
          Outputs ({outputs.length} {outputs.length === 1 ? 'entry' : 'entries'})
        </div>
        {outputs.map((o, i) => (
          <div key={i} style={{ ...rowStyle, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, color: '#666', minWidth: 20, paddingTop: 6 }}>
              {i + 1}.
            </span>
            <div style={{ flex: 1 }}>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, minWidth: 80 }}>Amount (sats):</span>
                <input
                  style={smallInputStyle}
                  type="text"
                  placeholder="100000"
                  value={o.amount}
                  onChange={(e) => updateOutput(i, 'amount', e.target.value)}
                  disabled={!isIdle}
                />
              </div>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, minWidth: 80 }}>BTC Addr (hex):</span>
                <HexInput
                  value={o.bitcoinAddress}
                  onChange={(v) => updateOutput(i, 'bitcoinAddress', v)}
                  placeholder="Bitcoin address bytes (hex)"
                  disabled={!isIdle}
                  label={`Output ${i + 1} bitcoin address`}
                />
              </div>
            </div>
            {isIdle && outputs.length > 1 && (
              <button onClick={() => removeOutput(i)} style={removeBtnStyle}>
                Remove
              </button>
            )}
          </div>
        ))}
        {isIdle && (
          <button onClick={addOutput} style={addBtnStyle}>
            + Add Output
          </button>
        )}
        <div style={hintStyle}>
          Output count must equal request count (or request count + 1 for change output).
        </div>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Bitcoin txid:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Withdrawal Bitcoin txid (64 hex chars)"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
          disabled={!isIdle}
        />
      </div>

      <CommitteeSignatureInputs
        values={sig}
        onChange={setSig}
        disabled={!isIdle}
      />

      <ActionButtons
        phase={state.phase}
        canBuild={!!canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 3. signWithdrawal
// ---------------------------------------------------------------------------

function SignWithdrawalPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [withdrawalId, setWithdrawalId] = useState('');
  const [requestIds, setRequestIds] = useState<string[]>(['']);
  const [ecdsaSignatures, setEcdsaSignatures] = useState<string[]>(['']);
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    withdrawalId.trim() &&
    requestIds.some((id) => id.trim().length > 0) &&
    ecdsaSignatures.some((s) => s.trim().length > 0) &&
    sig.epoch.trim() &&
    sig.signature.trim() &&
    sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const ids = requestIds.map((id) => id.trim()).filter((id) => id.length > 0);
    const sigs = ecdsaSignatures
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => hexToBytes(s));

    const builder = client.signWithdrawal({
      withdrawalId: withdrawalId.trim(),
      requestIds: ids,
      signatures: sigs,
      epoch: BigInt(sig.epoch.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, withdrawalId, requestIds, ecdsaSignatures, sig, canBuild, build]);

  const addEcdsaSig = useCallback(() => {
    setEcdsaSignatures([...ecdsaSignatures, '']);
  }, [ecdsaSignatures]);

  const removeEcdsaSig = useCallback(
    (idx: number) => {
      setEcdsaSignatures(ecdsaSignatures.filter((_, i) => i !== idx));
    },
    [ecdsaSignatures],
  );

  const updateEcdsaSig = useCallback(
    (idx: number, value: string) => {
      const next = [...ecdsaSignatures];
      next[idx] = value;
      setEcdsaSignatures(next);
    },
    [ecdsaSignatures],
  );

  const isIdle = state.phase === 'idle';

  return (
    <OperationPanel
      title="signWithdrawal"
      description="Submit ECDSA signatures for a pending withdrawal (one per input UTXO)."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Withdrawal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Pending withdrawal object ID (0x...)"
          value={withdrawalId}
          onChange={(e) => setWithdrawalId(e.target.value)}
          disabled={!isIdle}
        />
      </div>

      <BatchIdInput
        label="Request IDs"
        ids={requestIds}
        onChange={setRequestIds}
        disabled={!isIdle}
        placeholder="Withdrawal request object ID (0x...)"
      />

      {/* ECDSA Signatures */}
      <div style={nestedBlockStyle}>
        <div style={nestedTitleStyle}>
          ECDSA Signatures ({ecdsaSignatures.length}{' '}
          {ecdsaSignatures.length === 1 ? 'entry' : 'entries'})
        </div>
        {ecdsaSignatures.map((s, i) => (
          <div key={i} style={rowStyle}>
            <span style={{ fontSize: 11, color: '#666', minWidth: 20 }}>
              {i + 1}.
            </span>
            <HexInput
              value={s}
              onChange={(v) => updateEcdsaSig(i, v)}
              placeholder="ECDSA signature (hex)"
              disabled={!isIdle}
              label={`ECDSA signature ${i + 1}`}
            />
            {isIdle && ecdsaSignatures.length > 1 && (
              <button onClick={() => removeEcdsaSig(i)} style={removeBtnStyle}>
                Remove
              </button>
            )}
          </div>
        ))}
        {isIdle && (
          <button onClick={addEcdsaSig} style={addBtnStyle}>
            + Add Signature
          </button>
        )}
      </div>

      <CommitteeSignatureInputs
        values={sig}
        onChange={setSig}
        disabled={!isIdle}
      />

      <ActionButtons
        phase={state.phase}
        canBuild={!!canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 4. confirmWithdrawal
// ---------------------------------------------------------------------------

function ConfirmWithdrawalPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [withdrawalId, setWithdrawalId] = useState('');
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    withdrawalId.trim() && sig.epoch.trim() && sig.signature.trim() && sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.confirmWithdrawal({
      withdrawalId: withdrawalId.trim(),
      epoch: BigInt(sig.epoch.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, withdrawalId, sig, canBuild, build]);

  return (
    <OperationPanel
      title="confirmWithdrawal"
      description="Confirm a withdrawal after Bitcoin broadcast with a committee signature."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Withdrawal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Pending withdrawal object ID (0x...)"
          value={withdrawalId}
          onChange={(e) => setWithdrawalId(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <CommitteeSignatureInputs
        values={sig}
        onChange={setSig}
        disabled={state.phase !== 'idle'}
      />
      <ActionButtons
        phase={state.phase}
        canBuild={!!canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 5. deleteExpiredSpentUtxo
// ---------------------------------------------------------------------------

function DeleteExpiredSpentUtxoPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [txid, setTxid] = useState('');
  const [vout, setVout] = useState('');

  const canBuild = txid.trim() && vout.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.deleteExpiredSpentUtxo({
      txid: txid.trim(),
      vout: Number(vout.trim()),
    });
    build(builder);
  }, [client, txid, vout, canBuild, build]);

  return (
    <OperationPanel
      title="deleteExpiredSpentUtxo"
      description="Delete an expired spent UTXO by its Bitcoin transaction ID and output index."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Bitcoin txid:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="64-char hex string"
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
      <ActionButtons
        phase={state.phase}
        canBuild={!!canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// Main CommitteeWithdrawalsPanel
// ---------------------------------------------------------------------------

export function CommitteeWithdrawalsPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Committee: Withdrawals</h2>
      <AuthorityWarning role="committee" />
      <WalletGuard>
        <ApproveWithdrawalRequestsPanel />
        <CommitWithdrawalTxPanel />
        <SignWithdrawalPanel />
        <ConfirmWithdrawalPanel />
        <DeleteExpiredSpentUtxoPanel />
      </WalletGuard>
    </div>
  );
}
