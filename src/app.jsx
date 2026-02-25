import { useEffect, useState } from "react";

const DEFAULT = {
  // Sudbury-ish default - change later if you want
  name: "Sudbury, ON",
  lat: 46.49,
  lon: -81.01,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Simple, transparent “Sap Flow Index” (0-100) based on freeze/thaw + solar
// This is NOT “the” physics model yet - it’s a working baseline that we can tune.
function computeSapIndex({ tMin, tMax, solar }) {
  // Freeze-thaw score:
  // - best when min <= -2C and max >= +3C
  // - taper outside that window
  const freezeScore = clamp(((-2 - tMin) / 6), 0, 1);     // tMin <= -2 boosts
  const thawScore = clamp(((tMax - 3) / 7), 0, 1);        // tMax >= 3 boosts
  const ft = freezeScore * thawScore;                     // must have both

  // Solar contribution (kWh/m²/day typical range ~0-6 in winter/spring)
  const solarScore = clamp((solar / 5), 0, 1);

  // Weighted blend (freeze/thaw dominates)
  const idx = (ft * 0.75 + solarScore * 0.25) * 100;

  return Math.round(idx);
}

export default function App() {
  const [loc] = useState(DEFAULT);
  const [status, setStatus] = useState("Loading weather...");
  const [days, setDays] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setStatus("Loading weather...");

      // Open-Meteo - no API key
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(loc.lat)}` +
        `&longitude=${encodeURIComponent(loc.lon)}` +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum" +
        "&temperature_unit=celsius" +
        "&timezone=America%2FToronto";

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const d = json?.daily;
        if (!d?.time?.length) throw new Error("No daily data returned");

        const rows = d.time.map((date, i) => {
          const tMin = d.temperature_2m_min?.[i];
          const tMax = d.temperature_2m_max?.[i];
          const precip = d.precipitation_sum?.[i];
          const solar = d.shortwave_radiation_sum?.[i];

          const sapIndex = computeSapIndex({ tMin, tMax, solar });

          return {
            date,
            tMin,
            tMax,
            precip,
            solar,
            sapIndex,
          };
        });

        if (cancelled) return;
        setDays(rows);
        setStatus("Live weather loaded.");
      } catch (e) {
        if (cancelled) return;
        setError(String(e?.message || e));
        setStatus("Failed to load weather.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lon]);

  return (
    <div style={{ padding: 40, color: "white", background: "black", minHeight: "100vh" }}>
      <h1 style={{ marginTop: 0 }}>Maple Sap Predictor</h1>

      <p style={{ marginTop: 0 }}>
        Location: {loc.name} ({loc.lat}, {loc.lon})
      </p>

      <p>{status}</p>
      {error ? <p style={{ color: "#ff8a8a" }}>Error: {error}</p> : null}

      {days.length ? (
        <div style={{ marginTop: 24 }}>
          <h2>7-Day Forecast + Sap Index</h2>

          <div style={{ overflowX: "auto" }}>
            <table cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th align="left">Date</th>
                  <th align="right">Min (C)</th>
                  <th align="right">Max (C)</th>
                  <th align="right">Precip (mm)</th>
                  <th align="right">Solar (kWh/m2)</th>
                  <th align="right">Sap Index</th>
                </tr>
              </thead>
              <tbody>
                {days.slice(0, 7).map((r) => (
                  <tr key={r.date} style={{ borderBottom: "1px solid #222" }}>
                    <td>{r.date}</td>
                    <td align="right">{Number.isFinite(r.tMin) ? r.tMin.toFixed(1) : "-"}</td>
                    <td align="right">{Number.isFinite(r.tMax) ? r.tMax.toFixed(1) : "-"}</td>
                    <td align="right">{Number.isFinite(r.precip) ? r.precip.toFixed(1) : "-"}</td>
                    <td align="right">{Number.isFinite(r.solar) ? r.solar.toFixed(2) : "-"}</td>
                    <td align="right">{r.sapIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 14, opacity: 0.8 }}>
            Sap Index is a baseline score (0-100) driven by freeze/thaw + solar. We’ll tune the model next.
          </p>
        </div>
      ) : null}
    </div>
  );
}
