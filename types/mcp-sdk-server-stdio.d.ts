export class StdioServerTransport {
  constructor(
    stdin?: NodeJS.ReadStream | null,
    stdout?: NodeJS.WriteStream | null,
  );
  start(): Promise<void>;
  close(): Promise<void>;
  send(message: unknown): Promise<void>;
  onmessage?: (message: unknown) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;
}
