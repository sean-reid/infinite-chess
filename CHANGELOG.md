# Changelog

## [0.4.0](https://github.com/sean-reid/infinite-chess/compare/infinite-chess-v0.3.0...infinite-chess-v0.4.0) (2026-10-21)


### Features

* **talk:** add the demo shot list, Canvas text, recording checklist and glossary ([#48](https://github.com/sean-reid/infinite-chess/issues/48)) ([71ea55c](https://github.com/sean-reid/infinite-chess/commit/71ea55c79cb477cba71aaef4fdacc48841141be0))

## [0.3.0](https://github.com/sean-reid/infinite-chess/compare/infinite-chess-v0.2.1...infinite-chess-v0.3.0) (2026-10-21)


### Features

* **talk:** add the slide deck, speaker notes and figure pipeline ([#44](https://github.com/sean-reid/infinite-chess/issues/44)) ([f7beadb](https://github.com/sean-reid/infinite-chess/commit/f7beadbd93dae49ca438864066559d2c8b0cde56))

## [0.2.1](https://github.com/sean-reid/infinite-chess/compare/infinite-chess-v0.2.0...infinite-chess-v0.2.1) (2026-10-14)


### Bug Fixes

* a hint that names one square offers that square, not the open rays ([#37](https://github.com/sean-reid/infinite-chess/issues/37)) ([d9b3bb2](https://github.com/sean-reid/infinite-chess/commit/d9b3bb2cb48afa8d014e26a81f8c9e02062aeac0))

## [0.2.0](https://github.com/sean-reid/infinite-chess/compare/infinite-chess-v0.1.0...infinite-chess-v0.2.0) (2026-10-14)


### Features

* hint fills in its move and lists the landings on an open line ([#34](https://github.com/sean-reid/infinite-chess/issues/34)) ([6a7c9f6](https://github.com/sean-reid/infinite-chess/commit/6a7c9f61340e49c41461242dd1e7512cb772d7f9))


### Bug Fixes

* stack the masthead on phones ([#35](https://github.com/sean-reid/infinite-chess/issues/35)) ([3ddf266](https://github.com/sean-reid/infinite-chess/commit/3ddf266fc7fa63fbaeca11172b85dbe2dc3aa683))

## 0.1.0 (2026-10-13)


### Features

* app skeleton on a cloudflare worker ([#1](https://github.com/sean-reid/infinite-chess/issues/1)) ([a51cbed](https://github.com/sean-reid/infinite-chess/commit/a51cbed09bce480250ca732d141a1bc0492a80bd))
* games in the link, resume, stats and share ([#9](https://github.com/sean-reid/infinite-chess/issues/9)) ([2717cca](https://github.com/sean-reid/infinite-chess/commit/2717cca9090b7c7e68bc06e56c627bf3790d389b))
* generate the omega-4 position for any square ([#3](https://github.com/sean-reid/infinite-chess/issues/3)) ([69dbbed](https://github.com/sean-reid/infinite-chess/commit/69dbbed050c0b5993fbccb4c2dcf3ba7b2adfbe1))
* live game value, hint and active jump links ([#8](https://github.com/sean-reid/infinite-chess/issues/8)) ([cfc94ad](https://github.com/sean-reid/infinite-chess/commit/cfc94adc4406f5eb76df08086d8a95b63a1441b1))
* moves, rays, check and mate on the unbounded board ([#5](https://github.com/sean-reid/infinite-chess/issues/5)) ([85df4d5](https://github.com/sean-reid/infinite-chess/commit/85df4d526520328f039844a423b52a78a5f69ac3))
* pack the move list so links stay short ([#11](https://github.com/sean-reid/infinite-chess/issues/11)) ([60b586e](https://github.com/sean-reid/infinite-chess/commit/60b586ed0b45276716e4b951360235038d860137))
* play black against white in the browser ([#7](https://github.com/sean-reid/infinite-chess/issues/7)) ([09a0907](https://github.com/sean-reid/infinite-chess/commit/09a09079bbce702d2f51a275a60d7cb50f20b1af))
* white opponent playing the paper's strategy ([#6](https://github.com/sean-reid/infinite-chess/issues/6)) ([ee933fa](https://github.com/sean-reid/infinite-chess/commit/ee933fa94cb431a77fa9c892db12de0d77a3d80d))


### Bug Fixes

* far checks, link bounds, worker failures, and stale copy ([#12](https://github.com/sean-reid/infinite-chess/issues/12)) ([e13a103](https://github.com/sean-reid/infinite-chess/commit/e13a103d09dd435ac9acee9647475c05f2ab774b))
* keep the view still on selection and load saved games again ([#10](https://github.com/sean-reid/infinite-chess/issues/10)) ([75645e2](https://github.com/sean-reid/infinite-chess/commit/75645e2f243f0d14202b9ee1740297cd47d24f04))
* shared links keep your game, the value ends at 0, and idle controls say so ([#15](https://github.com/sean-reid/infinite-chess/issues/15)) ([9a9c91f](https://github.com/sean-reid/infinite-chess/commit/9a9c91fb8d15f1ed95987154b0236c7233d28a84))
* towers past the first no longer stall white, and long rays stay honest ([#14](https://github.com/sean-reid/infinite-chess/issues/14)) ([f309732](https://github.com/sean-reid/infinite-chess/commit/f309732b7851379f022b3395d7b898556ddac809))


### Performance

* cut white's move and the game value to tens of milliseconds ([#13](https://github.com/sean-reid/infinite-chess/issues/13)) ([a01951c](https://github.com/sean-reid/infinite-chess/commit/a01951c2e315b7e70e65e4aaa29c83e4d33cf932))
