/**
 * EventsPanel: provides live event subscription (via polling) and manual event parsing.
 *
 * Two tabs:
 * - Live Subscription: polls queryEvents from the Sui RPC, parses via the SDK, displays event log
 * - Manual Parse: paste raw event JSON, parse via parseHashiEventStrict, display result
 *
 * The live event log is capped at 500 entries (oldest dropped first).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { base58 } from '@scure/base';
import { parseHashiEventStrict } from 'hashi-sdk/events';
import type { HashiEvent, ParseHashiEventResult } from 'hashi-sdk/events';
import { packageId, rpcUrl } from '../config';
import { OperationPanel } from '../components/OperationPanel';
import { JsonViewer } from '../components/JsonViewer';
import { ErrorDisplay } from '../components/ErrorDisplay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_EVENT_LOG = 500;
const POLL_INTERVAL_MS = 5000;

/** All 25 Hashi event type names for the filter dropdown. */
const EVENT_TYPES: HashiEvent['type'][] = [
  'DepositRequested',
  'DepositConfirmed',
  'ExpiredDepositDeleted',
  'WithdrawalRequested',
  'WithdrawalApproved',
  'WithdrawalPickedForProcessing',
  'WithdrawalSigned',
  'WithdrawalConfirmed',
  'WithdrawalCancelled',
  'ValidatorRegistered',
  'ValidatorUpdated',
  'StartReconfig',
  'EndReconfig',
  'AbortReconfig',
  'UtxoSpent',
  'SpentUtxoDeleted',
  'Mint',
  'Burn',
  'ProposalCreated',
  'VoteCast',
  'VoteRemoved',
  'ProposalDeleted',
  'ProposalExecuted',
  'QuorumReached',
  'PackageUpgraded',
];

/** Set of known package IDs for event parsing. */
const PACKAGE_ID_SET = new Set([packageId]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventLogEntry {
  id: number;
  timestamp: string;
  event: HashiEvent;
}

type SubscriptionStatus = 'stopped' | 'running' | 'disconnected';

// ---------------------------------------------------------------------------
// Shared styles (matching QueriesPanel conventions)
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

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#aa3333',
};

const warnButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#aa6622',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  marginBottom: 16,
  borderBottom: '1px solid #333',
};

const tabStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 14,
  color: '#888',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: '#fff',
  borderBottomColor: '#4488ff',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 200,
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: 'monospace',
  backgroundColor: '#111',
  color: '#e0e0e0',
  border: '1px solid #444',
  borderRadius: 4,
  resize: 'vertical',
  boxSizing: 'border-box',
};

// ---------------------------------------------------------------------------
// Event type badge colors
// ---------------------------------------------------------------------------

function getEventBadgeColor(eventType: string): string {
  if (eventType.startsWith('Deposit') || eventType === 'ExpiredDepositDeleted') return '#2277aa';
  if (eventType.startsWith('Withdrawal') || eventType === 'WithdrawalCancelled') return '#aa7722';
  if (eventType.startsWith('Validator')) return '#22aa44';
  if (eventType.includes('Reconfig')) return '#aa22aa';
  if (eventType.startsWith('Utxo') || eventType === 'SpentUtxoDeleted') return '#6666aa';
  if (eventType === 'Mint' || eventType === 'Burn') return '#aa4444';
  if (eventType.startsWith('Proposal') || eventType.startsWith('Vote') || eventType === 'QuorumReached') return '#4488aa';
  if (eventType === 'PackageUpgraded') return '#888';
  return '#666';
}

const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  backgroundColor: color,
  borderRadius: 3,
  marginRight: 8,
  whiteSpace: 'nowrap',
});

const statusDotStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: 6,
});

// ---------------------------------------------------------------------------
// Live Subscription Panel
// ---------------------------------------------------------------------------

