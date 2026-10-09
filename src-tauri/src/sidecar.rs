//! The only place that couples to the Go server's contract. Everything here is
//! deliberately small so upstream changes only touch this file.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{App, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

static CHILD: Mutex<Option<CommandChild>> = Mutex::new(None);
static PORT: Mutex<u16> = Mutex::new(0);

/// Startup timeout for the sidecar to begin listening.
const READY_TIMEOUT: Duration = Duration::from_secs(30);

/// The loopback URL the desktop window loads.
pub fn local_url() -> String {
    let port = *PORT.lock().expect("port lock");
    format!("http://127.0.0.1:{port}")
}

/// Spawns `miyabi` on a free loopback port and blocks until it is reachable.
pub fn start(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let port = free_port()?;
    *PORT.lock().expect("port lock") = port;

    let data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;

    let (mut events, child) = app
        .shell()
        .sidecar("miyabi")?
        .env("MIYABI_LISTEN", format!("127.0.0.1:{port}"))
        .env("MIYABI_DATA_DIR", data_dir.to_string_lossy().to_string())
        .spawn()?;
    *CHILD.lock().expect("child lock") = Some(child);

    // Drain stdout/stderr so the child never blocks on a full pipe.
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            if let CommandEvent::Stdout(line) | CommandEvent::Stderr(line) = event {
                let _ = String::from_utf8(line);
            }
        }
    });

    if wait_ready(port, READY_TIMEOUT) {
        Ok(())
    } else {
        Err(format!("Miyabi server did not become ready within {READY_TIMEOUT:?}").into())
    }
}

/// Kills the sidecar when the app exits so no server is left behind.
pub fn shutdown() {
    if let Some(child) = CHILD.lock().expect("child lock").take() {
        let _ = child.kill();
    }
}

fn free_port() -> std::io::Result<u16> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    drop(listener);
    Ok(port)
}

/// TCP connect is enough to know the HTTP server is accepting connections;
/// upgrade to `GET /api/health` if readiness must confirm the app, not the port.
fn wait_ready(port: u16, timeout: Duration) -> bool {
    let addr = format!("127.0.0.1:{port}");
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if std::net::TcpStream::connect(&addr).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}
