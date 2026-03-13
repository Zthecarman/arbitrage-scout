import { useState, useCallback } from "react";

const IMPORT_COSTS = {
  shipping_container: 2750,
  duty_base_pct: 0.025,
  reciprocal_pct: { EU: 0.10, UK: 0.10, Japan: 0.15, Australia: 0.10 },
  hmf_pct: 0.00125,
  mpf_pct: 0.003464,
  broker: 900,
  inland_us: 1200,
  inspection_prep: 600,
};

const FX = { EUR: 1.09, GBP: 1.27, JPY: 0.0067, AUD: 0.65 };
const toUSD = (amt, cur) => Math.round(amt * (FX[cur] || 1));

const MARKET_INTEL = {
  "993 Turbo S": {
    production: 435,
    bat_range_low: 850000, bat_range_high: 2400000, bat_avg: 1100000,
    notes: "435 built total, 183 for NA. Rarest air-cooled 911. Last BaT sale ~$1.05M (2024). European examples often carry cleaner history. Speed Yellow and Ocean Blue command strong premiums.",
    watch_for: "Verify Aerokit II bodywork, carbon strut brace, quad exhaust. Beware converted Turbos misrepresented as Turbo S — check options sticker and COA.",
  },
  "964 Carrera RS": {
    production: 2280,
    bat_range_low: 220000, bat_range_high: 533000, bat_avg: 282000,
    notes: "Avg BaT sale $282k. M001 Lightweight commands 40–60% over M002 Touring. Never sold new in US — all US examples are grey market imports. Strong European supply vs thin US inventory.",
    watch_for: "Confirm M001 (lightweight) vs M002 (touring) vs N/GT spec on the options sticker. Check seam welds. Matching numbers and colors critical for value.",
  },
  "993 Carrera RS": {
    production: 1014,
    bat_range_low: 250000, bat_range_high: 830000, bat_avg: 335000,
    notes: "Never US-market. Avg sale $335k. 3.8 Clubsport reached $830k in Feb 2025. Strong BaT demand — US buyers pay significant premiums vs European prices. Supply tightening each year.",
    watch_for: "Distinguish standard RS from Clubsport (roll cage, harnesses). Verify 3.6 vs 3.8 engine. Probe for undisclosed track use — look at wear patterns on roll cage.",
  },
  "996 GT2": {
    production: 1287,
    bat_range_low: 80000, bat_range_high: 215000, bat_avg: 135000,
    notes: "1,287 built — 70 Clubsport spec most desirable. European prices €90–215k depending on mileage and spec. Mezger engine is the key asset. 'Widowmaker' rep keeps soft buyers out — opportunity for the confident.",
    watch_for: "IMS bearing service history is paramount. Clubsport adds roll cage + Recaro + harnesses. Verify X50 performance pack. Check PCCB (ceramic) brake condition — expensive to replace.",
  },
  "Ferrari 365 GT4 BB": {
    production: 387,
    bat_range_low: 220000, bat_range_high: 511000, bat_avg: 310000,
    notes: "Only 387 built — Ferrari's first mid-engine road car with the prancing horse badge. Recent auction comps: €250k (Artcurial 2025), $335k (Broad Arrow 2025), €320k (RM Sotheby's Monaco 2024). The 365 leads 512 BB/BBi in collector hierarchy.",
    watch_for: "Engine-out timing belt service is mandatory and expensive (~$15–25k). Verify belt was changed — ask for invoices. Original vs restored color and interior matters enormously.",
  },
};

