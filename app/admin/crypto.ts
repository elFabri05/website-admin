/* Cifrado del token (PBKDF2 + AES-GCM) */

export const KDF_ITERATIONS = 600000;

export interface Credentials {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

const enc = new TextEncoder(), dec = new TextDecoder();
export const b64 = (buf: ArrayBuffer | Uint8Array) => {
  let s = "";
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const utf8ToB64 = (text: string) => b64(enc.encode(text));

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string, password: string): Promise<Credentials> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
  return { v: 1, kdf: "PBKDF2-SHA256", iterations: KDF_ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) };
}

export async function decryptToken(cred: Credentials, password: string) {
  const key = await deriveKey(password, unb64(cred.salt), cred.iterations);
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(cred.iv) }, key, unb64(cred.data));
  return dec.decode(data);
}
