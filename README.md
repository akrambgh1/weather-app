# ⛅ SkyCast — Weather App

A fast, clean weather app that shows current conditions, a 24-hour forecast and a 7-day forecast for any city in the world.

Built with **plain HTML, CSS and JavaScript**, with no frameworks and no build step. It uses the free [Open-Meteo](https://open-meteo.com/) API, so you don't need an API key.

**🔗 Live demo:** https://akrambgh1.github.io/weather-app/

## ✨ Features

- 🔍 **City search with live suggestions** (debounced, keyboard navigation with ↑ ↓ Enter Esc)
- 📍 **Use my location** with the browser Geolocation API
- 🌡️ **Current weather**: temperature, feels like, humidity, wind, sunrise and sunset
- ⏰ **Next 24 hours**: hourly temperature, icons and chance of rain
- 📅 **7-day forecast** with a visual min/max temperature bar
- 🔁 **°C / °F toggle** (also switches wind between km/h and mph)
- 🕘 **Recent searches** saved in `localStorage`
- 🎨 **Dynamic background** that changes with the weather and day/night
- 📱 **Fully responsive**, from mobile to desktop

## 🛠️ Tech Stack

| Part | Technology |
|------|------------|
| Markup | HTML5 (semantic, accessible labels) |
| Styling | CSS3 (Grid, Flexbox, custom properties, glassmorphism) |
| Logic | Vanilla JavaScript (ES6+, `fetch`, `async/await`) |
| Data | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) and [Geocoding API](https://open-meteo.com/en/docs/geocoding-api) |
| Hosting | GitHub Pages |

## 🚀 Run Locally

```bash
git clone https://github.com/akrambgh1/weather-app.git
cd weather-app
```

Then open `index.html` in your browser. That's it, no install needed.

## 📂 Project Structure

```
weather-app/
├── index.html   # Page layout
├── style.css    # Styles and weather themes
├── app.js       # API calls, rendering, search, geolocation
└── README.md
```

## 📚 What I Learned

- Calling REST APIs with `fetch` and handling loading and error states
- Debouncing user input to avoid sending too many requests
- Mapping WMO weather codes to icons and descriptions
- Working with time zones and ISO date strings
- Building a responsive UI without a framework

## 📄 License

MIT. Free to use and modify.
