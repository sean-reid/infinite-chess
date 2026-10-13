# infinite-chess

Play black in the infinite chess position with game value omega to the fourth from Evans, Hamkins and Perlmutter, [arXiv 1510.08155](https://arxiv.org/abs/1510.08155). White has a forced win; black decides how long it takes.

## Development

```sh
npm install
npm run build      # bundle the client into dist/
npm run dev        # wrangler dev on http://localhost:8787
npm test           # unit tests
npm run test:e2e   # Playwright against a local wrangler dev
```

## How it runs

One Cloudflare Worker serves the page from the asset store and answers `/api/health`. Everything else runs in the browser.
