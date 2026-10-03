# web/public/player MODIFICATIONS

用途：Miyabi 内置播放器的静态资源与播放内核（Vite 打包到 `dist/player`，后端静态服务直接提供）。

## 来源（从仓库根 `player/` 拷贝，根目录仅作参考源，不进构建/提交）
- `js/`：`xgplayer.min.js`、`xgplayer-flv.min.js`、`hls.min.js`、`tm-player-controls.js`、`gifenc.min.js`、`gif-capture.js`
- `css/`：`xgplayer.min.css`、`font-awesome.min.css`、`tm-player-controls.css`
- `webfonts/`：Font Awesome 字体

未拷贝：`player.html`（独立页 UI，产品不需要）、`components.css`（含全局 `html/*/:root`，会与 Miyabi 样式冲突；GIF 面板样式由 `gif-capture.js` 自注入，只依赖 `--tm-*` 令牌）。

## 新增
- `js/player-core.js`：从 `player.html` 的 `playCore`/`setupPlayerEvents` 抽出的框架无关内核。
  - 工厂：`MiyabiPlayer.create(container, { sources, poster, startIndex, continueOnEnded, onChange, onEnded, onProgress })`
  - 实例：`play / pause / seek / next / prev / hasNext / hasPrev / current / setSources / setQueue / stop / setImmersive / toggleFullscreen / destroy`
  - 路由：flv/mkv→xgplayer，m3u8→hls.js，其余→原生 video；统一挂 `TmPlayerControls`。
  - 约定：原生 video `id=videoPlayer`，xgplayer 容器 `id=xgplayerContainer`——`gif-capture.js` 依赖这两个选择器。
  - 保留 GIF 截动图；丢弃拖拽、笔记/标签、文件目录树、player 自带历史。

## 验证
`node --check js/player-core.js`；资源经 `pnpm build` 内联到 `dist/player/**`，由后端 `installFrontend` 提供。
