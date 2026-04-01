/**
 * TransactionPreview: displays the built transaction details.
 *
 * Shows Move call targets and arguments from the transaction's command list.
 * Uses the Transaction's toJSON() serialization for a readable preview.
 */

import { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { JsonViewer } from './JsonViewer';

interface TransactionPreviewProps {
  /** The built transaction to preview. */
  transaction: Transaction;
}

export function TransactionPreview({ transaction }: TransactionPreviewProps) {
  const [preview, setPreview] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      try {
        // toJSON() returns a Promise<string> with the JSON representation
        const json = await transaction.toJSON();
        if (!cancelled) {
          try {
            setPreview(JSON.parse(json));
          } catch {
            setPreview(json);
          }
        }
      } catch {
        if (!cancelled) {
          setPreview({ description: 'Transaction built (preview unavailable)' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreview();
    return () => { cancelled = true; };
  }, [transaction]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Transaction Preview</div>
      {loading ? (
        <div style={loadingStyle}>Loading preview...</div>
      ) : (
        <JsonViewer data={preview} label="Built Transaction" />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  border: '1px solid #335',
  borderRadius: 4,
  padding: 12,
  backgroundColor: '#12122a',
  marginTop: 8,
};

const headerStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#88aaff',
  marginBottom: 8,
};

const loadingStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  fontStyle: 'italic',
};
