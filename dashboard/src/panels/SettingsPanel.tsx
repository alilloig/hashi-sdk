/**
 * SettingsPanel: allows users to update the Hashi devnet deployment IDs.
 *
 * Sui devnet resets periodically, wiping all deployed objects. After a reset,
 * users need to enter the new package ID and Hashi object ID from a fresh deployment.
 *
 * Config is persisted in localStorage.
 */

import { useState, useCallback } from 'react';
import { useHashiConfig } from '../context/HashiClientContext';
import { OperationPanel } from '../components/OperationPanel';

export function SettingsPanel() {
  const { config, updateConfig, resetConfig } = useHashiConfig();

  const [packageId, setPackageId] = useState(config.packageId);
  const [hashiObjectId, setHashiObjectId] = useState(config.hashiObjectId);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    updateConfig({
      packageId: packageId.trim(),
      originalPackageId: packageId.trim(),
      hashiObjectId: hashiObjectId.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [packageId, hashiObjectId, updateConfig]);

  const handleReset = useCallback(() => {
    resetConfig();
    // Reload defaults from config after reset
    const fresh = {
      packageId:
        '0xe87f0c85488c5c442612103a08e5df93d2f190cdb0456b667f5257be506aefc7',
      hashiObjectId:
        '0x3b8013407b5caaceb9dbfce56c45987c8e778c2302fc712bd52db093f5997c04',
    };
    setPackageId(fresh.packageId);
    setHashiObjectId(fresh.hashiObjectId);
    setSaved(false);
  }, [resetConfig]);

  const isModified =
    packageId.trim() !== config.packageId ||
    hashiObjectId.trim() !== config.hashiObjectId;

  return (
    <div>
      <h2 style={sectionTitleStyle}>Settings</h2>

      <OperationPanel
        title="Devnet Deployment Configuration"
        description="Sui devnet resets periodically, wiping all deployed objects. After a reset, paste the new deployment IDs here. Changes are saved to localStorage and take effect immediately."
      >
        <div style={formStyle}>
          <label style={labelStyle}>
            Hashi Package ID
            <input
              style={inputStyle}
              type="text"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              placeholder="0x..."
            />
          </label>

          <label style={labelStyle}>
            Hashi Object ID
            <input
              style={inputStyle}
              type="text"
              value={hashiObjectId}
              onChange={(e) => setHashiObjectId(e.target.value)}
              placeholder="0x..."
            />
          </label>

          <div style={buttonRowStyle}>
            <button
              onClick={handleSave}
              disabled={!isModified && !saved}
              style={
                !isModified && !saved ? disabledButtonStyle : buttonStyle
              }
            >
              {saved ? 'Saved!' : 'Save Configuration'}
            </button>
            <button onClick={handleReset} style={secondaryButtonStyle}>
              Reset to Defaults
            </button>
          </div>
        </div>
      </OperationPanel>

      <OperationPanel
        title="Current Active Config"
        description="These are the values currently being used by the dashboard."
      >
        <pre style={preStyle}>
          {JSON.stringify(
            {
              packageId: config.packageId,
              originalPackageId: config.originalPackageId,
              hashiObjectId: config.hashiObjectId,
              rpcUrl: 'https://fullnode.devnet.sui.io',
              network: 'devnet',
            },
            null,
            2,
          )}
        </pre>
      </OperationPanel>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: 16,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: '#aaa',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  fontFamily: 'monospace',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 4,
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

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  backgroundColor: '#333',
  color: '#ccc',
  border: '1px solid #555',
  borderRadius: 4,
  cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#aaa',
  backgroundColor: '#111',
  padding: 12,
  borderRadius: 4,
  overflow: 'auto',
  margin: 0,
};
