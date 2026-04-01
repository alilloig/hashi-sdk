/**
 * WalletGuard: conditional renderer that gates children behind wallet connection.
 *
 * When no wallet is connected, shows a "Connect wallet" message.
 * When connected, renders the children.
 */

import type { ReactNode } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

interface WalletGuardProps {
  children: ReactNode;
}

export function WalletGuard({ children }: WalletGuardProps) {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <div style={containerStyle}>
        <p style={messageStyle}>Connect wallet to use this operation</p>
      </div>
    );
  }

  return <>{children}</>;
}

const containerStyle: React.CSSProperties = {
  border: '1px solid #444',
  borderRadius: 6,
  padding: 24,
  backgroundColor: '#1a1a2e',
  textAlign: 'center',
};

const messageStyle: React.CSSProperties = {
  color: '#888',
  fontSize: 14,
  margin: 0,
};
