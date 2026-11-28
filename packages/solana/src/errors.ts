/**
 * Deterministic Anchor Error Code Decoder for `quiz_arena_escrow` (6000..6012).
 */

import { QUIZ_ARENA_ESCROW_IDL } from "./idl";

export interface DecodedEscrowError {
  code: number;
  name: string;
  message: string;
}

export const ESCROW_ERROR_BY_CODE: Record<number, DecodedEscrowError> =
  Object.fromEntries(
    QUIZ_ARENA_ESCROW_IDL.errors.map((err) => [
      err.code,
      {
        code: err.code,
        name: err.name,
        message: err.msg,
      },
    ]),
  );

/**
 * Extracts and translates an Anchor custom program error code (`6000..6012` or hex `0x1770..0x177c`)
 * from an RPC error or simulation failure message.
 */
export function decodeEscrowProgramError(
  error: unknown,
): DecodedEscrowError | null {
  if (typeof error === "number" && ESCROW_ERROR_BY_CODE[error]) {
    return ESCROW_ERROR_BY_CODE[error] ?? null;
  }

  const rawText =
    error instanceof Error
      ? `${error.message} ${JSON.stringify(error)}`
      : typeof error === "string"
        ? error
        : JSON.stringify(error ?? "");

  // Check decimal code match (6000..6012)
  for (const errDef of QUIZ_ARENA_ESCROW_IDL.errors) {
    if (
      rawText.includes(String(errDef.code)) ||
      rawText.includes(errDef.name)
    ) {
      return {
        code: errDef.code,
        name: errDef.name,
        message: errDef.msg,
      };
    }
  }

  // Check hex custom program error: "custom program error: 0x1770"
  const hexMatch = rawText.match(/custom program error:\s*0x([0-9a-fA-F]+)/i);
  if (hexMatch?.[1]) {
    const parsedCode = Number.parseInt(hexMatch[1], 16);
    if (ESCROW_ERROR_BY_CODE[parsedCode]) {
      return ESCROW_ERROR_BY_CODE[parsedCode] ?? null;
    }
  }

  return null;
}
