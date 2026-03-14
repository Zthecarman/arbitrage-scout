export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, ...body } = req.body;
  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword || password !== validPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Add web search tool so Claude can look up recent auction results
  const bodyWithSearch = {
    ...body,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify(bodyWithSearch),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Proxy request failed" });
  }
}
