/**
 * BitcoinHelpersPanel: exposes all Bitcoin utility functions from the SDK.
 *
 * Four functional helper panels:
 * - encodeBitcoinAddress: encode witness program to bech32/bech32m address
 * - decodeBitcoinAddress: decode bech32/bech32m address to components
 * - satsToBtc: convert satoshis to BTC string
 * - btcToSats: convert BTC string to satoshis
 *
 * Plus an info note about deriveDepositAddress (not yet implemented).
 *
 * No wallet connection is required for any of these operations.
 */

import { useState, useCallback } from 'react';
import {
  encodeBitcoinAddress,
  decodeBitcoinAddress,
  satsToBtc,
  btcToSats,
} from 'hashi-sdk/bitcoin';
import { OperationPanel } from '../components/OperationPanel';
import { JsonViewer } from '../components/JsonViewer';
import { ErrorDisplay } from '../components/ErrorDisplay';

// ---------------------------------------------------------------------------
// Shared styles (matching QueriesPanel conventions)
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

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  marginRight: 8,
  minWidth: 300,
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: 120,
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  marginRight: 8,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#1a1a3e',
  border: '1px solid #335',
  borderRadius: 6,
  padding: 16,
  marginBottom: 16,
};

const infoIconStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6688cc',
  fontWeight: 700,
  marginRight: 8,
};

// ---------------------------------------------------------------------------
// Discriminated union for operation state
// ---------------------------------------------------------------------------