const LISTINGS = [
  { id: 1, target: "993 Turbo S", make: "Porsche", model: "911 (993) Turbo S", year: 1997, mileage_km: 41000, price_local: 695000, currency: "EUR", country: "Germany", region: "EU", source: "Mobile.de", condition: "Excellent", color: "Speed Yellow", description: "German-delivery. Full Porsche main dealer history. Aerokit II, carbon strut brace, original Recaro seats. Two owners from new. All books present.", flags: ["Rare color", "Full history", "2 owners"] },
  { id: 2, target: "993 Turbo S", make: "Porsche", model: "911 (993) Turbo S", year: 1998, mileage_km: 83000, price_local: 520000, currency: "EUR", country: "Belgium", region: "EU", source: "AutoScout24", condition: "Good", color: "Arctic Silver", description: "Three owners. History present but gap 2008–2014. Recent major service. Some interior wear. Price reflects higher mileage and history gap.", flags: ["Higher mileage", "History gap — verify", "Recent service"] },
  { id: 3, target: "964 Carrera RS", make: "Porsche", model: "911 (964) Carrera RS", year: 1992, mileage_km: 45000, price_local: 228000, currency: "EUR", country: "Germany", region: "EU", source: "Classic Driver", condition: "Excellent", color: "Grand Prix White", description: "M001 Lightweight. Matching numbers and colors. German first delivery with original invoice. Never tracked. All original interior components.", flags: ["M001 Lightweight", "Matching numbers", "Original invoice"] },
  { id: 4, target: "964 Carrera RS", make: "Porsche", model: "911 (964) Carrera RS", year: 1992, mileage_km: 157000, price_local: 89964, currency: "EUR", country: "Germany", region: "EU", source: "Mobile.de", condition: "Fair", color: "Guards Red", description: "Clubsport spec. Very high mileage, believed significant track use. Priced accordingly as a project. Potential for the right buyer willing to undertake full restoration.", flags: ["High mileage", "Track use likely", "Project car"] },
  { id: 5, target: "993 Carrera RS", make: "Porsche", model: "911 (993) Carrera RS", year: 1995, mileage_km: 28000, price_local: 310000, currency: "EUR", country: "France", region: "EU", source: "Collecting Cars EU", condition: "Excellent", color: "Speed Yellow", description: "Low-mileage French delivery. Standard RS (not Clubsport). Original seats and paint, complete history file. Stored for 8 years, recently recommissioned.", flags: ["Ultra-low mileage", "Speed Yellow", "Dry stored 8yrs"] },
  { id: 6, target: "993 Carrera RS", make: "Porsche", model: "911 (993) Carrera RS 3.8 Clubsport", year: 1996, mileage_km: 52000, price_local: 520000, currency: "EUR", country: "Germany", region: "EU", source: "Classic Driver", condition: "Excellent", color: "Riviera Blue", description: "Rare 3.8 Clubsport. Roll cage, Recaro buckets, six-point harnesses, fire suppression. German delivery. One of ~213 Clubsport variants built for GT2 homologation.", flags: ["3.8 Clubsport", "213 built total", "Homologation spec"] },
  { id: 7, target: "996 GT2", make: "Porsche", model: "911 (996) GT2", year: 2003, mileage_km: 19000, price_local: 215000, currency: "EUR", country: "Belgium", region: "EU", source: "AutoScout24", condition: "Excellent", color: "GT Silver", description: "Exceptionally low mileage. Belgian delivery. Mezger engine, ceramic brakes. Full Porsche dealer service history. Clubsport option with half roll cage and Recaro seats.", flags: ["Clubsport spec", "Low mileage", "Full dealer history"] },
  { id: 8, target: "996 GT2", make: "Porsche", model: "911 (996) GT2", year: 2002, mileage_km: 91000, price_local: 107000, currency: "EUR", country: "Germany", region: "EU", source: "Collecting Cars EU", condition: "Good", color: "Guards Red", description: "German delivery. High but fully documented mileage. Recent IMS bearing service and new clutch. Priced to reflect use. Strong driving example — Mezger engine proven robust.", flags: ["IMS serviced", "High mileage discounted", "Mezger engine"] },
  {
    id: 9, target: "Ferrari 365 GT4 BB",
    make: "Ferrari", model: "365 GT4 BB (Berlinetta Boxer)",
    year: 1975, mileage_km: null,
    price_local: null, currency: "EUR",
    country: "France", region: "EU",
    source: "Artcurial – Fritz Neuser Collection",
    source_url: "https://www.artcurial.com/en/sales/6480/lots/5-a",
    condition: "Unknown — inspect",
    color: "Unknown",
    estimate_low: 200000, estimate_high: 300000,
    description: "From the Fritz Neuser Collection. Offered NO RESERVE. 1975 model — one of only 387 examples of Ferrari's first mid-engine road car. Pininfarina body, 4.4L flat-12 'Boxer' ~360bhp. Artcurial Motorcars, Paris.",
    flags: ["NO RESERVE", "1 of 387", "Fritz Neuser Collection", "Artcurial auction"],
    is_auction: true,
  },
];

