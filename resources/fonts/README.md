# Fonts

## Current Setup (Development)

Cinzel and Lora are loaded from Google Fonts in `src/renderer/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap');
```

This works in development because Electron's Chromium runtime can fetch from the internet.

## Known Open Item — Font Bundling (Phase 3)

In production builds, the app should **not** depend on an internet connection to load fonts.

**Phase 3 task:** Download Cinzel and Lora OTF/TTF files from Google Fonts, place them here,
and switch `index.css` to `@font-face` declarations pointing to local paths.

Font sources:
- Cinzel: https://fonts.google.com/specimen/Cinzel (OFL license)
- Lora: https://fonts.google.com/specimen/Lora (OFL license)

Both fonts are under the SIL Open Font License 1.1 and can be bundled freely.
