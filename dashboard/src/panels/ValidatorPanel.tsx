/**
 * ValidatorPanel: sub-panels for the 6 validator management operations.
 *
 * - register: Register as a Hashi validator (no params)
 * - updatePublicKey: Update BLS public key + proof-of-possession
 * - updateOperatorAddress: Update the operator address
 * - updateEndpointUrl: Update the endpoint URL
 * - updateTlsPublicKey: Update the TLS public key
 * - updateEncryptionPublicKey: Update the encryption public key
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { useTransactionExecution } from '../hooks/useTransactionExecution';
import { WalletGuard } from '../components/WalletGuard';
import { OperationPanel } from '../components/OperationPanel';
import { HexInput, hexToBytes } from '../components/HexInput';
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
// 1. register
// ---------------------------------------------------------------------------

function RegisterPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const handleBuild = useCallback(() => {
    const builder = client.register();
    build(builder);
  }, [client, build]);

  return (
    <OperationPanel
      title="register"
      description="Register as a Hashi validator. No parameters required."
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
// 2. updatePublicKey
// ---------------------------------------------------------------------------

function UpdatePublicKeyPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [validator, setValidator] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [popSignature, setPopSignature] = useState('');

  const canBuild = validator.trim() && publicKey.trim() && popSignature.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.updatePublicKey({
      validator: validator.trim(),
      nextEpochPublicKey: hexToBytes(publicKey.trim()),
      proofOfPossessionSignature: hexToBytes(popSignature.trim()),
    });
    build(builder);
  }, [client, validator, publicKey, popSignature, canBuild, build]);

  return (
    <OperationPanel
      title="updatePublicKey"
      description="Update a validator's next epoch BLS12-381 public key."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Validator ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator object ID (0x...)"
          value={validator}
          onChange={(e) => setValidator(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Public Key (hex):</span>
        <HexInput
          value={publicKey}
          onChange={setPublicKey}
          placeholder="BLS12-381 G1 point (48 bytes hex)"
          disabled={state.phase !== 'idle'}
          label="Next epoch public key"
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>PoP Signature:</span>
        <HexInput
          value={popSignature}
          onChange={setPopSignature}
          placeholder="Proof of possession signature (hex)"
          disabled={state.phase !== 'idle'}
          label="Proof of possession signature"
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
// 3. updateOperatorAddress
// ---------------------------------------------------------------------------

function UpdateOperatorAddressPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [validator, setValidator] = useState('');
  const [operator, setOperator] = useState('');

  const canBuild = validator.trim() && operator.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.updateOperatorAddress({
      validator: validator.trim(),
      operator: operator.trim(),
    });
    build(builder);
  }, [client, validator, operator, canBuild, build]);

  return (
    <OperationPanel
      title="updateOperatorAddress"
      description="Update a validator's operator address."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Validator ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator object ID (0x...)"
          value={validator}
          onChange={(e) => setValidator(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>New Operator:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="New operator address (0x...)"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
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
// 4. updateEndpointUrl
// ---------------------------------------------------------------------------

function UpdateEndpointUrlPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [validator, setValidator] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');

  const canBuild = validator.trim() && endpointUrl.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.updateEndpointUrl({
      validator: validator.trim(),
      endpointUrl: endpointUrl.trim(),
    });
    build(builder);
  }, [client, validator, endpointUrl, canBuild, build]);

  return (
    <OperationPanel
      title="updateEndpointUrl"
      description="Update a validator's endpoint URL."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Validator ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator object ID (0x...)"
          value={validator}
          onChange={(e) => setValidator(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Endpoint URL:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="New endpoint URL string"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
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
// 5. updateTlsPublicKey
// ---------------------------------------------------------------------------

function UpdateTlsPublicKeyPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [validator, setValidator] = useState('');
  const [tlsKey, setTlsKey] = useState('');

  const canBuild = validator.trim() && tlsKey.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.updateTlsPublicKey({
      validator: validator.trim(),
      tlsPublicKey: hexToBytes(tlsKey.trim()),
    });
    build(builder);
  }, [client, validator, tlsKey, canBuild, build]);

  return (
    <OperationPanel
      title="updateTlsPublicKey"
      description="Update a validator's TLS public key."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Validator ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator object ID (0x...)"
          value={validator}
          onChange={(e) => setValidator(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>TLS Key (hex):</span>
        <HexInput
          value={tlsKey}
          onChange={setTlsKey}
          placeholder="TLS public key (hex)"
          disabled={state.phase !== 'idle'}
          label="TLS public key"
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
// 6. updateEncryptionPublicKey
// ---------------------------------------------------------------------------

function UpdateEncryptionPublicKeyPanel() {
  const client = useHashiClient();
  const { state, build, execute, reset } = useTransactionExecution();

  const [validator, setValidator] = useState('');
  const [encKey, setEncKey] = useState('');

  const canBuild = validator.trim() && encKey.trim();

  const handleBuild = useCallback(() => {
    if (!canBuild) return;
    const builder = client.updateEncryptionPublicKey({
      validator: validator.trim(),
      nextEpochEncryptionPublicKey: hexToBytes(encKey.trim()),
    });
    build(builder);
  }, [client, validator, encKey, canBuild, build]);

  return (
    <OperationPanel
      title="updateEncryptionPublicKey"
      description="Update a validator's next epoch encryption public key."
      result={renderTransactionResult(state)}
    >
      <div style={rowStyle}>
        <span style={labelStyle}>Validator ID:</span>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator object ID (0x...)"
          value={validator}
          onChange={(e) => setValidator(e.target.value)}
          disabled={state.phase !== 'idle'}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Enc Key (hex):</span>
        <HexInput
          value={encKey}
          onChange={setEncKey}
          placeholder="Encryption public key (hex)"
          disabled={state.phase !== 'idle'}
          label="Encryption public key"
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
// Main ValidatorPanel
// ---------------------------------------------------------------------------

export function ValidatorPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Validator Management</h2>
      <AuthorityWarning role="validator" />
      <WalletGuard>
        <RegisterPanel />
        <UpdatePublicKeyPanel />
        <UpdateOperatorAddressPanel />
        <UpdateEndpointUrlPanel />
        <UpdateTlsPublicKeyPanel />
        <UpdateEncryptionPublicKeyPanel />
      </WalletGuard>
    </div>
  );
}
