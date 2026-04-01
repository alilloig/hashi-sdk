/**
 * useTransactionExecution: shared hook for the build -> preview -> execute flow.
 *
 * Manages the lifecycle of a transaction:
 *   1. Build: creates a Transaction and applies the SDK builder closure
 *   2. Preview: exposes the built Transaction for display
 *   3. Execute: signs and executes via dapp-kit
 *   4. Result: returns the digest on success or full error details on failure
 */

import { useState, useCallback } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { lookupAbortCode } from 'hashi-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The possible states of a transaction execution flow. */
export type TransactionExecutionState =
  | { phase: 'idle' }
  | { phase: 'built'; transaction: Transaction }
  | { phase: 'executing'; transaction: Transaction }
  | { phase: 'success'; digest: string; effects: unknown }
  | { phase: 'error'; error: TransactionExecutionError };

/** Error type that includes optional abort code details. */
export interface TransactionExecutionError {
  message: string;
  /** The Move module that aborted, if parseable. */
  module?: string;
  /** The numeric abort code, if parseable. */
  abortCode?: number;
  /** Human-readable abort code description, if found in the table. */
  abortDescription?: string;
  /** The raw error for inspection. */
  raw: unknown;
}

/** A builder closure as returned by the SDK transaction builder functions. */
type TransactionBuilder = (tx: Transaction) => void;

// ---------------------------------------------------------------------------
// Abort code extraction
// ---------------------------------------------------------------------------

/**
 * Try to parse abort code details from an error.
 *
 * Sui execution errors often contain patterns like:
 *   "MoveAbort(MoveLocation { module: ... }, 1)"
 *   or JSON with status.error fields
 */
function extractAbortInfo(err: unknown): { module?: string; abortCode?: number } {
  const message = err instanceof Error ? err.message : String(err);

  // Pattern: MoveAbort(...module_id: ...::module_name..., code)
  const moveAbortMatch = message.match(
    /MoveAbort\b.*?::(\w+).*?,\s*(\d+)/,
  );
  if (moveAbortMatch) {
    const module = moveAbortMatch[1];
    const abortCode = parseInt(moveAbortMatch[2] ?? '', 10);
    if (module && !isNaN(abortCode)) {
      return { module, abortCode };
    }
  }

  // Pattern: abort_code or abortCode in JSON
  const codeMatch = message.match(/abort[_c]ode["\s:]*(\d+)/i);
  const moduleMatch = message.match(/module["\s:]*["']?(\w+)["']?/i);
  if (codeMatch) {
    const abortCode = parseInt(codeMatch[1] ?? '', 10);
    return {
      module: moduleMatch?.[1],
      abortCode: isNaN(abortCode) ? undefined : abortCode,
    };
  }

  return {};
}

/**
 * Build a structured error from an execution failure.
 */
function buildExecutionError(err: unknown): TransactionExecutionError {
  const message = err instanceof Error ? err.message : String(err);
  const { module, abortCode } = extractAbortInfo(err);

  let abortDescription: string | undefined;
  if (module !== undefined && abortCode !== undefined) {
    const entry = lookupAbortCode(module, abortCode);
    if (entry) {
      abortDescription = `${entry.constant}: ${entry.message}`;
    }
  }

  return {
    message,
    module,
    abortCode,
    abortDescription,
    raw: err,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTransactionExecutionReturn {
  /** Current state of the execution flow. */
  state: TransactionExecutionState;
  /** Build a transaction from a builder closure. Transitions to 'built' phase. */
  build: (builder: TransactionBuilder) => void;
  /** Execute the built transaction. Transitions to 'executing' then 'success'/'error'. */
  execute: () => Promise<void>;
  /** Reset the state back to idle. */
  reset: () => void;
}

export function useTransactionExecution(): UseTransactionExecutionReturn {
  const dAppKit = useDAppKit();
  const [state, setState] = useState<TransactionExecutionState>({ phase: 'idle' });

  const build = useCallback((builder: TransactionBuilder) => {
    try {
      const tx = new Transaction();
      builder(tx);
      setState({ phase: 'built', transaction: tx });
    } catch (err) {
      setState({ phase: 'error', error: buildExecutionError(err) });
    }
  }, []);

  const execute = useCallback(async () => {
    if (state.phase !== 'built') return;

    const { transaction } = state;
    setState({ phase: 'executing', transaction });

    try {
      const result = await dAppKit.signAndExecuteTransaction({ transaction });

      if (result.$kind === 'FailedTransaction' && result.FailedTransaction) {
        const failed = result.FailedTransaction;
        const errorMsg = failed.status.success === false
          ? String(failed.status.error)
          : 'Unknown failure';
        setState({
          phase: 'error',
          error: buildExecutionError(new Error(`Transaction failed: ${errorMsg}`)),
        });
        return;
      }

      if (result.$kind === 'Transaction' && result.Transaction) {
        const tx = result.Transaction;
        setState({
          phase: 'success',
          digest: tx.digest,
          effects: tx.effects,
        });
        return;
      }

      // Fallback: shouldn't reach here but handle gracefully
      setState({
        phase: 'error',
        error: {
          message: 'Unexpected transaction result format',
          raw: result,
        },
      });
    } catch (err) {
      setState({ phase: 'error', error: buildExecutionError(err) });
    }
  }, [state, dAppKit]);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  return { state, build, execute, reset };
}
