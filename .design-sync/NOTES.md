# Meemate Design Sync Notes

## Repo shape

- meemate is a **private Next.js 16.3 app** (not a standalone component library)
- No `dist/`, no package exports, no Storybook
- Components in `components/*.tsx`, types in `lib/types.ts`, agent data in `lib/agents.ts`
- Uses `@/` path alias (tsconfig `paths`)
- Symlink needed: `ln -sfn .. node_modules/meemate` so the converter can find the "package"
- Build uses **synth-entry mode** (no dist entry available)

## CSS

- `app/globals.css` starts with `@import "tailwindcss"` (Tailwind v4)
- Must pre-compile through Tailwind CLI before feeding to the converter:
  `npx @tailwindcss/cli -i app/globals.css -o app/compiled-globals.css`
- `cssEntry` points at the compiled output, not the raw globals.css
- Re-sync must recompile CSS if globals.css changes

## Fonts

- Uses "Songti SC" / "STSong" / "Source Han Serif SC" (macOS system fonts)
- `runtimeFontPrefixes` suppresses `[FONT_MISSING]`
- Claude Design previews will render with system serif fallback on non-macOS

## Next.js coupling

- Components use `useRouter`, `usePathname`, `useSearchParams`, `useParams` from `next/navigation`
- Components use `Link` from `next/link`
- Components use `fetch()` to `/api/*` endpoints
- The esbuild bundle inlines Next.js modules; preview cards for routing-dependent components (BackNav, BottomTabs, Chat, Life, Me, PlanView, DemoBar) may not render interactively in previews
- Portable components (Avatar, GroupAvatar, Nav, Segmented, Sheet, Toast) render cleanly in isolation

## Converter deps

- Installed in `.ds-sync/node_modules` (separate from app's node_modules)
- esbuild needs its postinstall script run: `rm -rf .ds-sync/node_modules && cd .ds-sync && npm i --ignore-scripts esbuild ts-morph @types/react && node node_modules/esbuild/install.js`

## Known render warns

- `[RENDER_SKIPPED]` — no playwright installed; previews not machine-verified
- Components using `useRouter`/`usePathname` may throw in headless preview (expected for this app shape)

## Re-sync risks

- `app/compiled-globals.css` is a derived file; if `app/globals.css` changes, must regenerate before sync
- `node_modules/meemate` symlink is not committed; must recreate on fresh clone
- `dtsPropsFor` hand-written props for 12 components; upstream prop changes need manual update
- Components that fetch from `/api/*` won't render data in static previews
