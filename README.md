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

One Cloudflare Worker serves the page from the asset store and answers `/api/health`. Everything else runs in the browser: `engine/base.ts` generates the position for any square, `engine/moves.ts` knows the rules, and `engine/white.ts` plays white's strategy from the paper inside a Web Worker that replays the game from the start on every move. The board is a canvas; drag to pan, scroll or pinch to zoom, tap a piece and then a square to move, or type a distance for a ray that never ends. The panel shows the paper's game value for the position, omega cubed times the rook heights still to choose and so on down to the forced replies left, and a hint names black's next main-line move. The move list lives in the URL hash, so a link reopens the game; the browser also keeps the current game and a few personal counts in local storage.
