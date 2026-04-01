/**
 * OperationPanel: reusable shell for every SDK operation in the dashboard.
 *
 * Renders a titled card with slots for:
 *  - description (optional explanatory text)
 *  - form (inputs and action buttons)
 *  - result area (output from the operation)
 */

import type { ReactNode } from 'react';

interface OperationPanelProps {
  /** The operation title displayed as a heading. */
  title: string;
  /** Optional description text or node shown below the title. */
  description?: ReactNode;
  /** Form inputs and action buttons for the operation. */
  children: ReactNode;
  /** Result area rendered below the form, typically JsonViewer or ErrorDisplay. */
  result?: ReactNode;
}

export function OperationPanel({
  title,
  description,
  children,
  result,
}: OperationPanelProps) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descriptionStyle}>{description}</p>}
      <div style={formStyle}>{children}</div>
      {result && <div style={resultStyle}>{result}</div>}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 6,
  padding: 16,
  marginBottom: 16,
  backgroundColor: '#1a1a2e',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: 16,
  color: '#e0e0e0',
};

const descriptionStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 13,
  color: '#888',
};

const formStyle: React.CSSProperties = {
  marginBottom: 8,
};

const resultStyle: React.CSSProperties = {
  marginTop: 12,
  borderTop: '1px solid #333',
  paddingTop: 12,
};
