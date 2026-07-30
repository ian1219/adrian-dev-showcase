# Adrian Del Rosario — Developer Portfolio

Personal portfolio for **Adrian Del Rosario**, Full-Stack Developer (Manila, PH).
Static site — no build step, no dependencies to install.

Live at <https://ian1219.github.io/adrian/>

## Stack

- Semantic HTML5 — no CSS framework, no icon font
- Vanilla CSS with design tokens, fluid `clamp()` typography, mobile-first breakpoints
- Vanilla JavaScript, no dependencies
- Icons are an inline `<symbol>` sprite; images are WebP
- Only external request is Google Fonts (Inter + JetBrains Mono)

Initial mobile load is ~220 KB over 8 requests.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page, including the icon sprite and all dialogs |
| `style.css` | Tokens → base → components, each with its own media queries |
| `script.js` | Theme, mobile menu, scroll spy, dialogs, lightbox, copy-email |
| `img/clients/` | Screenshots of the live production sites |
| `img/` | Project screenshots + `manifest.json` of intrinsic sizes |
| `tools/to-webp.mjs` | One-off image pipeline (see below) |

## Page order

Hero → Selected Production Work → Professional Impact → About → Skills →
Work Process → Professional Experience → Personal Projects → Contact.

## Run locally

```bash
npx --yes serve .
```

Any static server works — the site has no server-side code.

## Deploy

Push to `main`. GitHub Pages deploys from `main` / root.

> **Bump the cache-busting version whenever you change `style.css` or
> `script.js`.** Both are linked in `index.html` as `style.css?v=YYYYMMDD`.
> GitHub Pages serves them with `Cache-Control: max-age=600`, so without a new
> version string a returning visitor keeps the old stylesheet against new HTML
> and sees a half-styled page.

## Adding or replacing screenshots

Drop the new PNG/JPG into the right `img/` subfolder, then:

```bash
npm install --no-save sharp
node tools/to-webp.mjs
rm -rf node_modules
```

The script converts every PNG/JPG under `img/` to WebP, deletes the source, and
rewrites `img/manifest.json` with each file's final `width`/`height`. Copy those
numbers onto the `<img>` tag so the layout does not shift while it loads.

Original uncompressed PNGs live in `img-original/` (git-ignored) as a backup.

## Conventions worth keeping

**Colour**

- **Strictly monochrome.** There is no hue token anywhere — every surface and
  text value derives from the `--n-0 … --n-950` neutral ramp in `:root`.
  Hierarchy comes from weight, scale, spacing and hairline borders.
- **Light mode stays light.** No large solid-black bands; section separation
  comes from alternating `--bg` and `--bg-alt` plus a top border. Dark mode is
  near-black `#0d0d0f` with lighter card surfaces — not pure black.
- Dark mode only redefines the semantic variables under `[data-theme="dark"]`.
  Never write a second themed rule for a component.

**Type**

- `--font-mono` (JetBrains Mono) is reserved for labels, section eyebrows,
  dates, numbers, technology names and small metadata. Everything else is
  `--font-sans` (Inter).
- Type scales with `clamp()`, so a heading should not need a media query.

**Content honesty**

- The Skills section lists only technologies actually used at work or during
  the degree. Do not pad it — a short accurate list is the point.
- Ownership is labelled explicitly on every project: *Built from Scratch*,
  *Maintained & Enhanced*, *Production System*, *Personal Project*.

**Components**

- Every icon needs an explicit `width`/`height` in CSS. A `<use>`-based SVG
  with no size renders at the default 300×150 replaced-element box.
- Give cards their own border and a real `gap`. Never build a grid from a
  container background showing through 1px gaps — that leaves a dead grey
  block wherever the last row isn't full.
- Interactive controls are `<button>` or `<a>`, never a clickable `<span>`.
  Minimum 24px target, 44px where there is room.

**Dialogs** (`.dialog` → `.dialog-panel` → `.dialog-head` + `.dialog-body`)

- A panel is a **pinned head over a scrolling body**, never one long panel that
  scrolls as a whole, so the close button always stays reachable.
- Any new dialog needs `role="dialog"`, `aria-modal="true"`, an accessible
  name, `inert`, and a `.dialog-close` button. `script.js` wires up focus
  trapping, scroll locking and Escape automatically for `[data-dialog]`.
- **Never call `focus()` or `scrollIntoView()` in a dialog flow.** Both scroll
  the page as a side effect — that is what made it jump on open and lose the
  reading position on close. Use `focus({ preventScroll: true })`, and move a
  scroll container by setting `scrollLeft`/`scrollTop` directly. `lockScroll()`
  also suspends `scroll-behavior: smooth` for the duration so the correction
  when the body is fixed can never animate.
