# src-tauri MODIFICATIONS

用途：Miyabi 桌面端外壳（Tauri v2 + Go sidecar）。纯增量目录，不改动上游文件。

## 架构
- Rust 壳启动 Go sidecar（复用 `cmd/miyabi` 编出的 `miyabi`），轮询就绪后开一个加载 `http://127.0.0.1:<port>` 的原生窗口。
- 前端由 Go 端 `embed.go` 内嵌提供，桌面层不参与前端构建。

## 文件
- `Cargo.toml` / `build.rs`：Tauri v2 依赖与构建脚本。
- `tauri.conf.json`：`bundle.externalBin = ["binaries/miyabi"]`、Windows `webviewInstallMode=embedBootstrapper`、`frontendDist=stub`（真实 UI 由 Go 提供）。
- `capabilities/default.json`：给 `main` 窗口 `shell:allow-execute`（sidecar 作用域）。
- `src/main.rs`：Builder + 插件 + setup 启 sidecar/开窗 + 退出回收。
- `src/sidecar.rs`：**唯一的上游契约适配点**——选空闲端口、起 sidecar（`MIYABI_LISTEN`/`MIYABI_DATA_DIR`）、TCP 就绪等待、退出 kill。
- `src/window.rs`：`WebviewWindowBuilder` + `WebviewUrl::External` 创建窗口。
- `stub/index.html`：满足 `frontendDist` 的占位。
- `.gitignore`：忽略 `target/`、`gen/`、`binaries/`、`icons/`、`app-icon.png`。

## 与上游耦合点（集中在 `src/sidecar.rs`）
- 可执行名 `miyabi`；环境变量 `MIYABI_LISTEN` / `MIYABI_DATA_DIR`；就绪判据（TCP 连通，可选升级为 `GET /api/health`）。

## 状态
- M1/M2 骨架：代码已落，**待 CI（GitHub Actions）首次构建验证**（本地未装 Rust）。
- 未做：局域网开关（M4）、图标正式化（M6）、Job Object 兜底回收。

## 验证
- CI：`.github/workflows/desktop-tauri.yml`（`Build desktop (Tauri)`，Windows runner：装 Go/Rust/Node → 建前端 → 建 sidecar → `tauri build` → 产出 NSIS 安装包与便携 zip）。
- 本地未装 Rust，故不在本地构建。
