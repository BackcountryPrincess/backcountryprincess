# MapleSAP Forecast Engine V1

Isolated forecast module implementing the MapleSAP three-ring biological model.

**Status:** Standalone, validated. Does not replace or modify any existing production code.

---

## Files

| File | Purpose |
|---|---|
| `fetch.js` | Open-Meteo data acquisition (daily + hourly fields, aggregation) |
| `features.js` | Biological/meteorological feature derivation |
| `rings.js` | Ring 1 / Ring 2 / Ring 3 scoring + Maple Score composite |
| `index.js` | Main entry point — `runForecastEngine()` |
| `validate.js` | Live validation runner — fetches real data and prints 7-day table |

---

## Usage

```javascript
import { runForecastEngine } from './src/forecast-engine-v1/index.js';

const forecast = await runForecastEngine({
  latitude:    46.57,
  longitude:  -81.32,
  forecastDays: 7,
});
// Returns array of ForecastDay objects (see index.js)
```

Run live validation:
```
node src/forecast-engine-v1/validate.js
```

---

## The Three-Ring Model

### Ring 1 — CONDITIONS (gate ring)

Binary gate: if `temp_min < 0 AND temp_max > 0`, ring proceeds. Otherwise ring = 0.

When open: `25 + solar_strength×40 + sun_exposure×25 + (swing/15)×10`

### Ring 2 — FLOW STRENGTH

Physical energy of sap flow. Not gated — reports raw conditions.

`(swing/15)×40 + solar×25 + sun×20 + streak_bonus×15 ± soil_moisture 5`

### Ring 3 — FLOW STATUS

Season context. Where are we in the maple calendar?

`season_progression×50 + snowpack_bonus + soil_thaw_bonus + streak_bonus − neg_streak_penalty`

### Maple Score

`round(ring1 × 0.40 + ring2 × 0.35 + ring3 × 0.25)`

---

## Feature Definitions

| Feature | Source | Notes |
|---|---|---|
| `freeze_thaw` | temp_min < 0 AND temp_max > 0 | Biological gate |
| `temperature_swing` | temp_max − temp_min | °C |
| `solar_strength` | shortwave_radiation_sum / 20 | 0–1, ceiling 20 MJ/m² |
| `sun_exposure` | sunshine_duration / daylight_duration | 0–1 fraction |
| `positive_streak` | consecutive freeze-thaw days | resets on warm or neutral |
| `negative_streak` | consecutive days where temp_max ≥ 10°C | season-end signal |
| `season_progression` | bell curve peaking Mar 15 (day 74) | 0–100; off-season = 5 |
| `soil_thaw_state` | soil_temperature_0cm | frozen/thawing/thawed/warm |
| `soil_moisture_state` | soil_moisture_0_to_1cm (m³/m³) | dry/moist/saturated |
| `snowpack_state` | snow_depth (m) | bare/light/moderate/deep |

---

## Live Validation Result (2026-06-15, Levack Ontario)

```
Date       | Cond | FlStr | FlSt | MAPLE |  F/T  | Swing | Solar | Sun  | Snow   | Soil  | Moist
2026-06-15 |    0 |    69 |    0 |    24 |  no   | 12.3° |  100% |  82% |  0 cm  | 14.6° |  dry
2026-06-16 |    0 |    52 |    0 |    18 |  no   | 10.1° |   92% |  33% |  0 cm  | 17.1° |  dry
2026-06-17 |    0 |    48 |    0 |    17 |  no   |  8.5° |   80% |  53% |  0 cm  | 16.6° |  dry
2026-06-18 |    0 |    50 |    0 |    18 |  no   |  9.6° |   59% |  46% |  0 cm  | 14.5° | moist
2026-06-19 |    0 |    72 |    0 |    25 |  no   | 12.1° |  100% |  76% |  0 cm  | 15.8° | moist
2026-06-20 |    0 |    68 |    0 |    24 |  no   | 10.9° |  100% |  96% |  0 cm  | 15.4° |  dry
2026-06-21 |    0 |    77 |    0 |    27 |  no   | 13.9° |  100% |  98% |  0 cm  | 15.6° |  dry
```

**Interpretation:** It is mid-June — deep off-season. No freeze/thaw for the next 7 days. Ring 1 (Conditions) correctly scores 0 on all days — the gate is closed. Ring 3 (Flow Status) correctly scores 0 — bare snowpack, warm soil, low season progression. The engine is behaving correctly for a summer off-season forecast.

Ring 2 (Flow Strength) shows non-zero because it intentionally runs ungated, reporting the atmospheric conditions independently of the sap-season gate. This is by design — it will provide meaningful signal when season transitions are being evaluated.

---

## Data Source

Open-Meteo Forecast API: `https://api.open-meteo.com/v1/forecast`

Daily fields: `weather_code, temperature_2m_max/min/mean, sunrise, sunset, daylight_duration, sunshine_duration, precipitation_sum, snowfall_sum, shortwave_radiation_sum`

Hourly fields (aggregated to daily means): `temperature_2m, cloud_cover, snow_depth, soil_temperature_0cm, soil_temperature_6cm, soil_moisture_0_to_1cm, soil_moisture_1_to_3cm, shortwave_radiation`
