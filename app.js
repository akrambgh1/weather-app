// SkyCast — weather app powered by the free Open-Meteo API (no API key needed)

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const RECENT_KEY = "skycast:recent";
const UNIT_KEY = "skycast:unit";
const MAX_RECENT = 5;

// WMO weather codes -> description, day icon, night icon, background theme
const WEATHER_CODES = {
  0:  ["Clear sky", "☀️", "🌙", "clear"],
  1:  ["Mainly clear", "🌤️", "🌙", "clear"],
  2:  ["Partly cloudy", "⛅", "☁️", "cloudy"],
  3:  ["Overcast", "☁️", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "🌫️", "cloudy"],
  48: ["Rime fog", "🌫️", "🌫️", "cloudy"],
  51: ["Light drizzle", "🌦️", "🌧️", "rain"],
  53: ["Drizzle", "🌦️", "🌧️", "rain"],
  55: ["Heavy drizzle", "🌧️", "🌧️", "rain"],
  56: ["Freezing drizzle", "🌧️", "🌧️", "rain"],
  57: ["Freezing drizzle", "🌧️", "🌧️", "rain"],
  61: ["Light rain", "🌦️", "🌧️", "rain"],
  63: ["Rain", "🌧️", "🌧️", "rain"],
  65: ["Heavy rain", "🌧️", "🌧️", "rain"],
  66: ["Freezing rain", "🌧️", "🌧️", "rain"],
  67: ["Freezing rain", "🌧️", "🌧️", "rain"],
  71: ["Light snow", "🌨️", "🌨️", "snow"],
  73: ["Snow", "🌨️", "🌨️", "snow"],
  75: ["Heavy snow", "❄️", "❄️", "snow"],
  77: ["Snow grains", "🌨️", "🌨️", "snow"],
  80: ["Rain showers", "🌦️", "🌧️", "rain"],
  81: ["Rain showers", "🌧️", "🌧️", "rain"],
  82: ["Violent showers", "⛈️", "⛈️", "storm"],
  85: ["Snow showers", "🌨️", "🌨️", "snow"],
  86: ["Snow showers", "❄️", "❄️", "snow"],
  95: ["Thunderstorm", "⛈️", "⛈️", "storm"],
  96: ["Thunderstorm, hail", "⛈️", "⛈️", "storm"],
  99: ["Thunderstorm, hail", "⛈️", "⛈️", "storm"],
};

const $ = (id) => document.getElementById(id);

const state = {
  unit: load(UNIT_KEY, "celsius"),
  place: null,       // { name, admin1, country, latitude, longitude }
  suggestions: [],
  activeIndex: -1,
};

// ---------- storage helpers (fail safely in private mode) ----------
function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---------- API ----------
async function searchCities(query) {
  const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("City search failed");
  const data = await res.json();
  return data.results || [];
}

async function fetchForecast({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: 7,
    temperature_unit: state.unit,
    wind_speed_unit: state.unit === "fahrenheit" ? "mph" : "kmh",
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error("Could not load the forecast");
  return res.json();
}

// ---------- rendering ----------
function describe(code, isDay = 1) {
  const [text, dayIcon, nightIcon, theme] = WEATHER_CODES[code] || ["Unknown", "🌡️", "🌡️", "cloudy"];
  return { text, icon: isDay ? dayIcon : nightIcon, theme };
}

function setStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", isError);
}

const timeOf = (iso) => iso.slice(11, 16); // "2026-10-23T14:00" -> "14:00"
const round = (n) => Math.round(n);

