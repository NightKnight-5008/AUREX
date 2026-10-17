/**
 * Type declarations for node-machine-id
 */

declare module 'node-machine-id' {
  export function machineId(original?: boolean): Promise<string>;
  export function machineIdSync(options?: { original?: boolean }): string;
}
