/**
 * JsonViewer: renders a JSON-serializable value as formatted text.
 *
 * Uses a <pre> tag with basic styling. Handles BigInt values by
 * converting them to strings during serialization.
 */

interface JsonViewerProps {
  /** The data to display. Must be JSON-serializable (BigInts are converted to strings). */
  data: unknown;
  /** Optional label shown above the JSON output. */
  label?: string;
}

/**
 * Custom replacer that converts BigInt values to strings so JSON.stringify
 * does not throw.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function JsonViewer({ data, label }: JsonViewerProps) {
  let text: string;
  try {
    text = JSON.stringify(data, jsonReplacer, 2);
  } catch {
    text = String(data);
  }

  return (
    <div>
      {label && <div style={labelStyle}>{label}</div>}
      <pre style={preStyle}>{text}</pre>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginBottom: 4,
  fontWeight: 600,
};

const preStyle: React.CSSProperties = {
  backgroundColor: '#0d0d1a',
  color: '#a0d0a0',
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  lineHeight: 1.4,
  overflow: 'auto',
  maxHeight: 400,
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};