function render(data) {
  const { current, hourly, daily } = data;
  const deg = "°";
  const now = describe(current.weather_code, current.is_day);

  const p = state.place;
  $("place").textContent = [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, p.country]
    .filter(Boolean).join(", ");
  $("localTime").textContent = `Local time ${timeOf(current.time)} · ${data.timezone_abbreviation}`;
  $("currentIcon").textContent = now.icon;
  $("currentTemp").textContent = `${round(current.temperature_2m)}${deg}`;
  $("currentDesc").textContent = now.text;
  $("feelsLike").textContent = `${round(current.apparent_temperature)}${deg}`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${round(current.wind_speed_10m)} ${state.unit === "fahrenheit" ? "mph" : "km/h"}`;
  $("sun").textContent = `${timeOf(daily.sunrise[0])} / ${timeOf(daily.sunset[0])}`;

  document.body.dataset.theme =
    now.theme === "clear" ? (current.is_day ? "clear-day" : "clear-night") : now.theme;

  // Next 24 hours, starting at the current hour
  const startHour = current.time.slice(0, 13) + ":00";
  let start = hourly.time.findIndex((t) => t >= startHour);
  if (start < 0) start = 0;
  $("hourly").innerHTML = hourly.time.slice(start, start + 24).map((t, i) => {
    const idx = start + i;
    const w = describe(hourly.weather_code[idx], hourly.is_day[idx]);
    const rain = hourly.precipitation_probability[idx];
    return `
      <div class="hour" title="${w.text}">
        <span class="muted">${i === 0 ? "Now" : timeOf(t)}</span>
        <span class="icon">${w.icon}</span>
        <strong>${round(hourly.temperature_2m[idx])}${deg}</strong>
        <span class="rain">${rain ? `💧${rain}%` : "&nbsp;"}</span>
      </div>`;
  }).join("");

  // 7-day forecast with a temperature range bar
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  $("daily").innerHTML = daily.time.map((date, i) => {
    const w = describe(daily.weather_code[i]);
    const name = i === 0 ? "Today" : new Date(`${date}T00:00`).toLocaleDateString("en-US", { weekday: "short" });
    const lo = daily.temperature_2m_min[i];
    const hi = daily.temperature_2m_max[i];
    const left = ((lo - weekMin) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    const rain = daily.precipitation_probability_max[i];
    return `
      <li class="day">
        <span class="name">${name}</span>
        <span class="icon" title="${w.text}">${w.icon}</span>
        <span class="rain">${rain ? `💧${rain}%` : ""}</span>
        <div class="range">
          <span class="min">${round(lo)}${deg}</span>
          <div class="bar"><span style="left:${left}%;width:${Math.max(width, 4)}%"></span></div>
          <span class="max">${round(hi)}${deg}</span>
        </div>
      </li>`;
  }).join("");

  $("weather").hidden = false;
}

async function showWeather(place) {
  state.place = place;
  setStatus("Loading weather…");
  $("weather").classList.add("loading");
  try {
    const data = await fetchForecast(place);
    render(data);
    setStatus("");
    if (!place.isGps) addRecent(place);
  } catch (err) {
    setStatus(`${err.message}. Please check your connection and try again.`, true);
  } finally {
    $("weather").classList.remove("loading");
  }
}

// ---------- recent searches ----------
function addRecent(place) {
  const recent = load(RECENT_KEY, []).filter(
    (r) => !(r.latitude === place.latitude && r.longitude === place.longitude)
  );
  recent.unshift(place);
  save(RECENT_KEY, recent.slice(0, MAX_RECENT));
  renderRecent();
}

function renderRecent() {
  const recent = load(RECENT_KEY, []);
  $("recent").innerHTML = "";
  recent.forEach((place) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = place.name;
    btn.addEventListener("click", () => showWeather(place));
    $("recent").appendChild(btn);
  });
}

// ---------- search with suggestions ----------
let debounceTimer;
let latestQuery = "";

function hideSuggestions() {
  $("suggestions").hidden = true;
  state.activeIndex = -1;
}

function renderSuggestions() {
  const list = $("suggestions");
  list.innerHTML = "";
  if (!state.suggestions.length) return hideSuggestions();
  state.suggestions.forEach((city, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.className = i === state.activeIndex ? "active" : "";
    const region = document.createElement("small");
    region.textContent = [city.admin1, city.country].filter(Boolean).join(", ");
    li.append(`${city.name} `, region);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pickSuggestion(i);
    });
    list.appendChild(li);
  });
  list.hidden = false;
}

function pickSuggestion(i) {
  const city = state.suggestions[i];
  if (!city) return;
  $("searchInput").value = city.name;
  hideSuggestions();
  showWeather({
    name: city.name,
    admin1: city.admin1,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
  });
}

$("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(debounceTimer);
  if (query.length < 2) {
    state.suggestions = [];
    return hideSuggestions();
  }
  debounceTimer = setTimeout(async () => {
    latestQuery = query;
    try {
      const results = await searchCities(query);
      if (query !== latestQuery) return; // a newer search is in flight
      state.suggestions = results;
      state.activeIndex = -1;
      renderSuggestions();
    } catch {
      hideSuggestions();
    }
  }, 300);
});

$("searchInput").addEventListener("keydown", (e) => {
  const count = state.suggestions.length;
  if ($("suggestions").hidden || !count) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.activeIndex = (state.activeIndex + 1) % count;
    renderSuggestions();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    state.activeIndex = (state.activeIndex - 1 + count) % count;
    renderSuggestions();
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

$("searchInput").addEventListener("blur", hideSuggestions);

$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (state.activeIndex >= 0) return pickSuggestion(state.activeIndex);
  const query = $("searchInput").value.trim();
  if (!query) return;
  hideSuggestions();
  setStatus("Searching…");
  try {
    const results = await searchCities(query);
    if (!results.length) return setStatus(`No city found for "${query}".`, true);
    state.suggestions = results;
    pickSuggestion(0);
  } catch (err) {
    setStatus(err.message, true);
  }
});

// ---------- geolocation ----------
$("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return setStatus("Your browser does not support location.", true);
  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => showWeather({
      name: "My location",
      latitude: +coords.latitude.toFixed(4),
      longitude: +coords.longitude.toFixed(4),
      isGps: true,
    }),
    () => setStatus("Location permission denied. Search for a city instead.", true),
    { timeout: 10000 }
  );
});

// ---------- unit toggle ----------
function updateUnitButton() {
  $("unitToggle").textContent = state.unit === "celsius" ? "°C" : "°F";
}

$("unitToggle").addEventListener("click", () => {
  state.unit = state.unit === "celsius" ? "fahrenheit" : "celsius";
  save(UNIT_KEY, state.unit);
  updateUnitButton();
  if (state.place) showWeather(state.place);
});

// ---------- start ----------
updateUnitButton();
renderRecent();
const [lastPlace] = load(RECENT_KEY, []);
showWeather(lastPlace || { name: "London", country: "United Kingdom", latitude: 51.5085, longitude: -0.1257 });
