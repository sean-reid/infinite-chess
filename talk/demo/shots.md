# Demo shot list

Target: 3 to 4 minutes on slide 22. Browser at 16:9, light theme, https://infinite-chess.dwainosaur.com. The readings below come from the engine on release 0.3.0; walk the list once before recording and update any that differ.

Say at the start: this is our own implementation of the Section 4 compact position and white's strategy, not part of the published results.

## Part one: from a fresh game

1. Click New game. The panel reads ω⁴. Say: four nested announcements still to come.
2. Click Hint. The key bishop lights up, its square is ringed, and buttons list landings: 1 for 1 tower, 3 for 2 towers, 6 for 3 towers, and so on. Say: any distance is on the main line; every three squares is one more tower.
3. Click the button "3 · 2 towers". White captures at once. The panel reads ω³·2 + ω²·12, with r 2 and h 12. Say: black announced r; h is how many free moves white needs in this tower.
4. Click Hint. The front bishop of cannon 1 lights up with landings 10 for wing 1, 18 for wing 2, and so on. Click "10 · wing 1". The panel reads ω³·2 + ω²·12 + ω + 2. Say: opening a cannon raised b and g.
5. White replies "climbing the inner wall" and the panel reads ω³·2 + ω²·11 + ω + 2. Say: that was white's one free move; h went from 12 to 11. Opening a cannon is the only time white gets one.
6. Click Hint, then the "Move to" button. The bishop attacks gate 1 of wing 1. White answers "answering wing 1 gate 1" and the panel reads ω³·2 + ω²·11 + ω + 1. Say: g dropped by one and nothing else moved; that is a forced reply.
7. Click Hint, then the "Move to" button: the bishop takes the door pawn. The panel's g shows "open" and the value reads ω³·2 + ω²·11 + ω·2. Say: the bishop is in the doorway; white's guard settles in behind it.
8. Click Hint. Shooter 1 of cannon 1 lights up with landings for fresh wings. Click "19 · wing 2". White replies "shoring up cannon 1" and the panel reads ω³·2 + ω²·11 + 7, with b 0 and g 7. Say: b went to zero and g jumped; the shot bought seven more forced replies.
9. Click Hint and play two or three of the pawn steps. Each one lowers g by one while white keeps "shoring up cannon 1". Say: every black move here costs white a move; h has not moved since step 5.

## Part two: the rook step, from the prepared link

Opening the link loads a game 606 plies in, with cannon 12 spent and the first rook under attack. Say what it is: the same game, far along, saved as a link.

10. Open https://infinite-chess.dwainosaur.com/#g=zZJPSNNhGMef7_f3bqPcCh1RnWaR_YE2Ak-ydSiw2urWQZPqYhAUFQX25xBkMrc8LCFizToUJrRahQc1sOwQzCZpmXWwPKVQpEU0vHWIEbbe-P2kP2vt9Ht-vM_z_X6-z_vubrDb9-0F7R63W0QoUl7hWU6IKCUCrJKqqvUu4eq1gm_nc99cD7hmRXlFjS1Xlzldi_JzO8qqqwMrQRFP5Ub_j-d63wFbbe0xt3DLNnP9rZs8lfuXms3rOlFIXV07XML6BnOlXTs9lafWzaekK96Bq7Exhg2kiNd35NCvTOoKT-BoanqBJcLjJ82ZThz1-rpQ8zvSusV7IIIIPmOxMIo2mNucQwu8vj5s_xOjn_ZMlUAC7Vwg7MAVC8PLuAivL4M9f2OoG6dY1olOnOHm3IX4A924i0Ko6y5DtPWgB8_pFvbinkW8PnTDH8jiYCEBdJB3lEEM4hNdwscYsgDJ4BH8gTBP_wsQHajVsI9jHDHDIXyFCQug13gJfyDO8wW9m_nJrhvOaUwjZUA4g48WZB_wFv5AkteKQqYTpg1bFlnEjPrc2w2GWtjMYlLoNFOGhBnmjOEStjJK831F2MxgaJS3i7ovc-Kzyh5nnG3KIbzEDgviBC8wGJrkw_9KrJNfVc4kk7yhILzJlAX5LXYxGJrlaEmQ6wkGVEU_-5lWSnifAxYJHrCPwVDEmCypBHqSCbVsmMOcUguFI3xmkeQpMwyGEsZsSSbRE31Raoxj7FWHhW-YZu4HoozvtR2Yq0UR-Z58v2g1-BU
    The panel reads ω³·2 + ω, with h 0. Say: white has finished this tower's free moves; the next thing to happen is the second kind of announcement.
11. Click Hint. The rook at (47,57) lights up with an upward open line and the form prefilled. Type 5 and click Move. The panel reads ω³·2 + ω²·14 + ω, with h 14. Say: black announced h; the higher the rook, the more pawn moves white needs.
12. White captures the rook and the panel reads ω³ + ω²·13 + ω, with r 1. Say: the tower is spent, r dropped to 1, and the whole cycle starts again with one tower left.

## If the app misbehaves

- If the panel does not update after white's move, wait two seconds; white runs in a background worker and replays the game each move.
- If a reading differs from this list by one in g or b, carry on; say the term and the direction, not the number.
- If the page fails to load the link, play part one only and describe the rook step from slide 17.
- Undo exists; use it if a click lands on the wrong square.
