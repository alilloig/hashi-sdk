/**
 * QueriesPanel: provides sub-panels for all 9 Hashi SDK query operations.
 *
 * Each sub-panel uses the HashiClient facade (via useHashiClient()) to call
 * the appropriate query method and displays the result as JSON.
 */

import { useState, useCallback } from 'react';
import { useHashiClient } from '../context/HashiClientContext';
import { OperationPanel } from '../components/OperationPanel';
import { JsonViewer } from '../components/JsonViewer';
import { ErrorDisplay } from '../components/ErrorDisplay';

// ---------------------------------------------------------------------------
// Shared types and helpers
// ---------------------------------------------------------------------------

/** Discriminated union for async operation state. */
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

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

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  marginRight: 8,
  minWidth: 300,
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: 100,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const paginationRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

const loadingStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#aaa',
  fontStyle: 'italic',
};

// ---------------------------------------------------------------------------
// Render helpers for result slot
// ---------------------------------------------------------------------------

function renderResult<T>(state: AsyncState<T>, label: string): React.ReactNode {
  switch (state.status) {
    case 'loading':
      return <div style={loadingStyle}>Loading...</div>;
    case 'success':
      return <JsonViewer data={state.data} label={label} />;
    case 'error':
      return <ErrorDisplay error={state.error} />;
    default:
      return null;
  }
}

