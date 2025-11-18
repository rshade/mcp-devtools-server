import type { ZodTypeAny } from "zod";

export interface CallToolRequest {
  id?: string | number;
  jsonrpc?: string;
  method?: string;
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export const CallToolRequestSchema: ZodTypeAny;
export const ListToolsRequestSchema: ZodTypeAny;
