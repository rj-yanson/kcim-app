use std::path::{Path, PathBuf};
use crate::auth::DbState;
use crate::error::AppError;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct CreateFolderResult {
    pub path: String,
    pub suggested_name: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FolderEntry {
    pub id: i64,
    pub folder_name: String,
    pub full_path: String,
    pub created_at: String,
}

#[tauri::command]
pub fn create_folder(
    db: State<'_, DbState>,
    username: String,
    base_dir: String,
    folder_name: String,
) -> Result<CreateFolderResult, AppError> {
    let folder_name = folder_name.trim().to_string();

    if folder_name.is_empty()
        || folder_name.contains("..")
        || folder_name.contains('/')
        || folder_name.contains('\\')
    {
        return Err(AppError::InvalidFolderName);
    }

    let base = Path::new(&base_dir);
    let target: PathBuf = base.join(&folder_name);

    // If folder already exists, find next available name with incrementing suffix
    if target.exists() {
        let mut counter = 1u32;
        loop {
            let candidate_name = format!("{}{}", folder_name, counter);
            let candidate_path = base.join(&candidate_name);
            if !candidate_path.exists() {
                return Ok(CreateFolderResult {
                    path: candidate_path.to_string_lossy().to_string(),
                    suggested_name: Some(candidate_name),
                });
            }
            counter += 1;
            if counter > 1000 {
                return Err(AppError::Io("too many folders with similar names".into()));
            }
        }
    }

    std::fs::create_dir_all(&target).map_err(|e| AppError::Io(e.to_string()))?;

    // Track in database
    let path_str = target.to_string_lossy().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let conn = db.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
    conn.execute(
        "INSERT INTO folders (username, folder_name, full_path, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![username, folder_name, path_str, now],
    )
    .map_err(|e| AppError::Db(e.to_string()))?;

    Ok(CreateFolderResult {
        path: path_str,
        suggested_name: None,
    })
}

#[tauri::command]
pub fn list_folders(
    db: State<'_, DbState>,
    username: String,
) -> Result<Vec<FolderEntry>, AppError> {
    let conn = db.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
    let mut stmt = conn
        .prepare("SELECT id, folder_name, full_path, created_at FROM folders WHERE username = ?1 ORDER BY id DESC")
        .map_err(|e| AppError::Db(e.to_string()))?;

    let rows = stmt
        .query_map(rusqlite::params![username], |row| {
            Ok(FolderEntry {
                id: row.get(0)?,
                folder_name: row.get(1)?,
                full_path: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| AppError::Db(e.to_string()))?;

    let mut folders = Vec::new();
    for row in rows {
        folders.push(row.map_err(|e| AppError::Db(e.to_string()))?);
    }
    Ok(folders)
}
