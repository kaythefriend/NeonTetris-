# Required static assets

Farcaster Mini Apps need a few images that this repo doesn't ship (binary
assets aren't included in the generated code). Drop these into `/public`
before deploying:

| File | Size | Purpose |
|---|---|---|
| `icon.png` | 1024x1024 | App icon shown in Farcaster's Mini App directory |
| `splash.png` | 200x200 | Shown on the splash screen while `sdk.actions.ready()` loads |
| `embed-image.png` | 1200x630 | Preview image shown when the app is shared as a cast embed |

Keep them on-brand: dark background (#05020a), neon cyan/magenta accents,
matching the in-app palette defined in `src/lib/skins.ts`.
