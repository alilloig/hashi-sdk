/**
 * PlaceholderPanel: shown for navigation categories not yet implemented.
 */

interface PlaceholderPanelProps {
  title: string;
}

export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <div>
      <h2 style={titleStyle}>{title}</h2>
      <p style={textStyle}>
        This section will be implemented in a future cycle.
      </p>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: 16,
};

const textStyle: React.CSSProperties = {
  color: '#888',
  fontSize: 14,
};
