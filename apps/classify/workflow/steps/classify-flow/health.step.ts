/**
 * API Step: Health Check
 * Provides health status for Railway monitoring
 */

import { ApiRouteConfig } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "Health",
  description: "Health check endpoint for Railway monitoring",
  path: "/health",
  method: "GET",
  flows: [],
  emits: [],
  responseSchema: {
    200: z.object({
      status: z.literal("ok"),
      timestamp: z.string(),
      service: z.string(),
    }),
  },
};

export const handler = async () => {
  return {
    status: 200,
    body: {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "classify-workflow",
    },
  };
};
