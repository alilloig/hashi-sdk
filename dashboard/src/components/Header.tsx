/**
 * Header: top bar with wallet connection status.
 *
 * Shows a ConnectButton from dapp-kit-react and displays the connected
 * wallet address when connected.
 */

import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

export function Header() {
  const account = useCurrentAccount();

  return (
    <header style={headerStyle}>
      <div style={titleStyle}>Hashi Bridge Dashboard</div>
      <div style={walletAreaStyle}>
        {account && (
          <span style={addressStyle} title={account.address}>
            {truncateAddress(account.address)}
          </span>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}

/** Truncate a Sui address to show first 6 and last 4 hex chars. */
function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  backgroundColor: '#111122',
  borderBottom: '1px solid #333',
  minHeight: 56,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#e0e0e0',
};

const walletAreaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const addressStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#88aaff',
  fontFamily: 'monospace',
};
