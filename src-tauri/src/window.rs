//! Creates the main window pointing at the local server (external URL), so the
//! frontend is always the one embedded in the Go sidecar.

use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

pub fn open(app: &AppHandle, url: String) -> tauri::Result<()> {
    let parsed: tauri::Url = url.parse().expect("local url must be valid");
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Miyabi")
        .inner_size(1280.0, 820.0)
        .min_inner_size(960.0, 640.0)
        .center()
        .build()?;
    Ok(())
}
