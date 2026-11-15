ATMOS WEATHER DASHBOARD — COMPLETE VERCEL DROP PACKAGE

THIS ZIP IS A NEXT.JS APP. Upload the ZIP itself to Vercel Drop.
Do not upload an older HTML-only package or select individual files.

EXPECTED ZIP ROOT:
  package.json
  next.config.js
  app/
    layout.jsx
    page.jsx
    globals.css
    weather-dashboard.jsx
    api/
      weather/
        route.js

BROWSER-ONLY DEPLOYMENT:
1. Open https://vercel.com/drop and sign in.
2. Upload this ZIP.
3. Select your Vercel team and project name; deploy.
4. In the resulting Vercel project, open Settings > Environment Variables.
5. Add:
      Name: WEATHERAPI_KEY
      Value: your newly rotated WeatherAPI key
      Environment: Production (also Preview if required)
6. Save the variable and redeploy the latest deployment.

PROJECT SETTINGS:
- Framework preset: Next.js (auto-detect)
- Root Directory: . (project root)
- Build command: leave default (next build)
- Output directory: leave default
- Install command: leave default
Do not set the Root Directory to app or public.

AFTER DEPLOYMENT TEST:
1. Open https://YOUR-DOMAIN/api/weather?city=Chennai
   Expected: WeatherAPI JSON with location and current fields.
2. Open https://YOUR-DOMAIN/
   Expected: Atmos dashboard.
3. Test search, all 12 city chips, Raw JSON, Formatted JSON, and Copy JSON.

TROUBLESHOOTING:
- If build says it cannot find app or pages, inspect the Source tab.
  package.json, next.config.js, and app/ must all be at the project root.
- If API returns 500 saying not configured, add WEATHERAPI_KEY and redeploy.
- If API returns 401/403, rotate/check the WeatherAPI key.
- If API returns 400, test a plain city name such as Chennai.
- A warning about npm cache-dir is not the build-stopping error; do not add cache-dir config.

SECURITY:
- The WeatherAPI key is not included in this ZIP.
- Add it only as a Vercel environment variable.
- Revoke the Vercel token previously pasted into chat.
- Rotate the WeatherAPI key previously pasted into chat.
- Never commit a real .env file.
- The in-memory rate limiter is best-effort per serverless instance; use Vercel Firewall/WAF or a shared rate-limit service for globally coordinated production abuse prevention.
