/**
 * CertificatePanel: sub-panels for the 4 certificate operations.
 *
 * - submitDkgCert: Submit a DKG certificate
 * - submitRotationCert: Submit a rotation certificate
 * - submitNonceCert: Submit a nonce certificate (with batch index)
 * - destroyAllCerts: Destroy all certificates for an epoch
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { useTransactionExecution } from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { OperationPanel } from '../components/OperationPanel';
import { CommitteeSignatureInputs, type CommitteeSignatureValues } from '../components/CommitteeSignatureInputs';
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

// ---------------------------------------------------------------------------
// Shared base cert form (DKG and Rotation share the same fields)
// ---------------------------------------------------------------------------

interface BaseCertFormState {
  epoch: string;
  dealer: string;
  messagesHash: string;
  sig: CommitteeSignatureValues;
}

function useBaseCertForm() {
  const [epoch, setEpoch] = useState('');
  const [dealer, setDealer] = useState('');
  const [messagesHash, setMessagesHash] = useState('');
  const [sig, setSig] = useState<CommitteeSignatureValues>(emptyCommitteeSig);

  const canBuild =
    epoch.trim() &&
    dealer.trim() &&
    messagesHash.trim() &&
    sig.signature.trim() &&
    sig.signersBitmap.trim();

  const values: BaseCertFormState = { epoch, dealer, messagesHash, sig };

  return {
    values,
    canBuild: !!canBuild,
    setEpoch,
    setDealer,
    setMessagesHash,
    setSig,
  };
}

function BaseCertFormFields({
  form,
  disabled,
}: {
  form: ReturnType<typeof useBaseCertForm>;
  disabled: boolean;
}) {
  return (
    <>
      <div style={rowStyle}>
        <span style={labelStyle}>Epoch:</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="e.g. 1"
          value={form.values.epoch}
          onChange={(e) => form.setEpoch(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Dealer:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Dealer address (0x...)"
          value={form.values.dealer}
          onChange={(e) => form.setDealer(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Messages Hash:</span>
        <HexInput
          value={form.values.messagesHash}
          onChange={form.setMessagesHash}
          placeholder="Hash of dealer messages (hex)"
          disabled={disabled}
          label="Messages hash"
        />
      </div>
      <CommitteeSignatureInputs
        values={form.values.sig}
        onChange={form.setSig}
        disabled={disabled}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. submitDkgCert
// ---------------------------------------------------------------------------

function SubmitDkgCertPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();
  const form = useBaseCertForm();

  const handleBuild = useCallback(() => {
    if (!form.canBuild) return;
    const v = form.values;
    const builder = client.submitDkgCert({
      epoch: BigInt(v.epoch.trim()),
      dealer: v.dealer.trim(),
      messagesHash: hexToBytes(v.messagesHash.trim()),
      signature: hexToBytes(v.sig.signature.trim()),
      signersBitmap: hexToBytes(v.sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, form, build]);

  return (
    <OperationPanel
      title="submitDkgCert"
      description="Submit a DKG (Distributed Key Generation) certificate."
      result={renderTransactionResult(state)}
    >
      <BaseCertFormFields form={form} disabled={state.phase !== 'idle'} />
      <ActionButtons
        phase={state.phase}
        canBuild={form.canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. submitRotationCert
// ---------------------------------------------------------------------------

function SubmitRotationCertPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();
  const form = useBaseCertForm();

  const handleBuild = useCallback(() => {
    if (!form.canBuild) return;
    const v = form.values;
    const builder = client.submitRotationCert({
      epoch: BigInt(v.epoch.trim()),
      dealer: v.dealer.trim(),
      messagesHash: hexToBytes(v.messagesHash.trim()),
      signature: hexToBytes(v.sig.signature.trim()),
      signersBitmap: hexToBytes(v.sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, form, build]);

  return (
    <OperationPanel
      title="submitRotationCert"
      description="Submit a key rotation certificate."
      result={renderTransactionResult(state)}
    >
      <BaseCertFormFields form={form} disabled={state.phase !== 'idle'} />
      <ActionButtons
        phase={state.phase}
        canBuild={form.canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 3. submitNonceCert
// ---------------------------------------------------------------------------

function SubmitNonceCertPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();
  const form = useBaseCertForm();
  const [batchIndex, setBatchIndex] = useState('');

  const canBuild = form.canBuild && batchIndex.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const v = form.values;
    const builder = client.submitNonceCert({
      epoch: BigInt(v.epoch.trim()),
      batchIndex: Number(batchIndex.trim()),
      dealer: v.dealer.trim(),
      messagesHash: hexToBytes(v.messagesHash.trim()),
      signature: hexToBytes(v.sig.signature.trim()),
      signersBitmap: hexToBytes(v.sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, form, batchIndex, canBuild, build]);

  return (
    <OperationPanel
      title="submitNonceCert"
      description="Submit a nonce certificate for a specific batch."
      result={renderTransactionResult(state)}
    >
      <BaseCertFormFields form={form} disabled={state.phase !== 'idle'} />
      <div style={rowStyle}>
        <span style={labelStyle}>Batch Index:</span>
        <input
          style={smallInputStyle}
          type="number"
          placeholder="0"
          min="0"
          value={batchIndex}
          onChange={(e) => setBatchIndex(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <ActionButtons
        phase={state.phase}
        canBuild={canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 4. destroyAllCerts
// ---------------------------------------------------------------------------

function DestroyAllCertsPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [epoch, setEpoch] = useState('');
  const [batchIndex, setBatchIndex] = useState('');
  const [useBatchIndex, setUseBatchIndex] = useState(false);

  const canBuild = epoch.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.destroyAllCerts({
      epoch: BigInt(epoch.trim()),
      batchIndex: useBatchIndex && batchIndex.trim() ? Number(batchIndex.trim()) : null,
    });
    build(builder);
  }, [client, epoch, batchIndex, useBatchIndex, canBuild, build]);

  return (
    <OperationPanel
      title="destroyAllCerts"
      description="Destroy all certificates for a given epoch. Optionally filter by batch index."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Epoch:</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="e.g. 1"
          value={epoch}
          onChange={(e) => setEpoch(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={useBatchIndex}
            onChange={(e) => setUseBatchIndex(e.target.checked)}
            disabled={state.phase !== 'idle'}
          />
          Filter by batch index
        </label>
      </div>
      {useBatchIndex && (
        <div style={rowStyle}>
          <span style={labelStyle}>Batch Index:</span>
          <input
            style={smallInputStyle}
            type="number"
            placeholder="0"
            min="0"
            value={batchIndex}
            onChange={(e) => setBatchIndex(e.target.value)}
            disabled={state.phase !== 'idle'}
          />
        </div>
      )}
      <div style={hintStyle}>
        When batch index is not specified, all certificates for the epoch are destroyed.
      </div>
      <ActionButtons
        phase={state.phase}
        canBuild={canBuild}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// Main CertificatePanel
// ---------------------------------------------------------------------------

export function CertificatePanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Certificate Operations</h2>
      <AuthorityWarning role="committee/validator" />
      <WalletGuard>
        <SubmitDkgCertPanel />
        <SubmitRotationCertPanel />
        <SubmitNonceCertPanel />
        <DestroyAllCertsPanel />
      </WalletGuard>
    </div>
  );
}
