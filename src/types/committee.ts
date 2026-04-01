/**
 * Committee domain types.
 */

/** A single member of the Hashi bridge committee. */
export interface CommitteeMember {
	validatorAddress: string;
	publicKey: Uint8Array;
	encryptionPublicKey: Uint8Array;
	weight: bigint;
}

/**
 * A BLS signing committee for a given epoch.
 */
export interface Committee {
	/** The epoch in which the committee is active. */
	epoch: bigint;
	/** The committee members. */
	members: CommitteeMember[];
	/** Total voting weight of the committee. */
	totalWeight: bigint;
}

/** Aggregate BLS committee signature over a message. */
export interface CommitteeSignature {
	epoch: bigint;
	signature: Uint8Array;
	signersBitmap: Uint8Array;
}

/** Full validator member info from the committee set. */
export interface MemberInfo {
	validatorAddress: string;
	operatorAddress: string;
	nextEpochPublicKey: Uint8Array;
	endpointUrl: string;
	tlsPublicKey: Uint8Array;
	nextEpochEncryptionPublicKey: Uint8Array;
}
