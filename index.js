#!/usr/bin/env node
/**
 * ScreenshotRender MCP server
 *
 * Exposes the ScreenshotRender screenshot API as an MCP tool so any MCP client
 * (Claude Desktop, Cursor, VS Code, Windsurf, etc.) can capture website
 * screenshots on the user's behalf.
 *
 * Auth: the user supplies their own ScreenshotRender API key (the "sr-..." key
 * from https://screenshotrender.com) via the SCREENSHOTRENDER_API_KEY env var.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.SCREENSHOTRENDER_API_KEY;
const BASE_URL = (
  process.env.SCREENSHOTRENDER_BASE_URL || "https://screenshotrender.com"
).replace(/\/+$/, "");

const server = new McpServer({
  name: "screenshotrender",
  version: "1.0.0",
});

server.registerTool(
  "take_screenshot",
  {
    title: "Take Screenshot",
    description:
      "Capture a screenshot of any public website using ScreenshotRender. " +
      "Returns the rendered image inline plus a hosted URL and basic page " +
      "metadata (title, description). Use this whenever the user wants to see, " +
      "save, or share what a web page looks like.",
    inputSchema: {
      url: z
        .string()
        .describe(
          "The URL of the page to screenshot. Include the scheme (https://). " +
            "Example: https://stripe.com"
        ),
      fullPage: z
        .boolean()
        .optional()
        .describe(
          "Capture the entire scrollable page instead of just the 1280x720 " +
            "viewport. Defaults to false."
        ),
      wait: z
        .number()
        .int()
        .min(0)
        .max(30000)
        .optional()
        .describe(
          "Milliseconds to wait after load before capturing, for pages with " +
            "animations or lazy content. Defaults to none."
        ),
      timeout: z
        .number()
        .int()
        .min(1000)
        .max(60000)
        .optional()
        .describe("Maximum milliseconds to wait for the page to load."),
    },
  },
  async ({ url, fullPage, wait, timeout }) => {
    if (!API_KEY) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text:
              "Missing API key. Set the SCREENSHOTRENDER_API_KEY environment " +
              "variable to your ScreenshotRender key (starts with 'sr-'). " +
              "Get one at https://screenshotrender.com.",
          },
        ],
      };
    }

    const qs = new URLSearchParams({ apiKey: API_KEY, url });
    if (fullPage) qs.set("fullPage", "true");
    if (wait != null) qs.set("wait", String(wait));
    if (timeout != null) qs.set("timeout", String(timeout));

    let payload;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/screenshot?${qs.toString()}`);
      payload = await res.json();
      if (!res.ok || !payload?.success) {
        const msg = payload?.error || `Request failed with status ${res.status}`;
        return { isError: true, content: [{ type: "text", text: msg }] };
      }
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to reach ScreenshotRender: ${err?.message || err}`,
          },
        ],
      };
    }

    const data = payload.data || {};
    const shotUrl = data.screenshot;
    const summaryLines = [
      `Screenshot captured for ${url}`,
      data.title ? `Title: ${data.title}` : null,
      data.description ? `Description: ${data.description}` : null,
      shotUrl ? `Image URL: ${shotUrl}` : null,
      data.tokensUsed != null ? `Credits used: ${data.tokensUsed}` : null,
    ].filter(Boolean);

    const content = [];

    // Try to inline the image so it renders directly in the client.
    if (shotUrl) {
      try {
        const imgRes = await fetch(shotUrl);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const mimeType = imgRes.headers.get("content-type") || "image/png";
          content.push({
            type: "image",
            data: buf.toString("base64"),
            mimeType,
          });
        }
      } catch {
        // Non-fatal: fall back to the URL in the text summary below.
      }
    }

    content.push({ type: "text", text: summaryLines.join("\n") });
    return { content };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs; stdout is reserved for the MCP protocol.
  console.error("screenshotrender-mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting screenshotrender-mcp:", err);
  process.exit(1);
});
