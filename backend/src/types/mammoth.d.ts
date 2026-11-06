// mammoth ships no types of its own and there's no @types/mammoth package —
// this declares only the functions this codebase actually calls.
declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
  export function convertToHtml(
    input: { buffer: Buffer } | { path: string }
  ): Promise<{ value: string }>;
}
