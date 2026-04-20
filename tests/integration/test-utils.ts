/**
 * Test utilities for e2e integration tests.
 *
 * Provides helpers for:
 * - Bitcoin regtest RPC calls
 * - Infrastructure availability detection
 * - Test configuration loading
 * - UTXO creation for deposit testing
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ---- Types ----

export interface LocalnetState {
	sui_rpc_url: string;
	btc_rpc_url: string;
	package_id: string;
	original_package_id: string;
	hashi_object_id: string;
}

export interface TestConfig {
	suiRpcUrl: string;
	btcRpcUrl: string;
	btcRpcUser: string;
	btcRpcPassword: string;
	packageId: string;
	originalPackageId: string;
	hashiObjectId: string;
}

export interface UtxoDetails {
	txid: string;
	vout: number;
	amount: bigint;
	address: string;
}

// ---- Bitcoin RPC ----

const DEFAULT_BTC_RPC_URL = 'http://127.0.0.1:18443';
const DEFAULT_BTC_RPC_USER = 'test';
const DEFAULT_BTC_RPC_PASSWORD = 'test';

/**
 * Make a JSON-RPC call to Bitcoin regtest.
 *
 * @param method - The RPC method name
 * @param params - Method parameters
 * @param options - Optional RPC configuration
 * @returns The result field from the RPC response
 * @throws Error if RPC call fails
 */
