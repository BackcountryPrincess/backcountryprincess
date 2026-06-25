// MapleSAP Forecast Engine V1 — Three-Ring Scoring
// Computes Ring 1 (Conditions), Ring 2 (Flow Strength), Ring 3 (Flow Status),
// and the composite Maple Score for each enriched day object.

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ── RING 1: CONDITIONS ────────────────────────────────────────────────────────
// Gated by freeze/thaw. If freeze/thaw is absent, ring = 0 (no flow possible).
// When gate passes: base + solar + sun exposure + swing bonus.
// Range: 0–100
export function scoreRing1(day) {
  if (!day.freeze_thaw) return 0;

  const solar    = day.solar_strength    ?? 0;  // 0–1
  const sun      = day.sun_exposure      ?? 0;  // 0–1
  const swing    = day.temperature_swing ?? 0;  // °C

  // Swing bonus: normalize against a 15°C ideal swing
  const swingNorm = clamp(swing / 15, 0, 1);

  const score =
    25                   // base: freeze-thaw confirmed
    + solar  * 40        // solar radiation up to +40
    + sun    * 25        // sunshine fraction up to +25
    + swingNorm * 10;    // swing quality up to +10

  return Math.round(clamp(score, 0, 100));
}

// ── RING 2: FLOW STRENGTH ─────────────────────────────────────────────────────
// Temperature swing and solar drive the physical force behind flow.
// Streak momentum amplifies when conditions have been good for several days.
// Soil moisture modifies (±5).
// Range: 0–100
export function scoreRing2(day) {
  // Gate: no freeze/thaw means no sap flow; Ring 2 cannot contribute to Maple Score.
  if (!day.freeze_thaw) return 0;

  const swing    = day.temperature_swing  ?? 0;
  const solar    = day.solar_strength     ?? 0;  // 0–1
  const sun      = day.sun_exposure       ?? 0;  // 0–1
  const posStreak = day.positive_streak   ?? 0;

  // Normalize swing: ideal is 15°C+ (0–1)
  const swingNorm = clamp(swing / 15, 0, 1);

  // Streak momentum: each consecutive freeze-thaw day adds energy
  // Capped at 5 days contributing (beyond that, gains diminish)
  const streakBonus = clamp(posStreak / 5, 0, 1);

  let score =
    swingNorm  * 40
    + solar    * 25
    + sun      * 20
    + streakBonus * 15;

  // Soil moisture modifier (±5)
  const moisture = day.soil_moisture_state;
  if (moisture === 'saturated') score += 5;
  else if (moisture === 'dry')  score -= 5;

  return Math.round(clamp(score, 0, 100));
}

// ── RING 3: FLOW STATUS ───────────────────────────────────────────────────────
// Seasonal and environmental context. Where are we in the season?
// Snowpack, soil temperature, and streak history set the macro picture.
// Range: 0–100
export function scoreRing3(day) {
  // Gate: no freeze/thaw means no sap flow; Ring 3 cannot contribute to Maple Score.
  if (!day.freeze_thaw) return 0;

  const seasonPct  = (day.season_progression ?? 5) / 100;  // 0–1
  const posStreak  = day.positive_streak  ?? 0;
  const negStreak  = day.negative_streak  ?? 0;

  // Base: season progression is the dominant factor here
  let score = seasonPct * 50;

  // Snowpack bonus: snowpack indicates early/mid season with ground water reserve
  const snowpack = day.snowpack_state;
  if (snowpack === 'deep')     score += 20;
  else if (snowpack === 'moderate') score += 15;
  else if (snowpack === 'light')    score += 8;
  // bare = no bonus

  // Soil thaw bonus: thawing soil is ideal; frozen = too early; warm = too late
  const soilThaw = day.soil_thaw_state;
  if (soilThaw === 'thawing')  score += 15;
  else if (soilThaw === 'thawed')  score += 10;
  else if (soilThaw === 'frozen')  score += 0;
  else if (soilThaw === 'warm')    score -= 10;  // bud break risk

  // Streak bonuses/penalties
  // Positive streak: active season momentum
  score += clamp(posStreak, 0, 3) * 5;  // up to +15 for 3+ day run

  // Negative streak: season approaching end
  score -= clamp(negStreak, 0, 3) * 8;  // up to −24 for 3+ too-warm days

  return Math.round(clamp(score, 0, 100));
}

// ── MAPLE SCORE (CENTER) ─────────────────────────────────────────────────────
// Composite of all three rings weighted by biological importance.
// Ring 1 (Conditions) dominates: if gate fails, all output is depressed.
export function mapleScore(ring1, ring2, ring3) {
  return Math.round(ring1 * 0.40 + ring2 * 0.35 + ring3 * 0.25);
}

/**
 * Score a single enriched day object (output of deriveFeatures).
 * Returns all four scores.
 */
export function scoreDay(day) {
  const ring1 = scoreRing1(day);
  const ring2 = scoreRing2(day);
  const ring3 = scoreRing3(day);
  const maple = mapleScore(ring1, ring2, ring3);
  return { ring1, ring2, ring3, maple };
}
