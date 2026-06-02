# ScreenshotRender MCP server

Capture website screenshots from inside Claude, Cursor, VS Code, Windsurf, or any
[Model Context Protocol](https://modelcontextprotocol.io) client. This server
wraps the [ScreenshotRender](https://screenshotrender.com) API so your AI
assistant can render any public web page on request.

> Ask your assistant: *"Take a full-page screenshot of stripe.com"* and the image
> appears right in the chat.

## Tools

| Tool | Description |
|------|-------------|
| `take_screenshot` | Capture a screenshot of any public URL. Returns the image inline plus a hosted URL and page metadata (title, description). |

**Parameters**

- `url` (string, required) — page to capture, including `https://`.
- `fullPage` (boolean, optional) — capture the entire scrollable page instead of the viewport.
- `wait` (number, optional) — milliseconds to wait before capturing (for animations / lazy content).
- `timeout` (number, optional) — max milliseconds to wait for load.

## Setup

1. Get your API key at **[screenshotrender.com](https://screenshotrender.com)** (it starts with `sr-`).
2. Add the server to your MCP client config.

### Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "screenshotrender": {
      "command": "npx",
      "args": ["-y", "screenshotrender-mcp"],
      "env": {
        "SCREENSHOTRENDER_API_KEY": "sr-your-key-here"
      }
    }
  }
}
```

### Cursor / VS Code / Windsurf

Add the same block under the editor's MCP settings (`mcp.json` or the MCP
settings UI). Restart the client and the `take_screenshot` tool will be
available.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SCREENSHOTRENDER_API_KEY` | yes | Your ScreenshotRender key (`sr-...`). |
| `SCREENSHOTRENDER_BASE_URL` | no | Override the API base URL. Defaults to `https://screenshotrender.com`. |

## Local development

```bash
npm install
SCREENSHOTRENDER_API_KEY=sr-your-key npm run inspect   # opens MCP Inspector
```

The Inspector lets you call `take_screenshot` and view the result before
shipping.

## License

MIT
