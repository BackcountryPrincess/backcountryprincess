import React, { useEffect, useMemo, useState } from "react";

const TIERS = [
  { key: "SAP_WATCH",   label: "SAP Watch",   rank: 1 },
  { key: "SAP_PLANNER", label: "SAP Planner", rank: 2 },
  { key: "SAP_PRO",     label: "SAP Pro",     rank: 3 },
];

const DEFAULT_LOCATION = {
  name: "Sudbury, ON",
  lat: 46.49,
  lon: -81.01,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function computeSapIndex(minC, maxC, solarKwhM2) {
  const freezeThaw = minC < 0 && maxC > 0 ? 40 : 0;
  const thaw = maxC > 0 ? clamp(maxC * 6, 0, 30) : 0;
  const solar = clamp((solarKwhM2 || 0) * 2.5, 0, 30);
  return Math.round(clamp(freezeThaw + thaw + solar, 0, 100));
}

export default function App() {
  const [location] = useState(DEFAULT_LOCATION);
  const [weatherRows, setWeatherRows] = useState([]);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [member, setMember] = useState(null);

  const tierRank = useMemo(() => {
    const found = TIERS.find((t) => t.key === member?.tierKey);
    return found?.rank || 0;
  }, [member]);

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#0b0b0b",
      color: "#ffffff",
      padding: "40px",
      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    },
    h1: { fontSize: "42px", margin: "0 0 16px 0" },
    sub: { opacity: 0.9, margin: "0 0 18px 0" },
    row: { display: "flex", gap: "10px", flexWrap: "wrap", margin: "10px 0 18px 0" },
    btn: {
      appearance: "none", border: "1px solid #ffffff", background: "transparent",
      color: "#ffffff", padding: "6px 10px", borderRadius: "4px", cursor: "pointer",
      fontFamily: "inherit", fontSize: "14px",
    },
    btnSolid: {
      appearance: "none", border: "1px solid #ffffff", background: "#ffffff",
      color: "#0b0b0b", padding: "6px 10px", borderRadius: "4px", cursor: "pointer",
      fontFamily: "inherit", fontSize: "14px", fontWeight: 700,
    },
    sectionTitle: { fontSize: "26px", margin: "22px 0 10px 0" },
    table: { width: "100%", maxWidth: "820px", borderCollapse: "collapse", marginTop: "10px" },
    th: { textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.25)", padding: "10px 8px", fontWeight: 700, fontSize: "14px" },
    td: { borderBottom: "1px solid rgba(255,255,255,0.15)", padding: "10px 8px", fontSize: "14px" },
    note: { opacity: 0.85, marginTop: "14px", maxWidth: "820px" },
    cardRow: { display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" },
    card: { border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", padding: "12px", width: "260px" },
    badge: { display: "inline-block", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", opacity: 0.95, marginBottom: "10px" },
    locked: { opacity: 0.6 },
    ok: { opacity: 0.95 },
    err: { color: "#ffb4b4" },
  };

  function loginWithPatreon() {
    window.location.href = "/patreon/login.php";
  }

  async function refreshPatreonStatus() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/patreon/status.php", { credentials: "include" });
      if (!res.ok) throw new Error(`Status HTTP ${res.status}`);
      const data = await res.json();
      // data.level = 'none' | 'watch' | 'planner' | 'pro'
      if (data?.level && data.level !== "none") {
        const levelMap = { watch: "SAP_WATCH", planner: "SAP_PLANNER", pro: "SAP_PRO" };
        const labelMap = { watch: "SAP Watch", planner: "SAP Planner", pro: "SAP Pro" };
        setMember({ loggedIn: true, tierKey: levelMap[data.level], tierLabel: labelMap[data.level] });
      } else {
        setMember(null);
      }
    } catch (e) {
      setMember(null);
      setAuthError("Patreon status endpoint not responding yet.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadWeather() {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(location.lat)}` +
        `&longitude=${encodeURIComponent(location.lon)}` +
        "&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,shortwave_radiation_sum" +
        "&timezone=America%2FToronto";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
      const json = await res.json();
      const d = json?.daily;
      if (!d?.time?.length) throw new Error("Weather payload missing daily.time");
      const rows = d.time.map((date, i) => ({
        date,
        minC: d.temperature_2m_min?.[i],
        maxC: d.temperature_2m_max?.[i],
        precip: d.precipitation_sum?.[i],
        solar: d.shortwave_radiation_sum?.[i],
        sap: computeSapIndex(d.temperature_2m_min?.[i], d.temperature_2m_max?.[i], d.shortwave_radiation_sum?.[i]),
      }));
      setWeatherRows(rows.slice(0, 7));
    } catch (e) {
      setWeatherError(String(e?.message || e));
      setWeatherRows([]);
    } finally {
      setWeatherLoading(false);
    }
  }

  useEffect(() => {
    loadWeather();
    refreshPatreonStatus();
  }, []);

  function TierCard({ tier }) {
    const unlocked = tierRank >= tier.rank;
    return (
      <div style={{ ...styles.card, ...(unlocked ? styles.ok : styles.locked) }}>
        <div style={styles.badge}>{tier.label} {unlocked ? "- Unlocked" : "- Locked"}</div>
        <div style={{ fontSize: "14px", lineHeight: 1.35 }}>
          {tier.rank === 1 && <div>Basic access.<br />- Forecast + Sap Index<br />- General notes</div>}
          {tier.rank === 2 && <div>Mid access.<br />- Everything in SAP Watch<br />- Extended details</div>}
          {tier.rank === 3 && <div>Premium access.<br />- Everything in SAP Planner<br />- Advanced model tuning</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Maple Sap Predictor</h1>
      <p style={styles.sub}>Location: {location.name} ({location.lat}, {location.lon})</p>

      <div style={styles.row}>
        <button style={styles.btnSolid} onClick={loginWithPatreon} type="button">
          Login with Patreon
        </button>
        <button style={styles.btn} onClick={refreshPatreonStatus} type="button">
          Refresh Patreon Status
        </button>
      </div>

      <div style={{ marginTop: "6px" }}>
        {authLoading ? (
          <div style={{ opacity: 0.85 }}>Checking Patreon status...</div>
        ) : member?.loggedIn ? (
          <div style={{ opacity: 0.95 }}>Logged in. Tier: {member?.tierLabel || "Unknown"}</div>
        ) : (
          <div style={{ opacity: 0.85 }}>Not logged in.</div>
        )}
        {authError ? <div style={styles.err}>{authError}</div> : null}
      </div>

      <div style={styles.cardRow}>
        {TIERS.map((t) => <TierCard key={t.key} tier={t} />)}
      </div>

      <h2 style={styles.sectionTitle}>7-Day Forecast + Sap Index</h2>

      {weatherLoading ? (
        <div style={{ opacity: 0.85 }}>Loading live weather...</div>
      ) : weatherError ? (
        <div style={styles.err}>Weather error: {weatherError}</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Min (C)</th>
              <th style={styles.th}>Max (C)</th>
              <th style={styles.th}>Precip (mm)</th>
              <th style={styles.th}>Solar (kWh/m2)</th>
              <th style={styles.th}>Sap Index</th>
            </tr>
          </thead>
          <tbody>
            {weatherRows.map((r) => (
              <tr key={r.date}>
                <td style={styles.td}>{r.date}</td>
                <td style={styles.td}>{Number.isFinite(r.minC) ? r.minC.toFixed(1) : "-"}</td>
                <td style={styles.td}>{Number.isFinite(r.maxC) ? r.maxC.toFixed(1) : "-"}</td>
                <td style={styles.td}>{Number.isFinite(r.precip) ? r.precip.toFixed(1) : "-"}</td>
                <td style={styles.td}>{Number.isFinite(r.solar) ? r.solar.toFixed(2) : "-"}</td>
                <td style={styles.td}>{Number.isFinite(r.sap) ? r.sap : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={styles.note}>
        Sap Index is a baseline score (0-100) driven by freeze/thaw + solar.
      </div>
    </div>
  );
}