type OpState<T> =
  | { status: 'idle' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function renderOpResult<T>(state: OpState<T>, label: string): React.ReactNode {
  switch (state.status) {
    case 'success':
      return <JsonViewer data={state.data} label={label} />;
    case 'error':
      return <ErrorDisplay error={state.error} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 1. encodeBitcoinAddress
// ---------------------------------------------------------------------------

function EncodeBitcoinAddressPanel() {
  const [hexProgram, setHexProgram] = useState('');
  const [witnessVersion, setWitnessVersion] = useState('0');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
  const [state, setState] = useState<OpState<string>>({ status: 'idle' });

  const handleEncode = useCallback(() => {
    try {
      // Parse hex string to Uint8Array
      const hex = hexProgram.trim().replace(/^0x/i, '');
      if (hex.length === 0 || hex.length % 2 !== 0) {
        throw new Error('Witness program must be a valid hex string (even number of characters)');
      }
      if (!/^[0-9a-fA-F]+$/.test(hex)) {
        throw new Error('Witness program must be a valid hex string');
      }

      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
      }

      const version = parseInt(witnessVersion, 10);
      if (isNaN(version)) {
        throw new Error('Witness version must be a number (0 or 1)');
      }

      const address = encodeBitcoinAddress(bytes, version, network);
      setState({ status: 'success', data: address });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [hexProgram, witnessVersion, network]);

  const canEncode = hexProgram.trim().length > 0;

  return (
    <OperationPanel
      title="encodeBitcoinAddress"
      description="Encode a witness program (hex) into a bech32/bech32m Bitcoin address."
      result={renderOpResult(state, 'Encoded Address')}
    >
      <div style={{ ...rowStyle, marginBottom: 8 }}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Witness program (hex, e.g. 0014...)"
          value={hexProgram}
          onChange={(e) => setHexProgram(e.target.value)}
        />
      </div>
      <div style={rowStyle}>
        <select
          style={selectStyle}
          value={witnessVersion}
          onChange={(e) => setWitnessVersion(e.target.value)}
        >
          <option value="0">Version 0 (P2WPKH)</option>
          <option value="1">Version 1 (P2TR / Taproot)</option>
        </select>
        <select
          style={selectStyle}
          value={network}
          onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet')}
        >
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
        </select>
        <button
          onClick={handleEncode}
          disabled={!canEncode}
          style={!canEncode ? disabledButtonStyle : buttonStyle}
        >
          Encode
        </button>
      </div>
      <div style={hintStyle}>
        Version 0: 20-byte program (P2WPKH). Version 1: 32-byte program (P2TR/Taproot).
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. decodeBitcoinAddress
// ---------------------------------------------------------------------------

function DecodeBitcoinAddressPanel() {
  const [address, setAddress] = useState('');
  const [state, setState] = useState<OpState<{
    witnessProgram: string;
    witnessProgramLength: number;
    witnessVersion: number;
    network: string;
  }>>({ status: 'idle' });

  const handleDecode = useCallback(() => {
    try {
      const trimmed = address.trim();
      if (!trimmed) {
        throw new Error('Please enter a Bitcoin address');
      }

      const decoded = decodeBitcoinAddress(trimmed);

      // Convert Uint8Array to hex for display
      const hexProgram = Array.from(decoded.witnessProgram)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      setState({
        status: 'success',
        data: {
          witnessProgram: hexProgram,
          witnessProgramLength: decoded.witnessProgram.length,
          witnessVersion: decoded.witnessVersion,
          network: decoded.network,
        },
      });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [address]);

  const canDecode = address.trim().length > 0;

  return (
    <OperationPanel
      title="decodeBitcoinAddress"
      description="Decode a bech32/bech32m Bitcoin address into its witness program components."
      result={renderOpResult(state, 'Decoded Address')}
    >
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Bitcoin address (bc1... or tb1...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button
          onClick={handleDecode}
          disabled={!canDecode}
          style={!canDecode ? disabledButtonStyle : buttonStyle}
        >
          Decode
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 3. satsToBtc
// ---------------------------------------------------------------------------

function SatsToBtcPanel() {
  const [satsInput, setSatsInput] = useState('');
  const [state, setState] = useState<OpState<{ satoshis: string; btc: string }>>({ status: 'idle' });

  const handleConvert = useCallback(() => {
    try {
      const trimmed = satsInput.trim();
      if (!trimmed) {
        throw new Error('Please enter a satoshi amount');
      }
      if (!/^\d+$/.test(trimmed)) {
        throw new Error('Satoshi amount must be a non-negative integer');
      }

      const sats = BigInt(trimmed);
      const btc = satsToBtc(sats);
      setState({
        status: 'success',
        data: { satoshis: sats.toString(), btc },
      });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [satsInput]);

  const canConvert = satsInput.trim().length > 0;

  return (
    <OperationPanel
      title="satsToBtc"
      description="Convert a satoshi amount to a BTC string with 8 decimal places."
      result={renderOpResult(state, 'Conversion Result')}
    >
      <div style={rowStyle}>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="Satoshis (e.g. 100000000)"
          value={satsInput}
          onChange={(e) => setSatsInput(e.target.value)}
        />
        <button
          onClick={handleConvert}
          disabled={!canConvert}
          style={!canConvert ? disabledButtonStyle : buttonStyle}
        >
          Convert to BTC
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 4. btcToSats
// ---------------------------------------------------------------------------

function BtcToSatsPanel() {
  const [btcInput, setBtcInput] = useState('');
  const [state, setState] = useState<OpState<{ btc: string; satoshis: string }>>({ status: 'idle' });

  const handleConvert = useCallback(() => {
    try {
      const trimmed = btcInput.trim();
      if (!trimmed) {
        throw new Error('Please enter a BTC amount');
      }

      const sats = btcToSats(trimmed);
      setState({
        status: 'success',
        data: { btc: trimmed, satoshis: sats.toString() },
      });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [btcInput]);

  const canConvert = btcInput.trim().length > 0;

  return (
    <OperationPanel
      title="btcToSats"
      description="Convert a BTC decimal string to satoshis (bigint)."
      result={renderOpResult(state, 'Conversion Result')}
    >
      <div style={rowStyle}>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="BTC (e.g. 1.5, 0.001)"
          value={btcInput}
          onChange={(e) => setBtcInput(e.target.value)}
        />
        <button
          onClick={handleConvert}
          disabled={!canConvert}
          style={!canConvert ? disabledButtonStyle : buttonStyle}
        >
          Convert to Sats
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 5. deriveDepositAddress (info note)
// ---------------------------------------------------------------------------

function DeriveDepositAddressNote() {
  return (
    <div style={infoBoxStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <span style={infoIconStyle}>[i]</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
            deriveDepositAddress
          </div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
            This function is not yet implemented in the SDK. It will derive a Bitcoin deposit
            address from the MPC public key and a derivation path. The exact derivation algorithm
            is pending determination from the Rust source (Q-DERIVE). Calling this function
            currently throws an error.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BitcoinHelpersPanel
// ---------------------------------------------------------------------------

export function BitcoinHelpersPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Bitcoin Helpers</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        Pure utility functions for Bitcoin address encoding/decoding and amount conversion.
        No wallet connection required.
      </p>
      <EncodeBitcoinAddressPanel />
      <DecodeBitcoinAddressPanel />
      <SatsToBtcPanel />
      <BtcToSatsPanel />
      <DeriveDepositAddressNote />
    </div>
  );
}
