/**
 * CommitteeDepositsPanel: sub-panels for committee deposit operations.
 *
 * - confirmDeposit: Confirm a deposit with committee signature
 * - deleteExpiredDeposits: Batch-delete expired deposit requests
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { useTransactionExecution } from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { OperationPanel } from '../components/OperationPanel';
import { CommitteeSignatureInputs, type CommitteeSignatureValues } from '../components/CommitteeSignatureInputs';
import { BatchIdInput } from '../components/BatchIdInput';
import { hexToBytes } from '../components/HexInput';
import {
  sectionTitleStyle,
  inputStyle,
  rowStyle,
  labelStyle,
  renderTransactionResult,
  ActionButtons,
  AuthorityWarning,
} from './shared';

// ---------------------------------------------------------------------------
// Default committee signature state factory
// ---------------------------------------------------------------------------

function emptyCommitteeSig(): CommitteeSignatureValues {
  return { epoch: '', signature: '', signersBitmap: '' };
}

// ---------------------------------------------------------------------------
// 1. confirmDeposit
// ---------------------------------------------------------------------------

function ConfirmDepositPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [requestId, setRequestId] = useState('');
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    requestId.trim() && sig.epoch.trim() && sig.signature.trim() && sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.confirmDeposit({
      requestId: requestId.trim(),
      epoch: BigInt(sig.epoch.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, requestId, sig, canBuild, build]);

  return (
    <OperationPanel
      title="confirmDeposit"
      description="Confirm a deposit request with a committee signature. Creates a CommitteeSignature on-chain then calls confirm_deposit."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Request ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Deposit request object ID (0x...)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
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
// 2. deleteExpiredDeposits
// ---------------------------------------------------------------------------

function DeleteExpiredDepositsPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [requestIds, setRequestIds] = useState<string[]>(['']);

  const canBuild = requestIds.some((id) => id.trim().length > 0);

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const ids = requestIds.map((id) => id.trim()).filter((id) => id.length > 0);
    const builder = client.deleteExpiredDeposits({ requestIds: ids });
    build(builder);
  }, [client, requestIds, canBuild, build]);

  return (
    <OperationPanel
      title="deleteExpiredDeposits"
      description="Batch-delete expired deposit requests. Adds one delete call per request ID."
      result={renderTransactionResult(state)}
    >
      <BatchIdInput
        label="Deposit Request IDs"
        ids={requestIds}
        onChange={setRequestIds}
        disabled={state.phase !== 'idle'}
        placeholder="Deposit request object ID (0x...)"
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
// Main CommitteeDepositsPanel
// ---------------------------------------------------------------------------

export function CommitteeDepositsPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Committee: Deposits</h2>
      <AuthorityWarning role="committee" />
      <WalletGuard>
        <ConfirmDepositPanel />
        <DeleteExpiredDepositsPanel />
      </WalletGuard>
    </div>
  );
}
