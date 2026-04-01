/**
 * App: root component that composes the sidebar, header, and content area.
 *
 * Uses hash-based navigation to select which panel to display.
 */

import { useState, useEffect, useCallback } from 'react';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { HashiClientProvider } from './context/HashiClientContext';
import { dAppKit } from './dapp-kit';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FaucetsPanel } from './panels/FaucetsPanel';
import { PlaceholderPanel } from './panels/PlaceholderPanel';

/** Read the current URL hash, defaulting to #faucets. */
function getHash(): string {
  return window.location.hash || '#faucets';
}

/** Map of hash fragments to human-readable panel titles. */
const PANEL_TITLES: Record<string, string> = {
  '#queries': 'Queries',
  '#user-operations': 'User Operations',
  '#validator-management': 'Validator Management',
  '#committee-deposits': 'Committee: Deposits',
  '#committee-withdrawals': 'Committee: Withdrawals',
  '#reconfiguration': 'Reconfiguration',
  '#certificate-operations': 'Certificate Operations',
  '#governance': 'Governance',
  '#events': 'Events',
  '#bitcoin-helpers': 'Bitcoin Helpers',
};

function AppContent() {
  const [activeHash, setActiveHash] = useState(getHash);

  useEffect(() => {
    function onHashChange() {
      setActiveHash(getHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = useCallback((hash: string) => {
    window.location.hash = hash;
    setActiveHash(hash);
  }, []);

  function renderContent() {
    if (activeHash === '#faucets') {
      return <FaucetsPanel />;
    }

    const title = PANEL_TITLES[activeHash];
    if (title) {
      return <PlaceholderPanel title={title} />;
    }

    // Unknown hash -- default to faucets
    return <FaucetsPanel />;
  }

  return (
    <div style={layoutStyle}>
      <Sidebar activeHash={activeHash} onNavigate={handleNavigate} />
      <div style={mainStyle}>
        <Header />
        <div style={contentStyle}>{renderContent()}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <HashiClientProvider>
        <AppContent />
      </HashiClientProvider>
    </DAppKitProvider>
  );
}

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#0d0d1a',
  color: '#e0e0e0',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: 24,
  overflowY: 'auto',
};
