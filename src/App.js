import { useState } from "react";

const FX = { EUR: 1.09 };
const fmt = n => "$" + Math.round(n).toLocaleString();
const fmtK = n => n >= 1000000 ? "$" + (n/1000000).toFixed(2) + "M" : "$" + Math.round(n/1000) + "k";
const IMPORT_COSTS = { shipping: 2750, duty: 0.025, reciprocal: 0.10, hmf: 0.00125, mpf: 0.003464, broker: 900, inland: 1200, prep: 600 };
const PW = "DavelovesCars911$";

function calcLanded(p) {
  const duty = Math.round(p * IMPORT_COSTS.duty);
  const recip = Math.round(p * IMPORT_COSTS.reciprocal);
  const hmf = Math.round(p * IMPORT_COSTS.hmf);
  const mpf = Math.min(Math.max(Math.round(p * IMPORT_COSTS.mpf), 34), 652);
  const total = IMPORT_COSTS.shipping + duty + recip + hmf + mpf + IMPORT_COSTS.broker + IMPORT_COSTS.inland + IMPORT_COSTS.prep;
  return { priceUSD: p, importTotal: total, landed: p + total, duty, recip, hmf, mpf };
}

const EXAMPLES = ["1995 Ferrari F355 Berlinetta","1998 Porsche 911 Carrera 4S","2001 BMW M3 E46","1994 Honda NSX","1997 Lamborghini Diablo SV","1999 Porsche 911 GT3"];

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCosts, setShowCosts] = useState(false);
  const [listings, setListings] = useState(null);
  const [loadingListings, setLoadingListings] = useState(false);

  async function search(q) {
    const sq = q || query;
    if (!sq.trim()) return;
    setLoading(true); setResult(null); setError(null);
    const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const prompt = `You are a world-class exotic and collector car arbitrage specialist. Today is ${today}. You have encyclopedic knowledge of global collector car auction results, private sales, and dealer pricing through mid-2025.

SEARCH QUERY: "${sq}"

YOUR GOAL: Provide the most accurate, specific, data-driven analysis possible. Use real numbers from real sales. Recall specific auction results with dates and prices where you can.

EUROPEAN MARKET:
- Typical retail asking prices on Mobile.de, AutoScout24, Classic-trader.com, Classic Driver
- Best country to buy: Germany usually cheapest, Switzerland/Belgium best history, UK has right-hand drive risk
- Note common vs rare colors and specs in Europe

US MARKET - be specific:
- Recall actual BaT results with approximate dates and hammer prices you know about
- Mecum, RM Sothebys, Gooding, Bonhams, Broad Arrow results
- Which specs command the biggest US premiums (color, options, mileage, racing history)
- Note if market is rising or cooling

IMPORT: Cars 25+ years are EPA/DOT exempt. EU duty 12.5%. Fixed costs ~$6,450. Under 25yr add $15-35k compliance.

Include 5 comparable sales where possible. Note mileage and color on each sale. Be honest if data is limited - say so and give a wide range.

Return ONLY valid JSON, no markdown:
{"car":{"year":0,"make":"","model":"","trim":"","over_25_years":true,"total_produced":0,"us_sold_new":false,"description":"2 sentences on what makes this car special"},"european_market":{"typical_price_eur":0,"price_range_low_eur":0,"price_range_high_eur":0,"best_sources":["","",""],"best_country_to_buy":"","supply_notes":"","buying_tips":"specific advice on what to look for"},"us_market":{"typical_auction_usd":0,"auction_range_low_usd":0,"auction_range_high_usd":0,"best_venues":["",""],"demand_notes":"","premium_specs":"which colors and options add the most value in the US"},"arbitrage":{"opportunity_score":0,"verdict":"Strong Buy or Moderate Opportunity or Marginal or Avoid","summary":"3 sentences on the opportunity, why it exists, and key risk","pros":["","",""],"cons":["","",""],"due_diligence":["","","",""],"best_time_to_buy":"seasonal or market timing advice"},"comparable_sales":[{"date":"","venue":"","price":"","mileage":"","color":"","notes":""},{"date":"","venue":"","price":"","mileage":"","color":"","notes":""},{"date":"","venue":"","price":"","mileage":"","color":"","notes":""},{"date":"","venue":"","price":"","mileage":"","color":"","notes":""},{"date":"","venue":"","price":"","mileage":"","color":"","notes":""}]}`;

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: PW, model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
      });
      if (resp.status === 401) { setError("Access denied."); return; }
      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const eurPrice = parsed.european_market?.typical_price_eur || 0;
      const priceUSD = Math.round(eurPrice * FX.EUR);
      const costs = calcLanded(priceUSD);
      const usAvg = parsed.us_market?.typical_auction_usd || 0;
      const spread = usAvg > 0 ? Math.round(((usAvg - costs.landed) / costs.landed) * 100) : 0;
      const r = { ...parsed, _costs: costs, _spread: spread, _priceUSD: priceUSD, _usAvg: usAvg };
      setResult(r);
      scrape(parsed.car?.make, parsed.car?.model, parsed.car?.year);
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function scrape(carMake, carModel, carYear) {
    setLoadingListings(true);
    setListings(null);
    try {
      const resp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: PW,
          make: carMake,
          model: carModel,
          year_min: carYear ? carYear - 1 : undefined,
          year_max: carYear ? carYear + 1 : undefined,
        }),
      });
      const data = await resp.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }

  const score = result?.arbitrage?.opportunity_score || 0;
  const scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  const spreadColor = (result?._spread || 0) > 15 ? "#22c55e" : (result?._spread || 0) > 0 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ borderBottom: "1px solid #0f172a", padding: "20px 28px", background: "#020817" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>EXOTIC ARBITRAGE INTELLIGENCE</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: "#f8fafc" }}>European Scout</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["12.5%", "EU duty"], ["25yr", "EPA exempt"], ["$6.5k", "Fixed costs"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>{v}</div>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1 }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 28px 0" }}>
        <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>Enter any year, make, model, and trim to find European arbitrage opportunities</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="e.g. 1997 Ferrari F355 Spider, 2003 Porsche 996 GT3 RS, 1994 Honda NSX..."
            style={{ flex: 1, padding: "12px 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", fontFamily: "inherit" }}
            onFocus={e => { e.target.style.borderColor = "#f59e0b"; }}
            onBlur={e => { e.target.style.borderColor = "#1e293b"; }} />
          <button onClick={() => search()} disabled={loading || !query.trim()}
            style={{ padding: "12px 24px", background: loading ? "#1e293b" : "linear-gradient(135deg, #b45309, #f59e0b)", border: "none", borderRadius: 8, color: loading ? "#475569" : "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {loading ? "Searching…" : "↗ Analyze"}
          </button>
        </div>

        {!result && !loading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 8 }}>TRY AN EXAMPLE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => { setQuery(ex); search(ex); }}
                  style={{ padding: "5px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, color: "#64748b", fontSize: 11, cursor: "pointer" }}
                  onMouseEnter={e => { e.target.style.borderColor = "#f59e0b"; e.target.style.color = "#f59e0b"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "#1e293b"; e.target.style.color = "#64748b"; }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 40, textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>Searching European markets and US auction comps…</div>
            <div style={{ fontSize: 11, color: "#334155" }}>Analyzing arbitrage opportunity for "{query}"</div>
          </div>
        )}

        {error && <div style={{ marginTop: 20, padding: 16, background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, fontSize: 12, color: "#fca5a5" }}>{error}</div>}

        {result && !loading && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#f8fafc", lineHeight: 1.2 }}>{result.car?.year} {result.car?.make} {result.car?.model}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{result.car?.trim}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 6, maxWidth: 500 }}>{result.car?.description}</div>
              </div>
              <div style={{ textAlign: "center", background: "#0f172a", border: `2px solid ${scoreColor}`, borderRadius: 12, padding: "16px 24px", minWidth: 100 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor, fontFamily: "monospace" }}>{score}</div>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2 }}>OPPORTUNITY</div>
                <div style={{ fontSize: 10, color: scoreColor, fontWeight: 700, marginTop: 4 }}>{result.arbitrage?.verdict}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                ["EU Typical Price", `€${(result.european_market?.typical_price_eur || 0).toLocaleString()}`, "#f1f5f9"],
                ["US Purchase Cost", fmt(result._priceUSD), "#f59e0b"],
                ["Import Add", fmt(result._costs?.importTotal), "#64748b"],
                ["Total Landed", fmt(result._costs?.landed), "#f1f5f9"],
                ["US Auction Avg", fmtK(result._usAvg), "#f59e0b"],
                ["Potential Spread", `${result._spread > 0 ? "+" : ""}${result._spread}%`, spreadColor],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1, marginBottom: 4 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "monospace" }}>{val}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowCosts(!showCosts)}
              style={{ background: "none", border: "1px solid #1e293b", borderRadius: 6, color: "#475569", fontSize: 11, padding: "5px 12px", cursor: "pointer", marginBottom: showCosts ? 0 : 16 }}>
              {showCosts ? "▲ Hide cost breakdown" : "▼ Show full import cost breakdown"}
            </button>
            {showCosts && (
              <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 11 }}>
                {[["Purchase price (USD)", result._priceUSD], ["Ocean freight (container)", IMPORT_COSTS.shipping], ["Base duty 2.5%", result._costs?.duty], ["EU reciprocal tariff 10%", result._costs?.recip], ["HMF + MPF", (result._costs?.hmf || 0) + (result._costs?.mpf || 0)], ["Broker + inland + prep", IMPORT_COSTS.broker + IMPORT_COSTS.inland + IMPORT_COSTS.prep]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #0f172a", color: "#64748b" }}>
                    <span>{l}</span><span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 700, color: "#f59e0b", fontSize: 13 }}>
                  <span>Total landed cost</span><span style={{ fontFamily: "monospace" }}>{fmt(result._costs?.landed)}</span>
                </div>
                {!result.car?.over_25_years && <div style={{ marginTop: 8, fontSize: 10, color: "#dc2626" }}>⚠ Car may be under 25 years — add $15–35k for DOT/EPA compliance</div>}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", letterSpacing: 1, marginBottom: 10 }}>EUROPEAN MARKET</div>
                {result.european_market?.best_country_to_buy && (
                  <div style={{ fontSize: 11, marginBottom: 8 }}>
                    <span style={{ color: "#475569" }}>Best country: </span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{result.european_market.best_country_to_buy}</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Range: <span style={{ color: "#f1f5f9" }}>€{(result.european_market?.price_range_low_eur || 0).toLocaleString()} – €{(result.european_market?.price_range_high_eur || 0).toLocaleString()}</span></div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Sources: {result.european_market?.best_sources?.join(", ")}</div>
                <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginBottom: result.european_market?.buying_tips ? 8 : 0 }}>{result.european_market?.supply_notes}</div>
                {result.european_market?.buying_tips && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>Tip: {result.european_market.buying_tips}</div>}
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 10 }}>US MARKET</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Range: <span style={{ color: "#f1f5f9" }}>{fmtK(result.us_market?.auction_range_low_usd || 0)} – {fmtK(result.us_market?.auction_range_high_usd || 0)}</span></div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Venues: {result.us_market?.best_venues?.join(", ")}</div>
                <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginBottom: result.us_market?.premium_specs ? 8 : 0 }}>{result.us_market?.demand_notes}</div>
                {result.us_market?.premium_specs && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>Premium specs: {result.us_market.premium_specs}</div>}
              </div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 10, fontSize: 13, color: "#cbd5e1", lineHeight: 1.75 }}>{result.arbitrage?.summary}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: 1, marginBottom: 8 }}>OPPORTUNITY</div>
                {result.arbitrage?.pros?.map((p, i) => <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0a0f1a" }}>• {p}</div>)}
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", letterSpacing: 1, marginBottom: 8 }}>RISK FACTORS</div>
                {result.arbitrage?.cons?.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0a0f1a" }}>• {c}</div>)}
              </div>
            </div>

            <div style={{ background: "#150c00", border: "1px solid #78350f", borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 8 }}>DUE DILIGENCE CHECKLIST</div>
              {result.arbitrage?.due_diligence?.map((d, i) => <div key={i} style={{ fontSize: 11, color: "#d97706", padding: "2px 0" }}>☐ {d}</div>)}
            </div>

            {result.comparable_sales?.length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: 1, marginBottom: 10 }}>RECENT COMPARABLE SALES</div>
                <div style={{ display: "grid", gridTemplateColumns: "80px 110px 65px 70px 80px 1fr", gap: 6, padding: "3px 0 6px", borderBottom: "1px solid #1e293b", fontSize: 9, color: "#334155", letterSpacing: 1 }}>
                  <span>DATE</span><span>VENUE</span><span>PRICE</span><span>MILEAGE</span><span>COLOR</span><span>NOTES</span>
                </div>
                {result.comparable_sales.map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 110px 65px 70px 80px 1fr", gap: 6, padding: "5px 0", borderBottom: "1px solid #0a0f1a", fontSize: 11 }}>
                    <span style={{ color: "#475569" }}>{s.date}</span>
                    <span style={{ color: "#64748b" }}>{s.venue}</span>
                    <span style={{ color: "#f59e0b", fontFamily: "monospace", fontWeight: 700 }}>{s.price}</span>
                    <span style={{ color: "#94a3b8" }}>{s.mileage}</span>
                    <span style={{ color: "#cbd5e1" }}>{s.color}</span>
                    <span style={{ color: "#475569", fontStyle: "italic" }}>{s.notes}</span>
                  </div>
                ))}
              </div>
            )}

            {result.arbitrage?.best_time_to_buy && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", letterSpacing: 1, marginBottom: 6 }}>BEST TIME TO BUY</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{result.arbitrage.best_time_to_buy}</div>
              </div>
            )}

            {(loadingListings || (listings && listings.length > 0)) && (
              <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 12 }}>
                  LIVE EUROPEAN LISTINGS {loadingListings ? "(searching...)" : `(${listings.length} found)`}
                </div>
                {loadingListings && (
                  <div style={{ fontSize: 12, color: "#475569" }}>Searching Mobile.de, AutoScout24, Classic Driver...</div>
                )}
                {listings && listings.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "grid", gridTemplateColumns: "65px 70px 75px 60px 1fr 90px", gap: 8, padding: "8px 0", borderBottom: "1px solid #0f172a", textDecoration: "none", alignItems: "center" }}>
                    <span style={{ color: "#f59e0b", fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>EUR {(l.price_eur || 0).toLocaleString()}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{l.mileage_km ? (l.mileage_km).toLocaleString() + " km" : ""}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 11 }}>{l.color}</span>
                    <span style={{ color: "#64748b", fontSize: 11 }}>{l.year}</span>
                    <span style={{ color: "#475569", fontSize: 11, fontStyle: "italic" }}>{l.description?.slice(0, 60)}</span>
                    <span style={{ color: "#3b82f6", fontSize: 10, textAlign: "right" }}>{l.source} - {l.location}</span>
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Search another car..."
                style={{ flex: 1, padding: "10px 14px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                onFocus={e => { e.target.style.borderColor = "#f59e0b"; }}
                onBlur={e => { e.target.style.borderColor = "#1e293b"; }} />
              <button onClick={() => search()} disabled={loading || !query.trim()}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #b45309, #f59e0b)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ↗ Analyze
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#1e293b", textAlign: "center", marginBottom: 32 }}>AI analysis for research purposes only. Verify all comps independently before committing capital.</div>
          </div>
        )}
      </div>
    </div>
  );
}
