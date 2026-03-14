import { useState } from "react";

const FX = { EUR: 1.09, GBP: 1.27, JPY: 0.0067, CHF: 1.11 };
const fmt = n => "$" + Math.round(n).toLocaleString();
const fmtK = n => n >= 1000000 ? "$" + (n/1000000).toFixed(2) + "M" : "$" + Math.round(n/1000) + "k";

const IMPORT_COSTS = {
  shipping: 2750, duty: 0.025, reciprocal: 0.10,
  hmf: 0.00125, mpf: 0.003464, broker: 900, inland: 1200, prep: 600
};

function calcLanded(priceUSD) {
  const duty = Math.round(priceUSD * IMPORT_COSTS.duty);
  const recip = Math.round(priceUSD * IMPORT_COSTS.reciprocal);
  const hmf = Math.round(priceUSD * IMPORT_COSTS.hmf);
  const mpf = Math.min(Math.max(Math.round(priceUSD * IMPORT_COSTS.mpf), 34), 652);
  const importTotal = IMPORT_COSTS.shipping + duty + recip + hmf + mpf + IMPORT_COSTS.broker + IMPORT_COSTS.inland + IMPORT_COSTS.prep;
  return { priceUSD, importTotal, landed: priceUSD + importTotal, duty, recip, hmf, mpf };
}

const EXAMPLE_SEARCHES = [
  "1995 Ferrari F355 Berlinetta",
  "1998 Porsche 911 Carrera 4S",
  "2001 BMW M3 E46",
  "1994 Honda NSX",
  "1997 Lamborghini Diablo SV",
  "1999 Porsche 911 GT3",
];

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  async function tryUnlock() {
    const resp = await fetch("/api/analyze", {
      method: "POST",
