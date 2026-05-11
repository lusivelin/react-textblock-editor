# Hosting The Docs Website

The documentation site is a static Vite app.

## Build

```bash
pnpm build:docs
```

This produces the website in `site-dist/`.

## What gets hosted

The hosted frontend is the package documentation surface and live playground. It is useful for:

- explaining installation and React usage
- manually testing editor behavior against the current library source
- demonstrating renderer output from the same saved HTML contract consumers persist

The npm package build remains separate from the docs build so the package artifact and hosted website can evolve independently.

## Static hosts

- Vercel
  Build command: `pnpm build:docs`
  Output directory: `site-dist`
- Netlify
  Build command: `pnpm build:docs`
  Publish directory: `site-dist`
- Cloudflare Pages
  Build command: `pnpm build:docs`
  Build output directory: `site-dist`

## Notes

- The npm package build still outputs to `dist/`.
- The docs site has no server dependency and can be hosted as static assets only.
- If you change the frontend docs or playground behavior, rebuild `site-dist/` before deploying.
