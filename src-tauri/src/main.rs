#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Miyabi desktop shell: starts the Go server as a sidecar, waits until it is
//! reachable, then shows a native window loading the local UI. The window is
//! external (served by the sidecar), so this shell never bundles the frontend.

mod sidecar;
mod window;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // A second launch focuses the existing window instead of starting a
        // second server; the running instance keeps its own sidecar.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(existing) = app.get_webview_window("main") {
                let _ = existing.show();
                let _ = existing.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            sidecar::start(app)?;
            window::open(app.handle(), sidecar::local_url())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the Miyabi desktop shell")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                sidecar::shutdown();
            }
        });
}
