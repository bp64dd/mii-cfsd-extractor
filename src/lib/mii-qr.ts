import aesjs from "aes-js";

/** Known Nintendo 3DS Mii QR AES-CCM key. */
const MII_KEY = [
  0x59, 0xfc, 0x81, 0x7e, 0x64, 0x46, 0xea, 0x61, 0x90, 0x34, 0x7b, 0x20, 0xe9, 0xbd, 0xce, 0x52,
];

export const CFSD_SIZE = 0x5c;

/**
 * Decrypt the 0x70-byte payload embedded in a 3DS Mii QR code into the
 * 0x5C-byte CFSD (Mii character) record.
 *
 * Layout: [nonce(8)][ciphertext(0x58) + CCM tag(0x10)]
 * The nonce is re-inserted at offset 0x0C of the plaintext.
 */
export function decryptMiiQr(payload: Uint8Array): Uint8Array {
  if (payload.length < 0x70) {
    throw new Error(
      `QR payload is ${payload.length} bytes; a Mii QR code carries at least 112 bytes.`,
    );
  }
  const data = payload.subarray(0, 0x70);
  const nonce = data.subarray(0, 8);
  const ciphertext = data.subarray(8, 0x70);

  // CCM decryption is AES-CTR over counter blocks A_i (i starting at 1).
  const counter = new Uint8Array(16);
  counter[0] = 0x02; // flags for a 12-byte nonce (q = 3)
  counter.set(nonce, 1);
  counter[15] = 1;

  const ctr = new aesjs.ModeOfOperation.ctr(MII_KEY, new aesjs.Counter(counter));
  const plain = ctr.decrypt(ciphertext).subarray(0, 0x58);

  const out = new Uint8Array(CFSD_SIZE);
  out.set(plain.subarray(0, 0x0c), 0);
  out.set(nonce, 0x0c);
  out.set(plain.subarray(0x0c), 0x14);
  return out;
}

/** Read the UTF-16LE Mii nickname stored at offset 0x1A of a CFSD record. */
export function readMiiName(cfsd: Uint8Array): string {
  let name = "";
  for (let i = 0x1a; i < 0x1a + 20; i += 2) {
    const code = (cfsd[i] ?? 0) | ((cfsd[i + 1] ?? 0) << 8);
    if (code === 0) break;
    name += String.fromCharCode(code);
  }
  return name.trim();
}

export function toHexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = Array.from(bytes.subarray(i, i + 16));
    lines.push(
      i.toString(16).padStart(4, "0") +
        "  " +
        chunk.map((b) => b.toString(16).padStart(2, "0")).join(" "),
    );
  }
  return lines.join("\n");
}
