pub mod auth;
pub mod error;
pub mod fs_ops;

use auth::{DbState, SessionStore};
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Store DB in app's data directory (not the project root)
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("kcim_users.db");

            let conn = Connection::open(db_path).expect("failed to open database");
            auth::init_db(&conn).expect("failed to initialize database");

            app.manage(DbState(Mutex::new(conn)));
            app.manage(SessionStore(Mutex::new(HashMap::new())));

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::login,
            auth::register,
            auth::validate_token,
            auth::refresh_token,
            auth::logout_token,
            fs_ops::create_folder,
            fs_ops::list_folders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
