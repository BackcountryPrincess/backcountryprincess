export function chartDataForWeather(days = []) {
  const sorted = days.slice().sort((a, b) => String(a.observation_date).localeCompare(String(b.observation_date)));
  return {
    seasonalWindow: {
      startDate: sorted[0] ? sorted[0].observation_date : null,
      endDate: sorted[sorted.length - 1] ? sorted[sorted.length - 1].observation_date : null
    },
    candlestickHighsLows: sorted.map((day) => ({
      date: day.observation_date,
      low: numeric(day.temp_min),
      high: numeric(day.temp_max),
      open: numeric(day.temp_min),
      close: numeric(day.temp_max)
    })),
    freezeThawStreaks: freezeThawStreaks(sorted),
    zeroCReferenceLine: sorted.map((day) => ({ date: day.observation_date, value: 0 })),
    precipitationOverlay: sorted.map((day) => ({
      date: day.observation_date,
      precipitation: numeric(day.precipitation),
      snowDepth: numeric(day.snow_depth)
    })),
    yearOverYear: yearOverYear(sorted)
  };
}

function numeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function freezeThawStreaks(days) {
  const streaks = [];
  let current = [];
  days.forEach((day) => {
    if (Boolean(day.freeze_thaw)) {
      current.push(day);
      return;
    }
    if (current.length) streaks.push(streakFrom(current));
    current = [];
  });
  if (current.length) streaks.push(streakFrom(current));
  return streaks;
}

function streakFrom(items) {
  return {
    startDate: items[0].observation_date,
    endDate: items[items.length - 1].observation_date,
    days: items.length
  };
}

function yearOverYear(days) {
  const grouped = new Map();
  days.forEach((day) => {
    const date = new Date(`${day.observation_date}T00:00:00Z`);
    const year = date.getUTCFullYear();
    const dayOfSeason = Math.floor((date - Date.UTC(year, 0, 1)) / 86400000) + 1;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push({
      dayOfSeason,
      date: day.observation_date,
      tempMin: numeric(day.temp_min),
      tempMax: numeric(day.temp_max),
      sapScore: numeric(day.sap_score)
    });
  });
  return Array.from(grouped.entries()).map(([year, values]) => ({ year, values }));
}