function calcCosts(priceUSD, region) {
  const duty = Math.round(priceUSD * IMPORT_COSTS.duty_base_pct);
  const recip = Math.round(priceUSD * (IMPORT_COSTS.reciprocal_pct[region] || 0.10));
  const hmf = Math.round(priceUSD * IMPORT_COSTS.hmf_pct);
  const mpf = Math.min(Math.max(Math.round(priceUSD * IMPORT_COSTS.mpf_pct), 34), 652);
  const total = IMPORT_COSTS.shipping_container + duty + recip + hmf + mpf + IMPORT_COSTS.broker + IMPORT_COSTS.inland_us + IMPORT_COSTS.inspection_prep;
  return { shipping: IMPORT_COSTS.shipping_container, duty, recip, hmf, mpf, broker: IMPORT_COSTS.broker, inland: IMPORT_COSTS.inland_us, prep: IMPORT_COSTS.inspection_prep, total };
}

const fmt = n => "$" + Math.round(n).toLocaleString();
const fmtK = n => n >= 1000000 ? "$" + (n / 1000000).toFixed(1) + "M" : "$" + Math.round(n / 1000) + "k";

const ACCENT = {
  "993 Turbo S": "#b45309",
  "964 Carrera RS": "#1d4ed8",
  "993 Carrera RS": "#15803d",
  "996 GT2": "#7c3aed",
  "Ferrari 365 GT4 BB": "#c0392b",
};

function FlagPill({ text }) {
  const isGood = /no reserve|1 of|collection|homologation|clubsport|invoice|matching|low mileage|ultra|rare color|full history/i.test(text);
  const isBad = /risk|gap|high mileage|likely|project|inspect/i.test(text);
  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap",
      background: isBad ? "#450a0a" : isGood ? "#0c1a0c" : "#0f172a",
      color: isBad ? "#fca5a5" : isGood ? "#86efac" : "#f59e0b",
      border: `1px solid ${isBad ? "#7f1d1d" : isGood ? "#166534" : "#78350f"}`,
    }}>{text}</span>
  );
}

function IntelCard({ target }) {
  const d = MARKET_INTEL[target];
  const color = ACCENT[target];
  return (
    <div style={{ background: "#0a0f1e", border: `1px solid ${color}50`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>{target.toUpperCase()}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>{d.production.toLocaleString()} produced</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[["Auction avg", fmtK(d.bat_avg), "#f59e0b"], ["Comp floor", fmtK(d.bat_range_low), "#94a3b8"], ["Comp ceiling", fmtK(d.bat_range_high), "#22c55e"]].map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginBottom: 6 }}>{d.notes}</div>
      <div style={{ fontSize: 10, color: "#dc2626" }}>⚠ {d.watch_for}</div>
    </div>
  );
}

