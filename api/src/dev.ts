import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`Medicare guide API on http://localhost:${port}/api  (provider: ${config.provider}, model: ${config.model})`);
});
