# @hillz/web

Marketing + docs site for [Hillz](https://github.com/mattapperson/hillz).

Next.js 15 (App Router) + Tailwind v4 + fumadocs-ui. Mono palette, `//` eyebrowed
sections, faint topographic-contour signature, code-blocks-as-art.

## Develop

```bash
bun install            # from the repo root
cd packages/web
bun run dev            # http://localhost:3000
bun run typecheck
bun run lint
bun run build
```

## Layout

- `app/` — App Router (landing at `/`, docs at `/docs/[[...slug]]`)
- `content/docs/` — MDX docs source (concepts, CLI, reference)
- `components/site/` — design-system primitives
- `components/landing/` — landing sections
- `public/contour.svg` — the signature topographic motif