function LiveSubscriptionPanel() {
  const [status, setStatus] = useState<SubscriptionStatus>('stopped');
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorRef = useRef<{ txDigest: string; eventSeq: string } | null>(null);
  const entryIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const pollEvents = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const rpcClient = new SuiJsonRpcClient({
        network: 'devnet',
        url: rpcUrl,
      });

      const result = await rpcClient.queryEvents({
        query: { MoveModule: { package: packageId, module: 'deposit' } },
        cursor: cursorRef.current ?? undefined,
        limit: 50,
        order: 'ascending',
        signal: controller.signal,
      });

      // Also query other modules
      const modules = [
        'withdrawal_queue',
        'validator',
        'reconfig',
        'utxo_pool',
        'treasury',
        'proposal_events',
      ];
      const otherResults = await Promise.all(
        modules.map((mod) =>
          rpcClient.queryEvents({
            query: { MoveModule: { package: packageId, module: mod } },
            cursor: cursorRef.current ?? undefined,
            limit: 50,
            order: 'ascending',
            signal: controller.signal,
          }),
        ),
      );

      // Merge all events and sort by sequence
      const allRpcEvents = [
        ...result.data,
        ...otherResults.flatMap((r) => r.data),
      ];

      // Sort by event ID (txDigest + eventSeq)
      allRpcEvents.sort((a, b) => {
        const aTx = a.id.txDigest;
        const bTx = b.id.txDigest;
        if (aTx !== bTx) return aTx < bTx ? -1 : 1;
        return Number(a.id.eventSeq) - Number(b.id.eventSeq);
      });

      // Deduplicate by event ID
      const seen = new Set<string>();
      const uniqueEvents = allRpcEvents.filter((evt) => {
        const key = `${evt.id.txDigest}:${evt.id.eventSeq}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueEvents.length > 0) {
        const newEntries: EventLogEntry[] = [];

        for (const rpcEvent of uniqueEvents) {
          // Convert JSON-RPC SuiEvent to SuiClientTypes.Event format
          // The parser expects bcs as Uint8Array and eventType field
          try {
            const bcsBytes = base58.decode(rpcEvent.bcs);
            const clientEvent = {
              packageId: rpcEvent.packageId,
              module: rpcEvent.transactionModule,
              sender: rpcEvent.sender,
              eventType: rpcEvent.type,
              bcs: bcsBytes,
              json: rpcEvent.parsedJson as Record<string, unknown> | null,
            };

            const parseResult = parseHashiEventStrict(
              clientEvent,
              PACKAGE_ID_SET,
            );

            if (parseResult.event) {
              entryIdRef.current += 1;
              newEntries.push({
                id: entryIdRef.current,
                timestamp: rpcEvent.timestampMs
                  ? new Date(Number(rpcEvent.timestampMs)).toISOString()
                  : new Date().toISOString(),
                event: parseResult.event,
              });
            }
          } catch {
            // Skip unparseable events
          }
        }

        if (newEntries.length > 0) {
          setEventLog((prev) => {
            const combined = [...prev, ...newEntries];
            // Cap at MAX_EVENT_LOG, drop oldest
            if (combined.length > MAX_EVENT_LOG) {
              return combined.slice(combined.length - MAX_EVENT_LOG);
            }
            return combined;
          });
        }

        // Update cursor to the last event
        const lastEvent = uniqueEvents[uniqueEvents.length - 1];
        if (lastEvent) {
          cursorRef.current = {
            txDigest: lastEvent.id.txDigest,
            eventSeq: lastEvent.id.eventSeq,
          };
        }
      }

      setPollCount((c) => c + 1);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('disconnected');
      stopPolling();
    }
  }, [stopPolling]);

  const handleStart = useCallback(() => {
    setStatus('running');
    setError(null);

    // Fire immediately, then set up interval
    void pollEvents();
    timerRef.current = setInterval(() => {
      void pollEvents();
    }, POLL_INTERVAL_MS);
  }, [pollEvents]);

  const handleStop = useCallback(() => {
    stopPolling();
    setStatus('stopped');
  }, [stopPolling]);

  const handleReconnect = useCallback(() => {
    setStatus('running');
    setError(null);

    void pollEvents();
    timerRef.current = setInterval(() => {
      void pollEvents();
    }, POLL_INTERVAL_MS);
  }, [pollEvents]);

  const handleClear = useCallback(() => {
    setEventLog([]);
    cursorRef.current = null;
    entryIdRef.current = 0;
    setPollCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Apply filter
  const filteredLog = filterType
    ? eventLog.filter((entry) => entry.event.type === filterType)
    : eventLog;

  const statusColor =
    status === 'running' ? '#44aa44' : status === 'disconnected' ? '#aa4444' : '#888';
  const statusLabel =
    status === 'running' ? 'Polling' : status === 'disconnected' ? 'Disconnected' : 'Stopped';

  return (
    <OperationPanel
      title="Live Event Subscription"
      description={
        <>
          Poll for Hashi bridge events from the Sui RPC. Events are parsed using the SDK event
          parser. The log is capped at {MAX_EVENT_LOG} entries.
        </>
      }
      result={
        <>
          {error && <ErrorDisplay error={error} />}
          <div style={{ marginTop: 8 }}>
            <div style={hintStyle}>
              {filteredLog.length} events shown
              {filterType ? ` (filtered: ${filterType})` : ''} | Polls: {pollCount}
            </div>
          </div>
          <div style={eventLogContainerStyle}>
            {filteredLog.length === 0 && (
              <div style={{ ...hintStyle, padding: 16, textAlign: 'center' }}>
                {status === 'stopped'
                  ? 'Click "Start" to begin polling for events.'
                  : 'No events received yet.'}
              </div>
            )}
            {filteredLog
              .slice()
              .reverse()
              .map((entry) => (
                <div key={entry.id} style={eventRowStyle}>
                  <span style={{ fontSize: 11, color: '#666', marginRight: 8, whiteSpace: 'nowrap' }}>
                    {entry.timestamp.slice(11, 19)}
                  </span>
                  <span style={badgeStyle(getEventBadgeColor(entry.event.type))}>
                    {entry.event.type}
                  </span>
                  <span style={{ fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {summarizeEvent(entry.event)}
                  </span>
                </div>
              ))}
          </div>
        </>
      }
    >
      <div style={rowStyle}>
        <span style={statusDotStyle(statusColor)} />
        <span style={{ fontSize: 13, color: statusColor, marginRight: 12 }}>{statusLabel}</span>

        {status === 'stopped' && (
          <button onClick={handleStart} style={buttonStyle}>
            Start
          </button>
        )}
        {status === 'running' && (
          <button onClick={handleStop} style={dangerButtonStyle}>
            Stop
          </button>
        )}
        {status === 'disconnected' && (
          <button onClick={handleReconnect} style={warnButtonStyle}>
            Reconnect
          </button>
        )}

        <button onClick={handleClear} style={{ ...buttonStyle, backgroundColor: '#555' }}>
          Clear Log
        </button>

        <select
          style={selectStyle}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </OperationPanel>
  );
}

/** Produce a short summary string for an event. */
function summarizeEvent(event: HashiEvent): string {
  switch (event.type) {
    case 'DepositRequested':
      return `requestId=${truncate(event.requestId)} amount=${event.amount}`;
    case 'DepositConfirmed':
      return `requestId=${truncate(event.requestId)} amount=${event.amount}`;
    case 'ExpiredDepositDeleted':
      return `requestId=${truncate(event.requestId)}`;
    case 'WithdrawalRequested':
      return `requestId=${truncate(event.requestId)} btcAmount=${event.btcAmount}`;
    case 'WithdrawalApproved':
      return `requestId=${truncate(event.requestId)}`;
    case 'WithdrawalPickedForProcessing':
      return `pendingId=${truncate(event.pendingId)} requests=${event.requestIds.length}`;
    case 'WithdrawalSigned':
      return `withdrawalId=${truncate(event.withdrawalId)}`;
    case 'WithdrawalConfirmed':
      return `pendingId=${truncate(event.pendingId)}`;
    case 'WithdrawalCancelled':
      return `requestId=${truncate(event.requestId)} btcAmount=${event.btcAmount}`;
    case 'ValidatorRegistered':
      return `validator=${truncate(event.validator)}`;
    case 'ValidatorUpdated':
      return `validator=${truncate(event.validator)}`;
    case 'StartReconfig':
      return `epoch=${event.epoch}`;
    case 'EndReconfig':
      return `epoch=${event.epoch}`;
    case 'AbortReconfig':
      return `epoch=${event.epoch}`;
    case 'UtxoSpent':
      return `txid=${truncate(event.utxoId.txid)}:${event.utxoId.vout}`;
    case 'SpentUtxoDeleted':
      return `txid=${truncate(event.utxoId.txid)}:${event.utxoId.vout}`;
    case 'Mint':
      return `amount=${event.amount}`;
    case 'Burn':
      return `amount=${event.amount}`;
    case 'ProposalCreated':
      return `proposalId=${truncate(event.proposalId)}`;
    case 'VoteCast':
      return `proposalId=${truncate(event.proposalId)} voter=${truncate(event.voter)}`;
    case 'VoteRemoved':
      return `proposalId=${truncate(event.proposalId)} voter=${truncate(event.voter)}`;
    case 'ProposalDeleted':
      return `proposalId=${truncate(event.proposalId)}`;
    case 'ProposalExecuted':
      return `proposalId=${truncate(event.proposalId)}`;
    case 'QuorumReached':
      return `proposalId=${truncate(event.proposalId)}`;
    case 'PackageUpgraded':
      return `package=${truncate(event.package)} v${event.version}`;
    default:
      return '';
  }
}

function truncate(s: string, len = 16): string {
  if (s.length <= len) return s;
  return s.slice(0, len) + '...';
}

const eventLogContainerStyle: React.CSSProperties = {
  maxHeight: 400,
  overflowY: 'auto',
  marginTop: 8,
  border: '1px solid #333',
  borderRadius: 4,
  backgroundColor: '#0d0d1a',
};

const eventRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
  borderBottom: '1px solid #1a1a2e',
  fontSize: 12,
};

// ---------------------------------------------------------------------------
// Manual Parse Panel
// ---------------------------------------------------------------------------

function ManualParsePanel() {
  const [rawJson, setRawJson] = useState('');
  const [result, setResult] = useState<ParseHashiEventResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    setResult(null);
    setParseError(null);

    if (!rawJson.trim()) {
      setParseError('Please paste raw event JSON.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson.trim());
    } catch {
      setParseError('Invalid JSON. Please paste a valid JSON object.');
      return;
    }

    // The user may paste either:
    // 1. A JSON-RPC SuiEvent (with bcs as base58 string and type field)
    // 2. A SuiClientTypes.Event (with eventType field and bcs as array)
    // We try to normalize to SuiClientTypes.Event format
    try {
      const obj = parsed as Record<string, unknown>;
      let eventType: string;
      let bcsBytes: Uint8Array;

      if (typeof obj['eventType'] === 'string') {
        // Already in SuiClientTypes.Event format
        eventType = obj['eventType'] as string;
        if (obj['bcs'] instanceof Uint8Array) {
          bcsBytes = obj['bcs'] as Uint8Array;
        } else if (Array.isArray(obj['bcs'])) {
          bcsBytes = new Uint8Array(obj['bcs'] as number[]);
        } else if (typeof obj['bcs'] === 'string') {
          bcsBytes = base58.decode(obj['bcs'] as string);
        } else {
          setParseError('Could not interpret "bcs" field. Expected Uint8Array, array, or base58 string.');
          return;
        }
      } else if (typeof obj['type'] === 'string' && typeof obj['bcs'] === 'string') {
        // JSON-RPC SuiEvent format
        eventType = obj['type'] as string;
        bcsBytes = base58.decode(obj['bcs'] as string);
      } else {
        setParseError(
          'Unrecognized event format. Expected a Sui event with "type"/"eventType" and "bcs" fields.',
        );
        return;
      }

      const clientEvent = {
        packageId: (obj['packageId'] as string) ?? '',
        module: (obj['transactionModule'] as string) ?? (obj['module'] as string) ?? '',
        sender: (obj['sender'] as string) ?? '',
        eventType,
        bcs: bcsBytes,
        json: (obj['parsedJson'] as Record<string, unknown>) ?? null,
      };

      const parseResult = parseHashiEventStrict(clientEvent, PACKAGE_ID_SET);
      setResult(parseResult);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, [rawJson]);

  return (
    <OperationPanel
      title="Manual Event Parse"
      description="Paste a raw Sui event JSON (from RPC or transaction effects) to parse it using parseHashiEventStrict."
      result={
        <>
          {parseError && <ErrorDisplay error={parseError} />}
          {result && result.event && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <span style={badgeStyle(getEventBadgeColor(result.event.type))}>
                  {result.event.type}
                </span>
                <span style={hintStyle}>Parsed successfully</span>
              </div>
              <JsonViewer data={result.event} label="Parsed HashiEvent" />
            </div>
          )}
          {result && result.error && (
            <ErrorDisplay error={result.error} />
          )}
        </>
      }
    >
      <div style={{ marginBottom: 8 }}>
        <textarea
          style={textareaStyle}
          placeholder={`Paste raw event JSON here, e.g.:\n{\n  "type": "0xPKG::deposit::DepositRequestedEvent",\n  "bcs": "...",\n  "packageId": "0x...",\n  ...\n}`}
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
        />
      </div>
      <div style={rowStyle}>
        <button
          onClick={handleParse}
          disabled={!rawJson.trim()}
          style={!rawJson.trim() ? disabledButtonStyle : buttonStyle}
        >
          Parse Event
        </button>
        <button
          onClick={() => {
            setRawJson('');
            setResult(null);
            setParseError(null);
          }}
          style={{ ...buttonStyle, backgroundColor: '#555' }}
        >
          Clear
        </button>
      </div>
    </OperationPanel>
  );
}

// ---------------------------------------------------------------------------
// Main EventsPanel
// ---------------------------------------------------------------------------

export function EventsPanel() {
  const [activeTab, setActiveTab] = useState<'live' | 'manual'>('live');

  return (
    <div>
      <h2 style={sectionTitleStyle}>Events</h2>
      <div style={tabBarStyle}>
        <button
          style={activeTab === 'live' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('live')}
        >
          Live Subscription
        </button>
        <button
          style={activeTab === 'manual' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('manual')}
        >
          Manual Parse
        </button>
      </div>
      {activeTab === 'live' && <LiveSubscriptionPanel />}
      {activeTab === 'manual' && <ManualParsePanel />}
    </div>
  );
}
