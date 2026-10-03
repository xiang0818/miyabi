# web/src/features/player MODIFICATIONS

用途：Miyabi 的播放单页（`/play`）。

## 文件
- `page.tsx`：播放单页。左播放器（自适应占满）、右目录固定 `20rem` 卡片；来源 chips（本地全部 / 各本地目录 / 115 / 收藏占位）；影片级列表（封面 / 番号 / 标题 / 分段数）内部独立滚动 + 懒加载；上一段 / 下一段；连播。
- `player-stage.tsx`：把 `window.MiyabiPlayer.create` 挂到容器，用 `handlers` ref 传回调（避免重建播放器），通过 `onReady` 把 `PlayerInstance` 交给页面。
- `player-assets.ts`：按需单次加载 `/player/**` 的 CSS/JS（xgplayer、hls、TmPlayerControls、GIF、内核）。

## 数据
- `GET /api/playables?scope=local|remote|favorite&directory=&page=&limit=`（`internal/api/playables.go`）。
- 播放地址：本地 `/api/local/play/:fileID`；115 `/api/strm/play/:fileID`（同源 cookie，token 不进 URL）。

## 布局约束（v2 视觉稿：`design/play-page-redesign-v2.html`）
- 容器 `max-w-[84rem]`；桌面 `lg:grid-cols-[minmax(0,1fr)_20rem]`（播放器自适应 / 目录固定）。
- 桌面 `main h-dvh` 不整体滚动，目录卡片内部独立滚动；移动端堆叠、正常滚动。

## 验证
`pnpm build` / `pnpm lint` / `pnpm test`；`node --check web/public/player/js/player-core.js`；浏览器实测由用户执行。
