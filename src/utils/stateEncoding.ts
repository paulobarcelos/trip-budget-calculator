import { deflate, inflate } from "pako";
import { TripState } from "@/types";
import { migrateState } from "./stateMigrations";

const PREFIX = "t=";

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toUrlSafe = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");

const fromUrlSafe = (value: string) =>
  value.replace(/-/g, "+").replace(/_/g, "/");

const addPadding = (value: string) => {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  return value.padEnd(value.length + (4 - remainder), "=");
};

export function encodeState(state: TripState): string {
  const json = JSON.stringify(state);
  const compressed = deflate(json);
  const base64 = toBase64(compressed);
  const urlSafe = toUrlSafe(base64);
  return `${PREFIX}${urlSafe}`;
}

export function decodeState(encoded: string): TripState {
  const trimmed = encoded.startsWith(PREFIX)
    ? encoded.slice(PREFIX.length)
    : encoded;
  const padded = addPadding(fromUrlSafe(trimmed));
  const compressed = fromBase64(padded);
  const json = inflate(compressed, { to: "string" }) as string;
  const parsed = JSON.parse(json);
  return migrateState(parsed);
}
