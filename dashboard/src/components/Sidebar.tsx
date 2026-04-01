/**
 * Sidebar: navigation panel with category headings for all operation groups.
 *
 * Uses hash-based deep links for navigation (e.g., #faucets, #queries).
 */

/** All navigation categories and their hash fragment targets. */
const NAV_CATEGORIES = [
  { label: 'Faucets', hash: '#faucets' },
  { label: 'Queries', hash: '#queries' },
  { label: 'User Operations', hash: '#user-operations' },
  { label: 'Validator Management', hash: '#validator-management' },
  { label: 'Committee: Deposits', hash: '#committee-deposits' },
  { label: 'Committee: Withdrawals', hash: '#committee-withdrawals' },
  { label: 'Reconfiguration', hash: '#reconfiguration' },
  { label: 'Certificate Operations', hash: '#certificate-operations' },
  { label: 'Governance', hash: '#governance' },
  { label: 'Events', hash: '#events' },
  { label: 'Bitcoin Helpers', hash: '#bitcoin-helpers' },
] as const;

interface SidebarProps {
  /** The currently active hash fragment (e.g., '#faucets'). */
  activeHash: string;
  /** Callback when a navigation item is clicked. */
  onNavigate: (hash: string) => void;
}

export function Sidebar({ activeHash, onNavigate }: SidebarProps) {
  return (
    <nav style={navStyle}>
      <div style={logoStyle}>Hashi SDK</div>
      <div style={subtitleStyle}>Developer Dashboard</div>
      <ul style={listStyle}>
        {NAV_CATEGORIES.map(({ label, hash }) => {
          const isActive = activeHash === hash;
          return (
            <li key={hash} style={itemStyle}>
              <a
                href={hash}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(hash);
                }}
                style={{
                  ...linkStyle,
                  ...(isActive ? activeLinkStyle : {}),
                }}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  width: 220,
  minWidth: 220,
  backgroundColor: '#111122',
  borderRight: '1px solid #333',
  padding: '16px 0',
  height: '100vh',
  overflowY: 'auto',
  position: 'sticky',
  top: 0,
};

const logoStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#e0e0e0',
  padding: '0 16px 4px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  padding: '0 16px 16px',
  borderBottom: '1px solid #333',
  marginBottom: 8,
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const itemStyle: React.CSSProperties = {
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  display: 'block',
  padding: '8px 16px',
  color: '#aaa',
  textDecoration: 'none',
  fontSize: 13,
  borderLeft: '3px solid transparent',
  transition: 'background-color 0.15s, color 0.15s',
};

const activeLinkStyle: React.CSSProperties = {
  color: '#fff',
  backgroundColor: '#1a1a3e',
  borderLeftColor: '#4488ff',
};
