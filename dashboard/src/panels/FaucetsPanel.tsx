/**
 * FaucetsPanel: SUI devnet faucet button and BTC signet faucet link.
 *
 * The SUI faucet uses requestSuiFromFaucetV2 from @mysten/sui/faucet.
 * The BTC faucet is an external link that opens in a new tab.
 */

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { requestSuiFromFaucetV2, getFaucetHost } from '@mysten/sui/faucet';
import { OperationPanel } from '../components/OperationPanel';
import { JsonViewer } from '../components/JsonViewer';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { btcFaucetLink } from '../config';

type FaucetResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; error: Error | string };

export function FaucetsPanel() {
  const account = useCurrentAccount();
  const [faucetResult, setFaucetResult] = useState<FaucetResult>({
    status: 'idle',
  });

  async function handleRequestSui() {
    if (!account) return;

    setFaucetResult({ status: 'loading' });

    try {
      const response = await requestSuiFromFaucetV2({
        host: getFaucetHost('devnet'),
        recipient: account.address,
      });
      setFaucetResult({ status: 'success', data: response });
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      setFaucetResult({ status: 'error', error });
    }
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>Faucets</h2>

      <OperationPanel
        title="SUI Devnet Faucet"
        description="Request SUI tokens from the Sui devnet faucet. Requires a connected wallet."
        result={
          faucetResult.status === 'success' ? (
            <JsonViewer data={faucetResult.data} label="Faucet Response" />
          ) : faucetResult.status === 'error' ? (
            <ErrorDisplay error={faucetResult.error} />
          ) : null
        }
      >
        <button
          onClick={handleRequestSui}
          disabled={!account || faucetResult.status === 'loading'}
          style={buttonStyle}
        >
          {faucetResult.status === 'loading'
            ? 'Requesting...'
            : 'Request SUI from Devnet Faucet'}
        </button>
        {!account && (
          <p style={hintStyle}>Connect your wallet first to request SUI.</p>
        )}
      </OperationPanel>

      <OperationPanel
        title="BTC Testnet4 Faucet"
        description="Get testnet Bitcoin from the Mempool Testnet4 faucet. Opens in a new tab."
      >
        <a
          href={btcFaucetLink}
          target="_blank"
          rel="noopener noreferrer"
          style={linkButtonStyle}
        >
          Open BTC Testnet4 Faucet
        </a>
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

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  backgroundColor: '#2244aa',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 16px',
  fontSize: 13,
  backgroundColor: '#aa6622',
  color: '#fff',
  borderRadius: 4,
  textDecoration: 'none',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 8,
};
