 "use client";

import { useRef, useState } from "react";

const CITIES = [
  "New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Patna", "Jaipur", "London", "Mangalore", "Ramanathapuram"
];

function getMood(temp, humidity, wind) {
  const rules = [
    { mood: "Scorching", test: () => temp >= 38, description: "Extreme heat. Keep cool, hydrate, and limit time in direct sun." },
    { mood: "Freezing", test: () => temp <= 5, description: "A sharp chill in the air. Layer up and stay warm outdoors." },
    { mood: "Muggy", test: () => humidity >= 80 && temp >= 28, description: "Warm and moisture-heavy. It may feel sticky and less comfortable." },
    { mood: "Windy", test: () => wind >= 30, description: "Strong winds are shaping the day. Secure loose items and expect gusts." },
    { mood: "Pleasant", test: () => temp >= 20 && temp <= 30 && humidity <= 60 && wind <= 20, description: "A comfortable balance of warmth, humidity, and breeze. A good day to be outside." },
    { mood: "Comfortable", test: () => temp >= 15 && temp <= 30 && humidity <= 75 && wind <= 30, description: "Fairly agreeable conditions, with no major weather extremes." }
  ];
  return rules.find(rule => rule.test()) || {
    mood: "Mixed",
    description: "A mix of conditions today. Check the details before planning time outdoors."
  };
}

function highlightJson(jsonText) {
  const escaped = jsonText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, token => {
    let cls = "json-number";
    if (token.startsWith('"')) cls = token.trimEnd().endsWith(":") ? "json-key" : "json-string";
    else if (token === "true" || token === "false") cls = "json-boolean";
    else if (token === "null") cls = "json-null";
    return `<span class="${cls}">${token}</span>`;
  });
}

