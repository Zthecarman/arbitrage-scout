export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { password, make, model, year_min, year_max } = req.body;
  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword || password !== validPassword) return res.status(401).json({ error: "Invalid password" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const yearStr = year_min ? `${year_min}-${year_max || year_min + 2}` : "";
  const query = `${yearStr} ${make} ${model}`.trim();

  const prompt = `Search for current ${query} listings for sale in Europe. 

Do multiple searches:
1. Search "site:mobile.de ${query} kaufen" 
2. Search "site:autoscout24.com ${query} for sale"
3. Search "${query} for sale classic driver"
4. Search "${query} for sale classic-trader.com"
5. Search "${query} te koop OR zu verkaufen OR a vendre" 

For each actual listing page you find (not search results pages, actual car listings), extract:
- The exact URL of the listing
- Price (convert to EUR number, no currency symbol)
- Mileage in km (convert miles to km if needed)
- Color
- Year
- Country/location
- One line description
- Which site it came from

Return ONLY this exact JSON with no markdown or explanation:
{"listings":[{"url":"https://...","price_eur":95000,"mileage_km":45000,"color":"Rosso Corsa","year":2000,"location":"Germany","description":"Full service history, one owner","source":"Mobile.de"}]}

Include only listings with real URLs you actually found. Aim for 5-10 listings.`;

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
        max_tokens: 5000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const textBlock = data.content?.find(b => b.type === "text");
    const text = textBlock?.text || "{}";
    let parsed;
    try {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { listings: [] };
    } catch { parsed = { listings: [] }; }
    const listings = (parsed.listings || [])
      .filter(l => l.url && l.url.startsWith("http"))
      .sort((a, b) => (a.price_eur || 0) - (b.price_eur || 0));
    return res.status(200).json({ listings });
  } catch (error) {
    return res.status(500).json({ error: error.message, listings: [] });
  }
}
