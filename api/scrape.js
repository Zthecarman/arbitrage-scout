export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { password, make, model, year_min, year_max } = req.body;
  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword || password !== validPassword) return res.status(401).json({ error: "Invalid password" });

  const q = encodeURIComponent(`${make} ${model}`);
  const qRaw = `${make} ${model}`;
  const yr = year_min || "";
  const yrMax = year_max || (year_min ? year_min + 3 : "");

  // Build direct search URLs for each platform
  const searchLinks = [
    {
      source: "Mobile.de",
      url: `https://suchen.mobile.de/fahrzeuge/search.html?damageUnrepaired=false&isSearchRequest=true&makeModelVariant1.makeId=&query=${q}&yearFrom=${yr}&yearTo=${yrMax}&scopeId=C`,
      flag: "DE",
      description: "Germany - usually cheapest prices"
    },
    {
      source: "AutoScout24",
      url: `https://www.autoscout24.com/lst?sort=price&desc=0&cy=D%2CB%2CNL%2CI%2CF&atype=C&q=${q}&fregfrom=${yr}&fregto=${yrMax}`,
      flag: "EU",
      description: "Pan-European - Germany, Belgium, Netherlands, Italy, France"
    },
    {
      source: "Classic Driver",
      url: `https://www.classicdriver.com/en/cars/search?q=${q}&year_from=${yr}&year_to=${yrMax}&sort=price_asc`,
      flag: "EU",
      description: "Premium European dealers"
    },
    {
      source: "Classic-Trader",
      url: `https://www.classic-trader.com/en/search?q=${encodeURIComponent(qRaw)}&year_from=${yr}&year_to=${yrMax}`,
      flag: "EU",
      description: "Specialist classic car marketplace"
    },
    {
      source: "BringaTrailer",
      url: `https://bringatrailer.com/search/?s=${q}`,
      flag: "US",
      description: "US auction results and active listings"
    },
    {
      source: "Collecting Cars",
      url: `https://collectingcars.com/for-sale/?search=${q}`,
      flag: "UK",
      description: "UK - strong European inventory"
    }
  ];

  return res.status(200).json({ searchLinks });
}
