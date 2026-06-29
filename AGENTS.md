# Profile Filler

Manifest V3 Chrome extension (TypeScript + React, bundled with webpack) that auto-fills web forms from grouped/nested profile data. There is no server or database — the "app" is the unpacked extension loaded into Chrome, with all data stored in `chrome.storage`.

Key scripts (see `package.json`): `build` (production bundle to `dist/`), `dev` (webpack watch), `lint` (eslint), `typecheck` (`tsc --noEmit`). There is no automated test suite.

## Cursor Cloud specific instructions

- Dependencies install with `npm ci` (npm + `package-lock.json`). This is handled by the startup update script; no extra setup needed.
- The product is a browser extension, not a web server. To "run" it, build to `dist/` and load it as an unpacked extension in Chrome via `chrome://extensions` (enable Developer mode → "Load unpacked" → select `/workspace/dist`). After rebuilds, click the reload icon on the extension card.
- IMPORTANT gotcha — `npm run dev` is NOT loadable as-is. `webpack --mode development` defaults to the `eval` devtool, which emits `eval(...)` code that violates the MV3 Content Security Policy. The service worker then fails to register ("Status code: 15") and the popup shows `ERR_BLOCKED_BY_CLIENT`. For a CSP-safe dev watch that hot-rebuilds, override the devtool: `npx webpack --mode development --watch --devtool cheap-module-source-map`. Plain `npm run build` (production) is also CSP-safe and loadable.
- To verify a build is CSP-safe before loading: `grep -c "eval(" dist/background.js dist/content.js` should report `0`.
- The popup is gated by a `LockScreen`. On first run no PIN is set, so it shows a PIN **setup** screen with a "Skip for now" button — click it to reach the main UI. PIN/recovery state and profiles persist in `chrome.storage`.
- Scanning/filling uses the *active tab* (`chrome.tabs.query({active:true})`). To fill a form, keep the form's tab active and open the popup from the toolbar icon, then click "Scan Form" → "Fill Selected". Opening the popup as its own full tab (`popup.html?tab=true`) makes that tab the active tab, so scanning targets the wrong page.
- Manual end-to-end testing requires Chrome GUI (computer use). A throwaway HTML form served over http (e.g. `python3 -m http.server`) is a convenient target; content scripts match `<all_urls>` and are injected on demand.
