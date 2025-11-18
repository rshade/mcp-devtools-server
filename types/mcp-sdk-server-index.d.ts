import type { ZodTypeAny } from "zod";

export interface ServerInfo {
  name: string;
  version: string;
}

export interface ServerOptions {
  capabilities?: Record<string, unknown>;
  instructions?: string;
  jsonSchemaValidator?: unknown;
}

export interface RequestHandlerExtra {
  sessionId?: string;
  requestInfo?: {
    headers?: Record<string, string | string[] | undefined>;
  };
}

export type RequestHandler<T> = (
  request: T,
  extra?: RequestHandlerExtra,
) => Promise<unknown> | unknown;

export class Server<Request = unknown, Notification = unknown, Result = unknown> {
  constructor(serverInfo: ServerInfo, options?: ServerOptions);
  connect(transport: unknown): Promise<void>;
  setRequestHandler<TRequest = Request>(
    schema: ZodTypeAny | unknown,
    handler: RequestHandler<TRequest>,
  ): void;
  setNotificationHandler<TNotification = Notification>(
    schema: ZodTypeAny | unknown,
    handler: RequestHandler<TNotification>,
  ): void;
  registerCapabilities(capabilities: unknown): void;
}
