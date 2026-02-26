import React, { useEffect, useMemo, useState } from "react";

const TIERS = [
  { key: "SAP_WATCH",   label: "SAP Watch",   rank: 1 },
  { key: "SAP_PLANNER", label: "SAP Planner", rank: 2 },
  { key: "SAP_PRO",     label: "SAP Pro",     rank: 3 },
];

const DEFAULT_LOCATION = { name: "Sudbury, ON", lat: 46.49, lon: -81.01 };

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function computeSapIndex(minC, maxC, solarKwhM2) {
  const freezeThaw = minC < 0 && maxC > 0 ? 40 : 0;
  const thaw = maxC > 0 ? clamp(maxC * 6, 0, 30) : 0;
  const solar = clamp((solarKwhM2 || 0) * 2.5, 0, 30);
  return Math.round(clamp(freezeThaw + thaw + solar, 0, 100));
}

function sapLabel(score) {
  if (score >= 70) return "🟢 Prime Flow";
  if (score >= 40) return "🟡 Good Flow";
  if (score >= 15) return "🟠 Low Flow";
  return "🔴 No Flow";
}

export default function App() {
  const [location] = useState(DEFAULT_LOCATION);
  const [weatherRows, setWeatherRows] = useState([]);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [member, setMember] = useState(null);

  const tierRank = useMemo(() => {
    const found = TIERS.find((t) => t.key === member?.tierKey);
    return found?.rank || 0;
  }, [member]);

  // How many rows to show based on tier
  // 0 = not logged in = today only
  // 1 = SAP Watch = today only
  // 2+ = SAP Planner = full 7 days
  const visibleRows = tierRank >= 2 ? weatherRows : weatherRows.slice(0, 1);

  const s = {
    page: { minHeight: "100vh", backgroundColor: "#0b0b0b", color: "#fff", padding: "40px", fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
    h1: { fontSize: "42px", margin: "0 0 16px 0" },
    sub: { opacity: 0.9, margin: "0 0 18px 0" },
    row: { display: "flex", gap: "10px", flexWrap: "wrap", margin: "10px 0 18px 0" },
    btn: { appearance: "none", border: "1px solid #fff", background: "transparent", color: "#fff", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" },
    btnSolid: { appearance: "none", border: "1px solid #fff", background: "#fff", color: "#0b0b0b", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: 700 },
    sectionTitle: { fontSize: "26px", margin: "22px 0 10px 0" },
    table: { width: "100%", maxWidth: "900px", borderCollapse: "collapse", marginTop: "10px" },
    th: { textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.25)", padding: "10px 8px", fontWeight: 700, fontSize: "14px" },
    td: { borderBottom: "1px solid rgba(255,255,255,0.15)", padding: "10px 8px", fontSize: "14px" },
    upsell: { marginTop: "16px", padding: "14px 18px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", maxWidth: "600px", fontSize: "14px", opacity: 0.9 },
    cardRow: { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" },
    card: { border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", padding: "12px", width: "240px" },
    badge: { display: "inline-block", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", marginBottom: "10px" },
    locked: { opacity: 0.5 },
    ok: { opacity: 1 },
    err: { color: "#ffb4b4" },
  };

  async function refreshPatreonStatus() {
    setAuthLoading(true);
    try {
      const res = await fetch("/patreon/status.php", { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data?.level && data.level !== "none") {
        const levelMap = { watch: "SAP_WATCH", planner: "SAP_PLANNER", pro: "SAP_PRO" };
        const labelMap = { watch: "SAP Watch", planner: "SAP Planner", pro: "SAP Pro" };
        setMember({ loggedIn: true, tierKey: levelMap[data.level], tierLabel: labelMap[data.level] });
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadWeather() {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const url = "https://api.open-meteo.com/v1/forecast"
        + `?latitude=${location.lat}&longitude=${location.lon}`
        + "&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,shortwave_radiation_sum"
        + "&timezone=America%2FToronto";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const d = json?.daily;
      if (!d?.time?.length) throw new Error("No data");
      setWeatherRows(d.time.slice(0, 7).map((date, i) => ({
        date, minC: d.temperature_2m_min[i], maxC: d.temperature_2m_max[i],
        precip: d.precipitation_sum[i], solar: d.shortwave_radiation_sum[i],
        sap: computeSapIndex(d.temperature_2m_min[i], d.temperature_2m_max[i], d.shortwave_radiation_sum[i]),
      })));
    } catch (e) {
      setWeatherError(String(e?.message || e));
    } finally {
      setWeatherLoading(false);
    }
  }

  useEffect(() => { loadWeather(); refreshPatreonStatus(); }, []);

  function TierCard({ tier }) {
    const unlocked = tierRank >= tier.rank;
    return (
      <div style={{ ...s.card, ...(unlocked ? s.ok : s.locked) }}>
        <div style={s.badge}>{tier.label} {unlocked ? "✓ Unlocked" : "— Locked"}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
          {tier.rank === 1 && <div>Today's forecast<br />+ Sap Index score</div>}
          {tier.rank === 2 && <div>Full 7-day forecast<br />+ daily Sap Index</div>}
          {tier.rank === 3 && <div>Full analytics<br />+ historical comparison<br />+ custom alerts</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Maple Sap Predictor</h1>
      <p style={s.sub}>Location: {location.name} ({location.lat}, {location.lon})</p>

      <div style={s.row}>
        <button style={s.btnSolid} onClick={() => window.location.href = "/patreon/login.php"} type="button">
          Login with Patreon
        </button>
        <button style={s.btn} onClick={refreshPatreonStatus} type="button">
          Refresh Status
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        {authLoading ? <span style={{ opacity: 0.7 }}>Checking status...</span>
          : member?.loggedIn ? <span>✓ Logged in — {member.tierLabel}</span>
          : <span style={{ opacity: 0.7 }}>Not logged in.</span>}
      </div>

      <div style={s.cardRow}>
        {TIERS.map((t) => <TierCard key={t.key} tier={t} />)}
      </div>

      <h2 style={s.sectionTitle}>
        {tierRank >= 2 ? "7-Day Forecast + Sap Index" : "Today's Forecast + Sap Index"}
      </h2>

      {weatherLoading ? <div style={{ opacity: 0.7 }}>Loading weather...</div>
        : weatherError ? <div style={s.err}>Error: {weatherError}</div>
        : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Min (°C)</th>
                  <th style={s.th}>Max (°C)</th>
                  <th style={s.th}>Precip (mm)</th>
                  <th style={s.th}>Solar (kWh/m²)</th>
                  <th style={s.th}>Sap Index</th>
                  <th style={s.th}>Conditions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.date}>
                    <td style={s.td}>{r.date}</td>
                    <td style={s.td}>{Number.isFinite(r.minC) ? r.minC.toFixed(1) : "-"}</td>
                    <td style={s.td}>{Number.isFinite(r.maxC) ? r.maxC.toFixed(1) : "-"}</td>
                    <td style={s.td}>{Number.isFinite(r.precip) ? r.precip.toFixed(1) : "-"}</td>
                    <td style={s.td}>{Number.isFinite(r.solar) ? r.solar.toFixed(2) : "-"}</td>
                    <td style={s.td}><strong>{Number.isFinite(r.sap) ? r.sap : "-"}</strong></td>
                    <td style={s.td}>{Number.isFinite(r.sap) ? sapLabel(r.sap) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tierRank < 2 && (
              <div style={s.upsell}>
                🍁 <strong>Want the full 7-day outlook?</strong><br />
                Upgrade to <strong>SAP Planner ($25/mo)</strong> to unlock the complete weekly forecast and plan your harvest runs.{" "}
                <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => window.location.href = "/patreon/login.php"}>
                  Subscribe on Patreon →
                </span>
              </div>
            )}
          </>
        )}

      <div style={{ opacity: 0.6, marginTop: "20px", fontSize: "13px" }}>
        Sap Index 0–100 · freeze/thaw + solar model · Sudbury, ON
      </div>
    </div>
  );
}