function AuctionCard({ listing, onAnalyze, analyzing }) {
  const [exp, setExp] = useState(false);
  const color = ACCENT[listing.target] || "#c0392b";
  const intel = MARKET_INTEL[listing.target];
  const estMidUSD = listing.estimate_low && listing.estimate_high
    ? toUSD((listing.estimate_low + listing.estimate_high) / 2, listing.currency)
    : null;
  const costsAtMid = estMidUSD ? calcCosts(estMidUSD, listing.region) : null;
  const landedAtMid = estMidUSD && costsAtMid ? estMidUSD + costsAtMid.total : null;
  const spread = landedAtMid && intel ? Math.round(((intel.bat_avg - landedAtMid) / landedAtMid) * 100) : null;

  return (
    <div style={{ background: "#0f172a", border: `2px solid ${color}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: color, padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#fff", textAlign: "center" }}>
        ★ AUCTION — NO RESERVE ★
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#f1f5f9", fontWeight: 700 }}>{listing.year} {listing.model}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{listing.country} · {listing.source}</div>
            <a href={listing.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color, textDecoration: "none" }}>View lot at Artcurial →</a>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
              Est. €{listing.estimate_low?.toLocaleString()}–€{listing.estimate_high?.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: "#475569" }}>
              ≈ ${toUSD(listing.estimate_low, listing.currency).toLocaleString()}–${toUSD(listing.estimate_high, listing.currency).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {listing.flags.map(f => <FlagPill key={f} text={f} />)}
        </div>
        {estMidUSD && costsAtMid && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Landed @ mid-est</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: "monospace" }}>{fmtK(landedAtMid)}</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Import add</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", fontFamily: "monospace" }}>{fmtK(costsAtMid.total)}</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>vs auction avg</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: spread > 20 ? "#22c55e" : spread > 0 ? "#f59e0b" : "#ef4444" }}>
                {spread !== null ? (spread > 0 ? "+" : "") + spread + "%" : "—"}
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 10, fontStyle: "italic" }}>{listing.description}</div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => setExp(!exp)} style={{ flex: 1, padding: "6px 0", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#64748b", fontSize: 11, cursor: "pointer" }}>
            {exp ? "Hide ↑" : "Costs ↓"}
          </button>
          <button onClick={() => onAnalyze(listing, estMidUSD, landedAtMid)} disabled={analyzing}
            style={{ flex: 3, padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: analyzing ? "not-allowed" : "pointer", background: analyzing ? "#1e293b" : `linear-gradient(90deg, ${color}, ${color}bb)`, color: analyzing ? "#64748b" : "#fff" }}>
            {analyzing ? "Analyzing…" : "↗ AI Arbitrage Analysis"}
          </button>
        </div>
        {exp && estMidUSD && costsAtMid && (
          <div style={{ marginTop: 12, fontSize: 11 }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Cost breakdown at estimate midpoint (€250k)</div>
            {[["Purchase @ mid-est (USD)", estMidUSD], ["Ocean freight", costsAtMid.shipping], ["Base duty 2.5%", costsAtMid.duty], ["EU reciprocal 10%", costsAtMid.recip], ["HMF + MPF", costsAtMid.hmf + costsAtMid.mpf], ["Broker + inland + prep", costsAtMid.broker + costsAtMid.inland + costsAtMid.prep]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <span>{l}</span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, color: "#f59e0b", fontSize: 12 }}>
              <span>Total landed</span><span style={{ fontFamily: "monospace" }}>{fmt(landedAtMid)}</span>
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>⚠ Add ~$15–25k for mandatory engine-out timing belt service if not recently documented.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing, onAnalyze, analyzing }) {
  const [exp, setExp] = useState(false);
  const priceUSD = toUSD(listing.price_local, listing.currency);
  const costs = calcCosts(priceUSD, listing.region);
  const landed = priceUSD + costs.total;
  const intel = MARKET_INTEL[listing.target];
  const spread = intel ? Math.round(((intel.bat_avg - landed) / landed) * 100) : 0;
  const color = ACCENT[listing.target] || "#64748b";

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderLeft: `3px solid ${color}`, borderRadius: 10, overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.borderLeftColor = color; }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#f1f5f9", fontWeight: 700 }}>{listing.year} {listing.model}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{listing.country} · {listing.source} · {listing.color} · {(listing.mileage_km / 1000).toFixed(0)}k km</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>{listing.currency} {listing.price_local.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{fmt(priceUSD)} USD</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {listing.flags.map(f => <FlagPill key={f} text={f} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Landed cost</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: "monospace" }}>{fmtK(landed)}</div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Import add</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", fontFamily: "monospace" }}>{fmtK(costs.total)}</div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>vs auction avg</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: spread > 20 ? "#22c55e" : spread > 0 ? "#f59e0b" : "#ef4444" }}>
              {spread > 0 ? "+" : ""}{spread}%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => setExp(!exp)} style={{ flex: 1, padding: "6px 0", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#64748b", fontSize: 11, cursor: "pointer" }}>
            {exp ? "Hide ↑" : "Costs ↓"}
          </button>
          <button onClick={() => onAnalyze(listing, priceUSD, landed)} disabled={analyzing}
            style={{ flex: 3, padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: analyzing ? "not-allowed" : "pointer", background: analyzing ? "#1e293b" : `linear-gradient(90deg, ${color}, ${color}bb)`, color: analyzing ? "#64748b" : "#fff" }}>
            {analyzing ? "Analyzing…" : "↗ AI Arbitrage Analysis"}
          </button>
        </div>
        {exp && (
          <div style={{ marginTop: 12, fontSize: 11 }}>
            {[["Purchase (USD)", priceUSD], ["Ocean freight", costs.shipping], ["Base duty 2.5%", costs.duty], ["EU reciprocal 10%", costs.recip], ["HMF + MPF", costs.hmf + costs.mpf], ["Broker + inland + prep", costs.broker + costs.inland + costs.prep]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <span>{l}</span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, color: "#f59e0b", fontSize: 12 }}>
              <span>Total landed</span><span style={{ fontFamily: "monospace" }}>{fmt(landed)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ result, onClose }) {
  if (!result) return null;
  const { listing, analysis, priceUSD, landedCost } = result;
  const color = ACCENT[listing.target] || "#334155";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f172a", border: `1px solid ${color}`, borderRadius: 16, maxWidth: 660, width: "100%", maxHeight: "88vh", overflow: "auto", padding: 26 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#f1f5f9" }}>{listing.year} {listing.model}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {listing.country} · {priceUSD ? fmt(priceUSD) + " purchase" : "auction"} · {landedCost ? fmt(landedCost) + " landed" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["Score", `${analysis.score}/100`, analysis.score >= 70 ? "#22c55e" : analysis.score >= 45 ? "#f59e0b" : "#ef4444"], ["Est. resale value", analysis.bat_estimate, "#f59e0b"], ["Est. profit", analysis.profit_estimate, analysis.profit_positive ? "#22c55e" : "#ef4444"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "#1e293b", borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, fontSize: 13, color: "#cbd5e1", lineHeight: 1.75, marginBottom: 14 }}>{analysis.summary}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>✓ Opportunity</div>
            {analysis.pros?.map((p, i) => <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0f172a" }}>• {p}</div>)}
          </div>
          <div style={{ background: "#1e293b", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>⚠ Risk factors</div>
            {analysis.cons?.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0f172a" }}>• {c}</div>)}
          </div>
        </div>
        {analysis.diligence?.length > 0 && (
          <div style={{ background: "#150c00", border: "1px solid #92400e", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>Due diligence checklist</div>
            {analysis.diligence.map((d, i) => <div key={i} style={{ fontSize: 11, color: "#d97706", padding: "2px 0" }}>□ {d}</div>)}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 10, color: "#334155", textAlign: "center" }}>AI analysis for research only. Verify all comps independently before committing capital.</div>
      </div>
    </div>
  );
}

const TABS = ["All", "993 Turbo S", "964 Carrera RS", "993 Carrera RS", "996 GT2", "Ferrari 365 GT4 BB"];

export default function App() {
  const [tab, setTab] = useState("All");
  const [analyzing, setAnalyzing] = useState(null);
  const [result, setResult] = useState(null);

  const filtered = tab === "All" ? LISTINGS : LISTINGS.filter(l => l.target === tab);
  const targets = tab === "All" ? TABS.slice(1) : [tab];

  const analyze = useCallback(async (listing, priceUSD, landedCost) => {
    setAnalyzing(listing.id);
    const intel = MARKET_INTEL[listing.target];
    try {
      const isAuction = listing.is_auction;
      const priceContext = isAuction
        ? `Auction estimate: €${listing.estimate_low?.toLocaleString()}–€${listing.estimate_high?.toLocaleString()}. No reserve. Mid-estimate landed cost: USD ${landedCost ? Math.round(landedCost).toLocaleString() : "N/A"}`
        : `Purchase price: ${listing.currency} ${listing.price_local?.toLocaleString()} = USD ${priceUSD?.toLocaleString()}. Total US landed cost: USD ${Math.round(landedCost).toLocaleString()}`;

      const prompt = `You are a specialist in European collector car arbitrage with deep knowledge of auction results, grey-market US imports, and the collector car market.

Analyze this opportunity:
Vehicle: ${listing.year} ${listing.make} ${listing.model}
Color: ${listing.color || "Unknown"} | Condition: ${listing.condition}
Mileage: ${listing.mileage_km ? (listing.mileage_km / 1000).toFixed(0) + "k km" : "Unknown"}
Origin: ${listing.country} | Source: ${listing.source}
${priceContext}
Description: ${listing.description}
Flags: ${listing.flags.join(", ")}

${listing.target} market context:
- Only ${intel.production} produced
- Auction/resale avg: $${intel.bat_avg.toLocaleString()} | Floor: $${intel.bat_range_low.toLocaleString()} | Ceiling: $${intel.bat_range_high.toLocaleString()}
- ${intel.notes}
- Watch for: ${intel.watch_for}

Return ONLY a JSON object, no markdown:
{"score":<0-100>,"bat_estimate":"<range like $280k–$340k>","profit_estimate":"<like +$45k or -$20k vs landed>","profit_positive":<bool>,"summary":"<3-4 sentences specific to this car>","pros":["<specific>","<specific>","<specific>"],"cons":["<specific>","<specific>","<specific>"],"diligence":["<item>","<item>","<item>","<item>"]}`;

      // Calls our secure Vercel serverless function — API key never exposed
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "{}";
      const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult({ listing, analysis, priceUSD, landedCost });
    } catch (err) {
      setResult({
        listing, priceUSD, landedCost,
        analysis: { score: 0, bat_estimate: "Error", profit_estimate: "Error", profit_positive: false, summary: "Analysis failed — check that your ANTHROPIC_API_KEY is set in Vercel Environment Variables.", pros: [], cons: ["API error: " + err.message], diligence: [] }
      });
    } finally {
      setAnalyzing(null);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ borderBottom: "1px solid #0f172a", padding: "22px 28px 0", background: "#020817" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#f59e0b", fontWeight: 700, marginBottom: 5 }}>EXOTIC ARBITRAGE INTELLIGENCE</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, color: "#f8fafc" }}>European Scout</h1>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Porsche 993 TS · 964 RS · 993 RS · 996 GT2 · Ferrari 365 GT4 BB</div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {[["12.5%", "EU tariff total"], ["$4–7k", "Avg import costs"], [">25yr", "EPA/DOT exempt"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>{v}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", border: "none", borderRadius: "6px 6px 0 0", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: tab === t ? "#0f172a" : "transparent", color: tab === t ? (ACCENT[t] || "#f1f5f9") : "#475569", borderBottom: tab === t ? `2px solid ${ACCENT[t] || "#f59e0b"}` : "2px solid transparent" }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 28px" }}>
        {targets.map(target => {
          const tListings = filtered.filter(l => l.target === target);
          if (!tListings.length) return null;
          return (
            <div key={target}>
              <IntelCard target={target} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12, marginBottom: 28 }}>
                {tListings.map(l =>
                  l.is_auction
                    ? <AuctionCard key={l.id} listing={l} onAnalyze={analyze} analyzing={analyzing === l.id} />
                    : <ListingCard key={l.id} listing={l} onAnalyze={analyze} analyzing={analyzing === l.id} />
                )}
              </div>
            </div>
          );
        })}
        <div style={{ padding: "14px 18px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
          <strong style={{ color: "#64748b" }}>Notes:</strong> Porsche listings are representative examples based on real current European market pricing. Ferrari 365 GT4 BB is a live Artcurial auction lot (Sale 6480, Lot 5). Import math: 2.5% base duty + 10% EU reciprocal tariff (2026). All vehicles 25+ years old — EPA/DOT exempt. Ferrari timing belt service ($15–25k) should be budgeted separately. Always commission a pre-purchase inspection before committing capital.
        </div>
      </div>
      {result && <Modal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
