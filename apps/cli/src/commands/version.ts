/**
 * Studio Zero — `studio-zero --version` / `studio-zero version`.
 *
 * Phase 9 M3 Batch 1 (Forge). Prints the CLI version + binary hash.
 * The binary hash is the load-bearing piece of metadata: it's the HMAC
 * key for D7 verdict signing, and the server uses it to look up the
 * published-builds list (Cipher Fix-3c, M3 Batch 2).
 */
import { computeBinaryHash } from "./login.js";

export const CLI_VERSION = "0.1.0-m3";

export interface VersionReport {
  version: string;
  binaryHash: string;
  execPath: string;
  nodeVersion: string;
}

export function versionCommand(): VersionReport {
  return {
    version: CLI_VERSION,
    binaryHash: computeBinaryHash(),
    execPath: process.execPath,
    nodeVersion: process.version,
  };
}

export function formatVersion(r: VersionReport): string {
  return [
    `studio-zero ${r.version}`,
    `  binary hash: ${r.binaryHash}`,
    `  node:        ${r.nodeVersion}`,
    `  execPath:    ${r.execPath}`,
  ].join("\n");
}
