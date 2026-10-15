// mammoth ships no types of its own and there's no @types/mammoth package —
// this declares only the one function this codebase actually calls.
declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
}
