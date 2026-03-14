export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password, make, model, year_min, year_max } = req.body;
  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword || password !== validPassword) return res.status(401).json({ error: "Invalid password" });

  const query = [year_min, make, model].filter(Boolean).join(" ");
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const prompt = `Search for actual current car listings of "${query}" on European marketplaces. Search Mobile.de, AutoScout24, Classic Driver, and Classic-trader.com. For each real listing found extract: full URL, price in EUR, mileage in km, color, year, location/country, brief description, source site. Return ONLY valid JSON: {"listings":[{"url":"","price_eur":0,"mileage_km":0,"color":"","year":0,"location":"","description":"","source":""}]}. Find up to 15 real listings with actual URLs. Do not invent listings.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const textBlock = data.content?.find(b => b.type === "text");
    const text = textBlock?.text || "{}";
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
    catch { parsed = { listings: [] }; }
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: "Scrape failed", listings: [] });
  }
}
