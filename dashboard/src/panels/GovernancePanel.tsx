/**
 * GovernancePanel: sub-panels for all 12 governance operations.
 *
 * Proposal lifecycle:
 *   - proposeUpdateConfig, proposeEnableVersion, proposeDisableVersion, proposeUpgrade
 *   - vote, removeVote
 *   - executeUpdateConfig, executeEnableVersion, executeDisableVersion, executeUpgrade
 *   - deleteExpiredProposal
 *   - finalizeUpgrade
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { useTransactionExecution } from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { OperationPanel } from '../components/OperationPanel';
import { HexInput, hexToBytes } from '../components/HexInput';
import type { ProposalTypeName } from 'hashi-sdk';
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
// Shared proposal type selector
// ---------------------------------------------------------------------------

const PROPOSAL_TYPES: ProposalTypeName[] = [
  'UpdateConfig',
  'EnableVersion',
  'DisableVersion',
  'Upgrade',
];

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  minWidth: 180,
};

function ProposalTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ProposalTypeName;
  onChange: (v: ProposalTypeName) => void;
  disabled: boolean;
}) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>Proposal Type:</span>
      <select
        style={selectStyle}
        value={value}
        onChange={(e) => onChange(e.target.value as ProposalTypeName)}
        disabled={disabled}
      >
        {PROPOSAL_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared proposal ID + type form (used by vote, removeVote, deleteExpired)
// ---------------------------------------------------------------------------

function ProposalIdAndType({
  proposalId,
  setProposalId,
  proposalType,
  setProposalType,
  disabled,
}: {
  proposalId: string;
  setProposalId: (v: string) => void;
  proposalType: ProposalTypeName;
  setProposalType: (v: ProposalTypeName) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div style={rowStyle}>
        <span style={labelStyle}>Proposal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Proposal object ID (0x...)"
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
          disabled={disabled}
        />
      </div>
      <ProposalTypeSelector
        value={proposalType}
        onChange={setProposalType}
        disabled={disabled}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. proposeUpdateConfig
// ---------------------------------------------------------------------------

function ProposeUpdateConfigPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [metadata, setMetadata] = useState('');

  const canBuild = key.trim() && value.trim() && metadata.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.proposeUpdateConfig({
      key: key.trim(),
      value: value.trim(),
      metadata: metadata.trim(),
    });
    build(builder);
  }, [client, key, value, metadata, canBuild, build]);

  return (
    <OperationPanel
      title="proposeUpdateConfig"
      description="Create a proposal to update a config key/value pair."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Config Key:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="e.g. min_deposit_amount"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Config Value ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Config value object ID (0x...)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Metadata ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="VecMap<String,String> object ID (0x...)"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={hintStyle}>
        The value should be a config_value object ID (created in the same PTB or previously).
        The metadata should be a VecMap object ID.
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
// 2. proposeEnableVersion
// ---------------------------------------------------------------------------

function ProposeEnableVersionPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [version, setVersion] = useState('');
  const [metadata, setMetadata] = useState('');

  const canBuild = version.trim() && metadata.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.proposeEnableVersion({
      version: BigInt(version.trim()),
      metadata: metadata.trim(),
    });
    build(builder);
  }, [client, version, metadata, canBuild, build]);

  return (
    <OperationPanel
      title="proposeEnableVersion"
      description="Create a proposal to enable a package version."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Version:</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="e.g. 2"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Metadata ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Metadata object ID (0x...)"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
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
// 3. proposeDisableVersion
// ---------------------------------------------------------------------------

function ProposeDisableVersionPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [version, setVersion] = useState('');
  const [metadata, setMetadata] = useState('');

  const canBuild = version.trim() && metadata.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.proposeDisableVersion({
      version: BigInt(version.trim()),
      metadata: metadata.trim(),
    });
    build(builder);
  }, [client, version, metadata, canBuild, build]);

  return (
    <OperationPanel
      title="proposeDisableVersion"
      description="Create a proposal to disable a package version."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Version:</span>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="e.g. 1"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Metadata ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Metadata object ID (0x...)"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
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
// 4. proposeUpgrade
// ---------------------------------------------------------------------------

function ProposeUpgradePanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [digest, setDigest] = useState('');
  const [metadata, setMetadata] = useState('');

  const canBuild = digest.trim() && metadata.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.proposeUpgrade({
      digest: hexToBytes(digest.trim()),
      metadata: metadata.trim(),
    });
    build(builder);
  }, [client, digest, metadata, canBuild, build]);

  return (
    <OperationPanel
      title="proposeUpgrade"
      description="Create a proposal to upgrade the package."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Digest (hex):</span>
        <HexInput
          value={digest}
          onChange={setDigest}
          placeholder="Package digest bytes (hex)"
          disabled={state.phase !== 'idle'}
          label="Upgrade digest"
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Metadata ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Metadata object ID (0x...)"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
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
// 5. vote
// ---------------------------------------------------------------------------

function VotePanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const [proposalType, setProposalType] = useState<ProposalTypeName>('UpdateConfig');

  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.vote({
      proposalId: proposalId.trim(),
      proposalType,
    });
    build(builder);
  }, [client, proposalId, proposalType, canBuild, build]);

  return (
    <OperationPanel
      title="vote"
      description="Cast a vote on an existing proposal."
      result={renderTransactionResult(state)}
    >
      <ProposalIdAndType
        proposalId={proposalId}
        setProposalId={setProposalId}
        proposalType={proposalType}
        setProposalType={setProposalType}
        disabled={state.phase !== 'idle'}
      />
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
// 6. removeVote
// ---------------------------------------------------------------------------

function RemoveVotePanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const [proposalType, setProposalType] = useState<ProposalTypeName>('UpdateConfig');

  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.removeVote({
      proposalId: proposalId.trim(),
      proposalType,
    });
    build(builder);
  }, [client, proposalId, proposalType, canBuild, build]);

  return (
    <OperationPanel
      title="removeVote"
      description="Remove your vote from an existing proposal."
      result={renderTransactionResult(state)}
    >
      <ProposalIdAndType
        proposalId={proposalId}
        setProposalId={setProposalId}
        proposalType={proposalType}
        setProposalType={setProposalType}
        disabled={state.phase !== 'idle'}
      />
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
// 7. deleteExpiredProposal
// ---------------------------------------------------------------------------

function DeleteExpiredProposalPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const [proposalType, setProposalType] = useState<ProposalTypeName>('UpdateConfig');

  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.deleteExpiredProposal({
      proposalId: proposalId.trim(),
      proposalType,
    });
    build(builder);
  }, [client, proposalId, proposalType, canBuild, build]);

  return (
    <OperationPanel
      title="deleteExpiredProposal"
      description="Delete an expired proposal. The proposal must have passed its expiration time."
      result={renderTransactionResult(state)}
    >
      <ProposalIdAndType
        proposalId={proposalId}
        setProposalId={setProposalId}
        proposalType={proposalType}
        setProposalType={setProposalType}
        disabled={state.phase !== 'idle'}
      />
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
// 8. executeUpdateConfig
// ---------------------------------------------------------------------------

function ExecuteUpdateConfigPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.executeUpdateConfig({ proposalId: proposalId.trim() });
    build(builder);
  }, [client, proposalId, canBuild, build]);

  return (
    <OperationPanel
      title="executeUpdateConfig"
      description="Execute an approved UpdateConfig proposal."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Proposal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Proposal object ID (0x...)"
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
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
// 9. executeEnableVersion
// ---------------------------------------------------------------------------

function ExecuteEnableVersionPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.executeEnableVersion({ proposalId: proposalId.trim() });
    build(builder);
  }, [client, proposalId, canBuild, build]);

  return (
    <OperationPanel
      title="executeEnableVersion"
      description="Execute an approved EnableVersion proposal."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Proposal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Proposal object ID (0x...)"
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
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
// 10. executeDisableVersion
// ---------------------------------------------------------------------------

function ExecuteDisableVersionPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.executeDisableVersion({ proposalId: proposalId.trim() });
    build(builder);
  }, [client, proposalId, canBuild, build]);

  return (
    <OperationPanel
      title="executeDisableVersion"
      description="Execute an approved DisableVersion proposal."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Proposal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Proposal object ID (0x...)"
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
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
// 11. executeUpgrade
// ---------------------------------------------------------------------------

function ExecuteUpgradePanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [proposalId, setProposalId] = useState('');
  const canBuild = proposalId.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    // executeUpgrade returns TransactionResult (UpgradeTicket), but
    // from the dashboard perspective we treat it as a regular build.
    const builder = client.executeUpgrade({ proposalId: proposalId.trim() });
    build(builder);
  }, [client, proposalId, canBuild, build]);

  return (
    <OperationPanel
      title="executeUpgrade"
      description="Execute an approved Upgrade proposal. Returns an UpgradeTicket that must be used with sui::package::upgrade in the same PTB."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Proposal ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Proposal object ID (0x...)"
          value={proposalId}
          onChange={(e) => setProposalId(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={hintStyle}>
        Note: The UpgradeTicket returned must be used with sui::package::upgrade and then
        finalizeUpgrade in the same PTB. This panel builds only the execute step.
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
// 12. finalizeUpgrade
// ---------------------------------------------------------------------------

function FinalizeUpgradePanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [receipt, setReceipt] = useState('');
  const canBuild = receipt.trim().length > 0;

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.finalizeUpgrade({ receipt: receipt.trim() });
    build(builder);
  }, [client, receipt, canBuild, build]);

  return (
    <OperationPanel
      title="finalizeUpgrade"
      description="Finalize a package upgrade using the UpgradeReceipt from sui::package::upgrade."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Receipt ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="UpgradeReceipt object ID (0x...)"
          value={receipt}
          onChange={(e) => setReceipt(e.target.value)}
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
// Main GovernancePanel
// ---------------------------------------------------------------------------

export function GovernancePanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Governance</h2>
      <AuthorityWarning role="committee/validator" />
      <WalletGuard>
        <ProposeUpdateConfigPanel />
        <ProposeEnableVersionPanel />
        <ProposeDisableVersionPanel />
        <ProposeUpgradePanel />
        <VotePanel />
        <RemoveVotePanel />
        <DeleteExpiredProposalPanel />
        <ExecuteUpdateConfigPanel />
        <ExecuteEnableVersionPanel />
        <ExecuteDisableVersionPanel />
        <ExecuteUpgradePanel />
        <FinalizeUpgradePanel />
      </WalletGuard>
    </div>
  );
}