function renderNullableResult<T>(
  state: AsyncState<T | null>,
  label: string,
): React.ReactNode {
  switch (state.status) {
    case 'loading':
      return <div style={loadingStyle}>Loading...</div>;
    case 'success':
      if (state.data === null) {
        return <div style={hintStyle}>Not found</div>;
      }
      return <JsonViewer data={state.data} label={label} />;
    case 'error':
      return <ErrorDisplay error={state.error} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 1. getHashiState
// ---------------------------------------------------------------------------

function GetHashiStatePanel() {
  const client = useHashiClient();
  const [state, setState] = useState<AsyncState<unknown>>({ status: 'idle' });

  const handleFetch = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await client.getHashiState();
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client]);

  return (
    <OperationPanel
      title="getHashiState"
      description="Fetch the full Hashi bridge state object."
      result={renderResult(state, 'HashiState')}
    >
      <button
        onClick={handleFetch}
        disabled={state.status === 'loading'}
        style={state.status === 'loading' ? disabledButtonStyle : buttonStyle}
      >
        {state.status === 'loading' ? 'Fetching...' : 'Fetch Hashi State'}
      </button>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 2. getConfig
// ---------------------------------------------------------------------------

function GetConfigPanel() {
  const client = useHashiClient();
  const [state, setState] = useState<AsyncState<unknown>>({ status: 'idle' });

  const handleFetch = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await client.getConfig();
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client]);

  return (
    <OperationPanel
      title="getConfig"
      description="Fetch the bridge configuration from the Hashi state."
      result={renderResult(state, 'Config')}
    >
      <button
        onClick={handleFetch}
        disabled={state.status === 'loading'}
        style={state.status === 'loading' ? disabledButtonStyle : buttonStyle}
      >
        {state.status === 'loading' ? 'Fetching...' : 'Fetch Config'}
      </button>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 3. getDepositRequest
// ---------------------------------------------------------------------------

function GetDepositRequestPanel() {
  const client = useHashiClient();
  const [requestId, setRequestId] = useState('');
  const [state, setState] = useState<AsyncState<unknown | null>>({
    status: 'idle',
  });

  const handleFetch = useCallback(async () => {
    if (!requestId.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await client.getDepositRequest(requestId.trim());
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client, requestId]);

  return (
    <OperationPanel
      title="getDepositRequest"
      description="Fetch a single deposit request by its object ID."
      result={renderNullableResult(state, 'DepositRequest')}
    >
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Request ID (0x...)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <button
          onClick={handleFetch}
          disabled={state.status === 'loading' || !requestId.trim()}
          style={
            state.status === 'loading' || !requestId.trim()
              ? disabledButtonStyle
              : buttonStyle
          }
        >
          {state.status === 'loading' ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 4. listDepositRequests (paginated)
// ---------------------------------------------------------------------------

interface PaginatedData<T> {
  items: T[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

function ListDepositRequestsPanel() {
  const client = useHashiClient();
  const [state, setState] = useState<AsyncState<PaginatedData<unknown>>>({
    status: 'idle',
  });
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    undefined,
  );

  const handleFetch = useCallback(
    async (cursor?: string) => {
      setState({ status: 'loading' });
      try {
        const data = await client.listDepositRequests({
          cursor,
          limit: 10,
        });
        setState({ status: 'success', data });
      } catch (err) {
        setState({ status: 'error', error: toError(err) });
      }
    },
    [client],
  );

  const handleFirstPage = useCallback(() => {
    setCursorStack([]);
    setCurrentCursor(undefined);
    handleFetch(undefined);
  }, [handleFetch]);

  const handleNextPage = useCallback(() => {
    if (state.status === 'success' && state.data.nextCursor) {
      const nextCursor = state.data.nextCursor;
      setCursorStack((prev) => [
        ...prev,
        currentCursor ?? '',
      ]);
      setCurrentCursor(nextCursor);
      handleFetch(nextCursor);
    }
  }, [state, currentCursor, handleFetch]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const prevCursor = cursorStack[cursorStack.length - 1];
      setCursorStack((prev) => prev.slice(0, -1));
      const cursor = prevCursor || undefined;
      setCurrentCursor(cursor);
      handleFetch(cursor);
    }
  }, [cursorStack, handleFetch]);

  const canPrev = cursorStack.length > 0;
  const canNext =
    state.status === 'success' && state.data.hasNextPage;

  return (
    <OperationPanel
      title="listDepositRequests"
      description="List deposit requests with pagination (10 per page)."
      result={renderResult(state, 'DepositRequests')}
    >
      <button
        onClick={handleFirstPage}
        disabled={state.status === 'loading'}
        style={state.status === 'loading' ? disabledButtonStyle : buttonStyle}
      >
        {state.status === 'loading' ? 'Fetching...' : 'Fetch First Page'}
      </button>
      {state.status === 'success' && (
        <div style={paginationRowStyle}>
          <button
            onClick={handlePrevPage}
            disabled={!canPrev}
            style={!canPrev ? disabledButtonStyle : buttonStyle}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={!canNext}
            style={!canNext ? disabledButtonStyle : buttonStyle}
          >
            Next
          </button>
          <span style={hintStyle}>
            {state.data.items.length} items
            {state.data.hasNextPage ? ' (more available)' : ' (last page)'}
          </span>
        </div>
      )}
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 5. getWithdrawalRequest
// ---------------------------------------------------------------------------

function GetWithdrawalRequestPanel() {
  const client = useHashiClient();
  const [requestId, setRequestId] = useState('');
  const [state, setState] = useState<AsyncState<unknown | null>>({
    status: 'idle',
  });

  const handleFetch = useCallback(async () => {
    if (!requestId.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await client.getWithdrawalRequest(requestId.trim());
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client, requestId]);

  return (
    <OperationPanel
      title="getWithdrawalRequest"
      description="Fetch a single withdrawal request by its object ID."
      result={renderNullableResult(state, 'WithdrawalRequest')}
    >
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Request ID (0x...)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <button
          onClick={handleFetch}
          disabled={state.status === 'loading' || !requestId.trim()}
          style={
            state.status === 'loading' || !requestId.trim()
              ? disabledButtonStyle
              : buttonStyle
          }
        >
          {state.status === 'loading' ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 6. listPendingWithdrawals (paginated)
// ---------------------------------------------------------------------------

function ListPendingWithdrawalsPanel() {
  const client = useHashiClient();
  const [state, setState] = useState<AsyncState<PaginatedData<unknown>>>({
    status: 'idle',
  });
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    undefined,
  );

  const handleFetch = useCallback(
    async (cursor?: string) => {
      setState({ status: 'loading' });
      try {
        const data = await client.listPendingWithdrawals({
          cursor,
          limit: 10,
        });
        setState({ status: 'success', data });
      } catch (err) {
        setState({ status: 'error', error: toError(err) });
      }
    },
    [client],
  );

  const handleFirstPage = useCallback(() => {
    setCursorStack([]);
    setCurrentCursor(undefined);
    handleFetch(undefined);
  }, [handleFetch]);

  const handleNextPage = useCallback(() => {
    if (state.status === 'success' && state.data.nextCursor) {
      const nextCursor = state.data.nextCursor;
      setCursorStack((prev) => [
        ...prev,
        currentCursor ?? '',
      ]);
      setCurrentCursor(nextCursor);
      handleFetch(nextCursor);
    }
  }, [state, currentCursor, handleFetch]);

  const handlePrevPage = useCallback(() => {
    if (cursorStack.length > 0) {
      const prevCursor = cursorStack[cursorStack.length - 1];
      setCursorStack((prev) => prev.slice(0, -1));
      const cursor = prevCursor || undefined;
      setCurrentCursor(cursor);
      handleFetch(cursor);
    }
  }, [cursorStack, handleFetch]);

  const canPrev = cursorStack.length > 0;
  const canNext =
    state.status === 'success' && state.data.hasNextPage;

  return (
    <OperationPanel
      title="listPendingWithdrawals"
      description="List pending withdrawals with pagination (10 per page)."
      result={renderResult(state, 'PendingWithdrawals')}
    >
      <button
        onClick={handleFirstPage}
        disabled={state.status === 'loading'}
        style={state.status === 'loading' ? disabledButtonStyle : buttonStyle}
      >
        {state.status === 'loading' ? 'Fetching...' : 'Fetch First Page'}
      </button>
      {state.status === 'success' && (
        <div style={paginationRowStyle}>
          <button
            onClick={handlePrevPage}
            disabled={!canPrev}
            style={!canPrev ? disabledButtonStyle : buttonStyle}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={!canNext}
            style={!canNext ? disabledButtonStyle : buttonStyle}
          >
            Next
          </button>
          <span style={hintStyle}>
            {state.data.items.length} items
            {state.data.hasNextPage ? ' (more available)' : ' (last page)'}
          </span>
        </div>
      )}
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 7. getCommittee
// ---------------------------------------------------------------------------

function GetCommitteePanel() {
  const client = useHashiClient();
  const [epochInput, setEpochInput] = useState('');
  const [state, setState] = useState<AsyncState<unknown | null>>({
    status: 'idle',
  });

  const handleFetch = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const epoch = epochInput.trim()
        ? Number(epochInput.trim())
        : undefined;
      const data = await client.getCommittee(epoch);
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client, epochInput]);

  return (
    <OperationPanel
      title="getCommittee"
      description="Fetch committee info for a given epoch (leave empty for current epoch)."
      result={renderNullableResult(state, 'Committee')}
    >
      <div style={rowStyle}>
        <input
          style={smallInputStyle}
          type="text"
          placeholder="Epoch (optional)"
          value={epochInput}
          onChange={(e) => setEpochInput(e.target.value)}
        />
        <button
          onClick={handleFetch}
          disabled={state.status === 'loading'}
          style={state.status === 'loading' ? disabledButtonStyle : buttonStyle}
        >
          {state.status === 'loading' ? 'Fetching...' : 'Fetch Committee'}
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 8. getMemberInfo
// ---------------------------------------------------------------------------

function GetMemberInfoPanel() {
  const client = useHashiClient();
  const [address, setAddress] = useState('');
  const [state, setState] = useState<AsyncState<unknown | null>>({
    status: 'idle',
  });

  const handleFetch = useCallback(async () => {
    if (!address.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await client.getMemberInfo(address.trim());
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client, address]);

  return (
    <OperationPanel
      title="getMemberInfo"
      description="Fetch member info for a validator by their Sui address."
      result={renderNullableResult(state, 'MemberInfo')}
    >
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Validator address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button
          onClick={handleFetch}
          disabled={state.status === 'loading' || !address.trim()}
          style={
            state.status === 'loading' || !address.trim()
              ? disabledButtonStyle
              : buttonStyle
          }
        >
          {state.status === 'loading' ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// 9. getUtxo
// ---------------------------------------------------------------------------

function GetUtxoPanel() {
  const client = useHashiClient();
  const [txid, setTxid] = useState('');
  const [vout, setVout] = useState('');
  const [state, setState] = useState<AsyncState<unknown | null>>({
    status: 'idle',
  });

  const handleFetch = useCallback(async () => {
    if (!txid.trim() || !vout.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await client.getUtxo(txid.trim(), Number(vout.trim()));
      setState({ status: 'success', data });
    } catch (err) {
      setState({ status: 'error', error: toError(err) });
    }
  }, [client, txid, vout]);

  const canFetch = txid.trim() && vout.trim();

  return (
    <OperationPanel
      title="getUtxo"
      description="Fetch a UTXO from the active pool by transaction ID and output index."
      result={renderNullableResult(state, 'Utxo')}
    >
      <div style={rowStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Bitcoin txid (hex)"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
        />
        <input
          style={smallInputStyle}
          type="text"
          placeholder="vout"
          value={vout}
          onChange={(e) => setVout(e.target.value)}
        />
        <button
          onClick={handleFetch}
          disabled={state.status === 'loading' || !canFetch}
          style={
            state.status === 'loading' || !canFetch
              ? disabledButtonStyle
              : buttonStyle
          }
        >
          {state.status === 'loading' ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// Main QueriesPanel
// ---------------------------------------------------------------------------

export function QueriesPanel() {
  return (
    <div>
      <h2 style={sectionTitleStyle}>Queries</h2>
      <GetHashiStatePanel />
      <GetConfigPanel />
      <GetDepositRequestPanel />
      <ListDepositRequestsPanel />
      <GetWithdrawalRequestPanel />
      <ListPendingWithdrawalsPanel />
      <GetCommitteePanel />
      <GetMemberInfoPanel />
      <GetUtxoPanel />
    </div>
  );
}
