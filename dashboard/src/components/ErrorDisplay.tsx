/**
 * ErrorDisplay: renders an error with its class name and message.
 *
 * Accepts either an Error instance or a plain string.
 */

interface ErrorDisplayProps {
  /** The error to display. Can be an Error object or a string. */
  error: Error | string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const className =
    typeof error === 'string' ? 'Error' : error.constructor.name;
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div style={containerStyle}>
      <span style={classNameStyle}>{className}</span>
      <span style={messageStyle}>{message}</span>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  backgroundColor: '#2a0a0a',
  border: '1px solid #661111',
  borderRadius: 4,
  padding: 12,
  fontSize: 13,
};

const classNameStyle: React.CSSProperties = {
  color: '#ff6666',
  fontWeight: 700,
  marginRight: 8,
};

const messageStyle: React.CSSProperties = {
  color: '#cc8888',
};