export async function bitcoinRpc(
	method: string,
	params: unknown[] = [],
	options: {
		url?: string;
		user?: string;
		password?: string;
	} = {},
): Promise<unknown> {
	const url = options.url ?? DEFAULT_BTC_RPC_URL;
	const user = options.user ?? DEFAULT_BTC_RPC_USER;
	const password = options.password ?? DEFAULT_BTC_RPC_PASSWORD;

	const auth = Buffer.from(`${user}:${password}`).toString('base64');

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${auth}`,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: Date.now(),
			method,
			params,
		}),
	});

	if (!response.ok) {
		throw new Error(`Bitcoin RPC HTTP error: ${response.status} ${response.statusText}`);
	}

	const json = (await response.json()) as { result?: unknown; error?: { message: string } };

	if (json.error) {
		throw new Error(`Bitcoin RPC error: ${json.error.message}`);
	}

	return json.result;
}

/**
 * Get current block count from regtest.
 */
export async function getBlockCount(): Promise<number> {
	return (await bitcoinRpc('getblockcount')) as number;
}

/**
 * Mine blocks to an address.
 */
export async function mineBlocks(count: number, address?: string): Promise<string[]> {
	const minerAddress = address ?? ((await bitcoinRpc('getnewaddress', ['', 'bech32m'])) as string);
	return (await bitcoinRpc('generatetoaddress', [count, minerAddress])) as string[];
}

/**
 * Get a new wallet address.
 */
export async function getNewAddress(label = '', type: 'bech32' | 'bech32m' = 'bech32m'): Promise<string> {
	return (await bitcoinRpc('getnewaddress', [label, type])) as string;
}

// ---- UTXO Creation ----

/**
 * Create a funded UTXO at the specified address.
 *
 * This is the core utility for deposit testing:
 * 1. Sends BTC from the regtest wallet to the target address
 * 2. Mines blocks to confirm the transaction
 * 3. Returns the UTXO details needed for createDepositRequest
 *
 * @param depositAddress - The derived deposit address (bcrt1p...)
 * @param amountSats - Amount in satoshis to send
 * @param confirmations - Number of blocks to mine for confirmation (default: 2)
 * @returns UTXO details: txid, vout, amount, address
 */
export async function createTestUtxo(
	depositAddress: string,
	amountSats: bigint,
	confirmations = 2,
): Promise<UtxoDetails> {
	// Import the deposit address so the wallet can track it
	await bitcoinRpc('importaddress', [depositAddress, '', false]);

	// Send BTC to the deposit address
	const btcAmount = Number(amountSats) / 1e8;
	const txid = (await bitcoinRpc('sendtoaddress', [depositAddress, btcAmount])) as string;

	// Mine blocks to confirm
	await mineBlocks(confirmations);

	// Get the transaction details to find the vout
	const rawTx = (await bitcoinRpc('getrawtransaction', [txid, true])) as {
		vout: Array<{
			n: number;
			value: number;
			scriptPubKey: { address?: string };
		}>;
	};

	const output = rawTx.vout.find((v) => v.scriptPubKey.address === depositAddress);
	if (!output) {
		throw new Error(`Could not find output for address ${depositAddress} in tx ${txid}`);
	}

	return {
		txid,
		vout: output.n,
		amount: BigInt(Math.round(output.value * 1e8)),
		address: depositAddress,
	};
}

// ---- Infrastructure Detection ----

/**
 * Check if Bitcoin RPC is reachable.
 */
export async function isBitcoinRpcAvailable(url = DEFAULT_BTC_RPC_URL): Promise<boolean> {
	try {
		await bitcoinRpc('getblockchaininfo', [], { url });
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if Sui RPC is reachable.
 */
export async function isSuiRpcAvailable(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'sui_getLatestCheckpointSequenceNumber',
				params: [],
			}),
		});
		return response.ok;
	} catch {
		return false;
	}
}

// ---- Configuration Loading ----

const LOCALNET_STATE_PATH = join(homedir(), '.hashi', 'localnet', 'state.json');

/**
 * Load localnet state from ~/.hashi/localnet/state.json if it exists.
 * This file is created by hashi-localnet from the sibling hashi repo.
 */
export function getLocalnetState(): LocalnetState | null {
	try {
		if (!existsSync(LOCALNET_STATE_PATH)) {
			return null;
		}
		const content = readFileSync(LOCALNET_STATE_PATH, 'utf-8');
		return JSON.parse(content) as LocalnetState;
	} catch {
		return null;
	}
}

/**
 * Get test configuration from environment variables or localnet state.
 *
 * Priority:
 * 1. Environment variables (explicit override)
 * 2. Localnet state file (~/.hashi/localnet/state.json)
 * 3. Null if neither available
 */
export function getTestConfig(): TestConfig | null {
	// Check environment variables first
	const fromEnv = {
		suiRpcUrl: process.env.SUI_RPC_URL,
		btcRpcUrl: process.env.BTC_RPC_URL ?? DEFAULT_BTC_RPC_URL,
		btcRpcUser: process.env.BTC_RPC_USER ?? DEFAULT_BTC_RPC_USER,
		btcRpcPassword: process.env.BTC_RPC_PASSWORD ?? DEFAULT_BTC_RPC_PASSWORD,
		packageId: process.env.HASHI_PACKAGE_ID,
		originalPackageId: process.env.HASHI_ORIGINAL_PACKAGE_ID,
		hashiObjectId: process.env.HASHI_OBJECT_ID,
	};

	// If all Sui-related env vars are set, use them
	if (fromEnv.suiRpcUrl && fromEnv.packageId && fromEnv.hashiObjectId) {
		return {
			suiRpcUrl: fromEnv.suiRpcUrl,
			btcRpcUrl: fromEnv.btcRpcUrl,
			btcRpcUser: fromEnv.btcRpcUser,
			btcRpcPassword: fromEnv.btcRpcPassword,
			packageId: fromEnv.packageId,
			originalPackageId: fromEnv.originalPackageId ?? fromEnv.packageId,
			hashiObjectId: fromEnv.hashiObjectId,
		};
	}

	// Try localnet state
	const state = getLocalnetState();
	if (state) {
		return {
			suiRpcUrl: state.sui_rpc_url,
			btcRpcUrl: state.btc_rpc_url ?? DEFAULT_BTC_RPC_URL,
			btcRpcUser: DEFAULT_BTC_RPC_USER,
			btcRpcPassword: DEFAULT_BTC_RPC_PASSWORD,
			packageId: state.package_id,
			originalPackageId: state.original_package_id ?? state.package_id,
			hashiObjectId: state.hashi_object_id,
		};
	}

	return null;
}

/**
 * Check if integration tests can run.
 * Returns a tuple: [canRun, reason].
 */
export async function canRunIntegrationTests(): Promise<[boolean, string]> {
	// Check if explicitly enabled
	if (!process.env.HASHI_INTEGRATION) {
		return [false, 'HASHI_INTEGRATION environment variable not set'];
	}

	// Check Bitcoin RPC
	const btcAvailable = await isBitcoinRpcAvailable();
	if (!btcAvailable) {
		return [false, 'Bitcoin regtest RPC not available at http://127.0.0.1:18443'];
	}

	// Check configuration
	const config = getTestConfig();
	if (!config) {
		return [false, 'No Sui configuration found (set env vars or run hashi-localnet)'];
	}

	// Check Sui RPC
	const suiAvailable = await isSuiRpcAvailable(config.suiRpcUrl);
	if (!suiAvailable) {
		return [false, `Sui RPC not available at ${config.suiRpcUrl}`];
	}

	return [true, 'All prerequisites met'];
}