export default function WeatherDashboard() {
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [rawResponse, setRawResponse] = useState("");
  const [view, setView] = useState("raw");
  const [status, setStatus] = useState("Choose a city or search anywhere to get started.");
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const abortController = useRef(null);

  async function searchCity(value) {
    const query = String(value ?? "").trim();
    if (!query) {
      setStatus("Please enter a city name before searching.");
      setStatusType("error");
      return;
    }
    if (query.length > 100) {
      setStatus("City name must be 100 characters or fewer.");
      setStatusType("error");
      return;
    }

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const thisRequest = ++requestId.current;

    setCity(query);
    setSelectedCity(CITIES.includes(query) ? query : "");
    setLoading(true);
    setStatus(`Finding the weather in ${query}…`);
    setStatusType("loading");

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      const body = await response.text();
      if (thisRequest !== requestId.current) return;
      setRawResponse(body);

      if (!response.ok) {
        let message = `Weather request failed (HTTP ${response.status}).`;
        try {
          const parsed = JSON.parse(body);
          message = parsed?.error?.message || parsed?.message || message;
        } catch {}
        if (response.status === 401 || response.status === 403) {
          message = "Weather service authentication failed. Check WEATHERAPI_KEY in Vercel.";
        } else if (response.status === 429) {
          message = "Weather service rate limit reached. Please wait and try again.";
        }
        setStatus(message);
        setStatusType("error");
        setWeather(null);
        return;
      }

      let data;
      try {
        data = JSON.parse(body);
      } catch {
        setStatus("The weather provider returned an unreadable response.");
        setStatusType("error");
        setWeather(null);
        return;
      }

      if (!data?.location || !data?.current) {
        setStatus("The response did not contain current weather data.");
        setStatusType("error");
        setWeather(null);
        return;
      }

      setWeather(data);
      setStatus(`Showing current conditions for ${data.location.name}.`);
      setStatusType("");
    } catch (error) {
      if (error?.name !== "AbortError" && thisRequest === requestId.current) {
        setStatus("Network error. Check your connection and try again.");
        setStatusType("error");
      }
    } finally {
      if (thisRequest === requestId.current) setLoading(false);
    }
  }

  const formattedResponse = (() => {
    try { return JSON.stringify(JSON.parse(rawResponse), null, 2); }
    catch { return rawResponse; }
  })();

  async function copyResponse() {
    if (!rawResponse) return;
    try {
      await navigator.clipboard.writeText(rawResponse);
      setStatus("API response copied to clipboard.");
      setStatusType("");
    } catch {
      setStatus("Clipboard access is unavailable. Select and copy the JSON manually.");
      setStatusType("error");
    }
  }

  const location = weather?.location;
  const current = weather?.current;
  const mood = current
    ? getMood(Number(current.temp_c), Number(current.humidity), Number(current.wind_kph))
    : null;
  const jsonToShow = view === "formatted" ? formattedResponse : rawResponse;
  const byteCount = rawResponse ? new TextEncoder().encode(rawResponse).length : 0;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Atmos home"><span className="mark">a.</span> ATMOS</a>
        <div className="top-note"><span className="live-dot" /> LIVE WEATHER INTELLIGENCE</div>
        <span className="edition">WEATHER / 001</span>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">A CLEARER VIEW OF OUTSIDE</p>
          <h1>Weather, <span>considered.</span></h1>
          <p className="intro-copy">The conditions around you, translated into a feeling.</p>
        </section>

        <section className="search-area" aria-label="City search">
          <form className="search-form" onSubmit={event => { event.preventDefault(); searchCity(city); }}>
            <label className="sr-only" htmlFor="city-input">Search a city</label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              id="city-input"
              type="search"
              placeholder="Search any city in the world"
              autoComplete="off"
              maxLength={100}
              value={city}
              onChange={event => setCity(event.target.value)}
            />
            <button type="submit" disabled={loading}>{loading ? "Loading…" : <>Explore <span aria-hidden="true">↗</span></>}</button>
          </form>

          <div className="popular-heading"><span>POPULAR LOCATIONS</span><span>12 CITIES</span></div>
          <div className="chips" aria-label="Popular cities">
            {CITIES.map(name => (
              <button
                key={name}
                type="button"
                className={selectedCity === name ? "selected" : ""}
                aria-pressed={selectedCity === name}
                onClick={() => searchCity(name)}
              >{name}</button>
            ))}
          </div>
        </section>

        <div className={`status ${statusType}`} role="status" aria-live="polite">{status}</div>

        {weather && current && location && mood && (
          <section className="weather-panel" aria-label="Current weather">
            <div className="weather-main">
              <div className="weather-heading">
                <div>
                  <p className="eyebrow">CURRENT CONDITIONS</p>
                  <h2>{location.name}</h2>
                  <p className="place-detail">{[location.region, location.country].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="local-time"><span>LOCAL TIME</span><strong>{location.localtime || "—"}</strong></div>
              </div>

              <div className="hero-weather">
                <div className="temperature-wrap">
                  <div className="temperature">{Number(current.temp_c).toFixed(1)}<sup>°C</sup></div>
                  <p className="condition">{current.condition?.text || "Condition unavailable"}</p>
                  <p className="feels">Feels like <strong>{Number(current.feelslike_c).toFixed(1)}</strong>°C</p>
                </div>
                <div className="condition-art">
                  {current.condition?.icon && (
                    <img
                      src={current.condition.icon.startsWith("//") ? `https:${current.condition.icon}` : current.condition.icon}
                      alt={current.condition?.text || "Weather condition"}
                      width="104"
                      height="104"
                    />
                  )}
                  <span>{(current.condition?.text || "CURRENT WEATHER").toUpperCase()}</span>
                </div>
              </div>

              <div className="mood-card" data-mood={mood.mood}>
                <div className="mood-topline"><span>THE ATMOSPHERE</span><span className="mood-index">01 / MOOD</span></div>
                <div className="mood-content">
                  <div><p className="mood-kicker">IT FEELS</p><h3>{mood.mood}</h3></div>
                  <p>{mood.description}</p>
                </div>
              </div>
            </div>

            <div className="metrics-grid">
              <article className="metric-card"><span className="metric-label">HUMIDITY</span><strong>{current.humidity}%</strong><small>Relative humidity</small></article>
              <article className="metric-card"><span className="metric-label">WIND SPEED</span><strong>{Number(current.wind_kph).toFixed(1)} km/h</strong><small>Kilometres per hour</small></article>
              <article className="metric-card"><span className="metric-label">UV INDEX</span><strong>{current.uv ?? "—"}</strong><small>Ultraviolet intensity</small></article>
              <article className="metric-card"><span className="metric-label">CLOUD COVER</span><strong>{current.cloud == null ? "—" : `${current.cloud}%`}</strong><small>Sky coverage</small></article>
            </div>
          </section>
        )}

        <section className="inspector">
          <div className="inspector-heading">
            <div><p className="eyebrow">UNDER THE HOOD</p><h2>API Inspector<span className="period">.</span></h2></div>
            <p>Same response. Two ways to read it.</p>
          </div>

          <div className="inspector-shell">
            <div className="inspector-toolbar">
              <div className="tabs" role="tablist" aria-label="JSON display format">
                <button className={`tab ${view === "raw" ? "active" : ""}`} role="tab" aria-selected={view === "raw"} onClick={() => setView("raw")}>Raw JSON</button>
                <button className={`tab ${view === "formatted" ? "active" : ""}`} role="tab" aria-selected={view === "formatted"} onClick={() => setView("formatted")}>Formatted JSON</button>
              </div>
              <button className="copy-button" type="button" disabled={!rawResponse} onClick={copyResponse}>Copy JSON <span>↗</span></button>
            </div>

            <div className="code-meta">
              <span><i className="live-dot" /> RESPONSE BODY</span>
              <span>{rawResponse ? `${byteCount.toLocaleString()} BYTES` : "AWAITING REQUEST"}</span>
            </div>
            <pre className="json-view" tabIndex={0}>
              <code dangerouslySetInnerHTML={{
                __html: !rawResponse
                  ? "Search for a city to inspect its API response."
                  : view === "formatted"
                    ? highlightJson(formattedResponse)
                    : rawResponse.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              }} />
            </pre>
          </div>
          <p className="inspector-footnote">Response data is fetched server-side. API credentials are never sent to your browser.</p>
        </section>
      </main>

      <footer>
        <span>ATMOS © 2026</span>
        <span>MADE FOR A MORE INFORMED DAY</span>
        <a href="#top" onClick={event => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>BACK TO TOP ↑</a>
      </footer>
    </div>
  );
}
