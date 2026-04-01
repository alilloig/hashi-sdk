/**
 * Totally Ordered Broadcast (TOB) domain types.
 */

import type { CommitteeSignature } from './committee.js';

/** Protocol type for TOB key-generation ceremonies. */
export type ProtocolType = 'Dkg' | 'KeyRotation' | 'NonceGeneration';

/** Key for looking up epoch certificates in the TOB bag. */
export interface TobKey {
	epoch: bigint;
	batchIndex: number | null;
}

/** A dealer's hashed messages with a committee signature. */
export interface DealerSubmission {
	dealerAddress: string;
	messagesHash: Uint8Array;
	signature: CommitteeSignature;
}

/** Certificates collected for a single epoch's ceremony. */
export interface EpochCerts {
	epoch: bigint;
	protocolType: ProtocolType;
	/** Dealer submissions keyed by dealer address. */
	certs: Map<string, DealerSubmission>;
}
