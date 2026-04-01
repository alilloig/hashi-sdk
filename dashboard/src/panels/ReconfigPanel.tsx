/**
 * ReconfigPanel: sub-panels for the 2 reconfiguration operations.
 *
 * - startReconfig: Begin committee reconfiguration (no params)
 * - endReconfig: Complete reconfiguration with MPC public key + committee signature
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
  rowStyle,
  labelStyle,
  renderTransactionResult,
  ActionButtons,
  AuthorityWarning,
} from './shared';

// ---------------------------------------------------------------------------
// 1. startReconfig
// ---------------------------------------------------------------------------

function StartReconfigPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const handleBuild = useCallback(() => {
    const builder = client.startReconfig();
    build(builder);
  }, [client, build]);

  return (
    <OperationPanel
      title="startReconfig"
      description="Initiate committee reconfiguration. Uses the SuiSystem shared object (auto-injected). No parameters required."
      result={renderTransactionResult(state)}
    >
      <ActionButtons
        phase={state.phase}
        canBuild={true}
        onBuild={handleBuild}
        onExecute={() => execute()}
        onReset={reset}
      />
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. endReconfig
// ---------------------------------------------------------------------------

function EndReconfigPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [mpcPublicKey, setMpcPublicKey] = useState('');
  const [sig, setSig] = useState<CommitteeSignatureValues>({
    epoch: '',
    signature: '',
    signersBitmap: '',
  });

  const canBuild =
    mpcPublicKey.trim() && sig.signature.trim() && sig.signersBitmap.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.endReconfig({
      mpcPublicKey: hexToBytes(mpcPublicKey.trim()),
      signature: hexToBytes(sig.signature.trim()),
      signersBitmap: hexToBytes(sig.signersBitmap.trim()),
    });
    build(builder);
  }, [client, mpcPublicKey, sig, canBuild, build]);

  return (
    <OperationPanel
      title="endReconfig"
      description="Complete reconfiguration with the new MPC committee threshold public key and committee signature."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>MPC Public Key:</span>
        <HexInput
          value={mpcPublicKey}
          onChange={setMpcPublicKey}
          placeholder="New MPC threshold public key (hex)"
          disabled={state.phase !== 'idle'}
          label="MPC public key"
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
// Main ReconfigPanel
// ---------------------------------------------------------------------------

export function ReconfigPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Reconfiguration</h2>
      <AuthorityWarning role="committee/validator" />
      <WalletGuard>
        <StartReconfigPanel />
        <EndReconfigPanel />
      </WalletGuard>
    </div>
  );
}
