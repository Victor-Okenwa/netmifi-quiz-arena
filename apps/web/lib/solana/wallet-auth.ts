/**
 * Cryptographic Solana Wallet Challenge & Ed25519 Signature Verification.
 *
 * Uses Node's native `node:crypto` Ed25519 verification against raw 32-byte Solana
 * public keys wrapped in ASN.1 DER SPKI headers.
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import {
  encodeBytesToBase58,
  isValidSolanaAddress,
  solanaAddressToBytes,
} from "@repo/solana";

/**
 * Fixed 12-byte ASN.1 DER SPKI prefix for a raw 32-byte Ed25519 public key (RFC 8410).
 */
const ED25519_SPKI_DER_PREFIX = Buffer.from(
  "302a300506032b6570032100",
  "hex"
);

/**
 * Fixed 16-byte ASN.1 DER PKCS#8 prefix for a raw 32-byte Ed25519 private seed (RFC 8410).
 */
const ED25519_PKCS8_DER_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex"
);

export interface WalletChallengePayload {
  walletAddress: string;
  userId: string;
  nonce: string;
}

/**
 * Generates a cryptographically random 32-byte hex challenge nonce.
 */
export function generateWalletNonce(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Builds the canonical human-readable message that the student's Solana wallet signs
 * to prove cryptographic ownership of `walletAddress`.
 */
export function buildWalletChallengeMessage(
  params: WalletChallengePayload
): string {
  return [
    "Netmifi Quiz Arena — Solana Wallet Ownership Verification",
    `Student ID: ${params.userId}`,
    `Wallet Address: ${params.walletAddress.trim()}`,
    `Challenge Nonce: ${params.nonce.trim()}`,
    "Network: Solana Devnet",
  ].join("\n");
}

/**
 * Verifies a 64-byte Ed25519 signature (encoded as Base64) over `message`
 * against the 32-byte Base58 Solana `walletAddress`.
 */
export function verifyEd25519WalletSignature(params: {
  walletAddress: string;
  message: string;
  signatureBase64: string;
}): boolean {
  try {
    if (!isValidSolanaAddress(params.walletAddress)) {
      return false;
    }

    const rawPubkeyBytes = solanaAddressToBytes(params.walletAddress);
    if (rawPubkeyBytes.length !== 32) {
      return false;
    }

    const signatureBytes = Buffer.from(params.signatureBase64.trim(), "base64");
    if (signatureBytes.length !== 64) {
      return false;
    }

    const spkiDer = Buffer.concat([ED25519_SPKI_DER_PREFIX, rawPubkeyBytes]);
    const publicKeyObj = createPublicKey({
      key: spkiDer,
      format: "der",
      type: "spki",
    });

    const messageBytes = Buffer.from(params.message, "utf8");
    return cryptoVerify(null, messageBytes, publicKeyObj, signatureBytes);
  } catch {
    return false;
  }
}

/**
 * Generates a real Ed25519 Solana Devnet keypair and signs a challenge message.
 * Used both by automated unit tests and by the 1-Click Devnet Demo Wallet for judges.
 */
export function createSignedEd25519DemoWallet(params: {
  userId: string;
  nonce: string;
  seedBytes?: Uint8Array;
}): {
  walletAddress: string;
  message: string;
  signatureBase64: string;
} {
  let publicKeyDer: Buffer;
  let privateKeyObj: ReturnType<typeof createPrivateKey>;

  if (params.seedBytes && params.seedBytes.length === 32) {
    const pkcs8Der = Buffer.concat([
      ED25519_PKCS8_DER_PREFIX,
      Buffer.from(params.seedBytes),
    ]);
    privateKeyObj = createPrivateKey({
      key: pkcs8Der,
      format: "der",
      type: "pkcs8",
    });
    const pubKeyObj = createPublicKey(privateKeyObj);
    publicKeyDer = pubKeyObj.export({ format: "der", type: "spki" }) as Buffer;
  } else {
    const pair = generateKeyPairSync("ed25519");
    privateKeyObj = pair.privateKey;
    publicKeyDer = pair.publicKey.export({
      format: "der",
      type: "spki",
    }) as Buffer;
  }

  // Last 32 bytes of the 44-byte Ed25519 SPKI DER are the raw 32-byte public key
  const rawPubkey = publicKeyDer.subarray(publicKeyDer.length - 32);
  const walletAddress = encodeBytesToBase58(rawPubkey);

  const message = buildWalletChallengeMessage({
    walletAddress,
    userId: params.userId,
    nonce: params.nonce,
  });

  const sigBuffer = cryptoSign(
    null,
    Buffer.from(message, "utf8"),
    privateKeyObj
  );

  return {
    walletAddress,
    message,
    signatureBase64: sigBuffer.toString("base64"),
  };
}
