use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use argon2::password_hash::rand_core::OsRng;
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use crate::error::AppError;

const SESSION_TTL_SECS: i64 = 30 * 60; // 30 minutes

pub struct DbState(pub Mutex<Connection>);

pub struct SessionStore(pub Mutex<HashMap<String, i64>>);

pub fn init_db(conn: &Connection) -> Result<(), AppError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| AppError::Db(e.to_string()))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            folder_name TEXT NOT NULL,
            full_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| AppError::Db(e.to_string()))?;

    Ok(())
}

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Db(e.to_string()))
}

fn verify_password(password: &str, stored_hash: &str) -> bool {
    match PasswordHash::new(stored_hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

#[tauri::command]
pub fn register(
    db: State<'_, DbState>,
    username: String,
    password: String,
) -> Result<String, AppError> {
    let username = username.trim().to_string();
    let password = password.trim().to_string();

    if username.is_empty() || password.is_empty() {
        return Err(AppError::InvalidCredentials);
    }

    // Password strength validation
    if password.len() < 8
        || !password.chars().any(|c| c.is_uppercase())
        || !password.chars().any(|c| c.is_lowercase())
        || !password.chars().any(|c| c.is_ascii_digit())
        || !password.chars().any(|c| !c.is_alphanumeric())
    {
        return Err(AppError::PasswordTooWeak);
    }

    let hash = hash_password(&password)?;
    let conn = db.0.lock().map_err(|e| AppError::Db(e.to_string()))?;

    conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
        rusqlite::params![username, hash],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            AppError::UserAlreadyExists
        } else {
            AppError::Db(e.to_string())
        }
    })?;

    Ok(format!("User '{}' registered successfully", username))
}

#[tauri::command]
pub fn login(
    db: State<'_, DbState>,
    sessions: State<'_, SessionStore>,
    username: String,
    password: String,
) -> Result<String, AppError> {
    let username = username.trim().to_string();
    let password = password.trim().to_string();

    if username.is_empty() || password.is_empty() {
        return Err(AppError::InvalidCredentials);
    }

    let conn = db.0.lock().map_err(|e| AppError::Db(e.to_string()))?;

    let stored_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE username = ?1",
            rusqlite::params![username],
            |row| row.get(0),
        )
        .map_err(|_| AppError::InvalidCredentials)?;

    if verify_password(&password, &stored_hash) {
        let now = chrono::Utc::now().timestamp();
        let token = format!("session-{}-{}", username, now);
        let expires_at = now + SESSION_TTL_SECS;

        let mut store = sessions.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
        store.retain(|_, exp| *exp > now);
        store.insert(token.clone(), expires_at);

        Ok(token)
    } else {
        Err(AppError::InvalidCredentials)
    }
}

#[tauri::command]
pub fn validate_token(
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<i64, AppError> {
    let store = sessions.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
    let now = chrono::Utc::now().timestamp();

    match store.get(&token) {
        Some(&expires_at) if expires_at > now => Ok(expires_at - now),
        _ => Err(AppError::SessionExpired),
    }
}

#[tauri::command]
pub fn refresh_token(
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<i64, AppError> {
    let mut store = sessions.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
    let now = chrono::Utc::now().timestamp();

    match store.get(&token) {
        Some(&expires_at) if expires_at > now => {
            let new_expires = now + SESSION_TTL_SECS;
            store.insert(token, new_expires);
            Ok(new_expires - now)
        }
        _ => Err(AppError::SessionExpired),
    }
}

#[tauri::command]
pub fn logout_token(
    sessions: State<'_, SessionStore>,
    token: String,
) -> Result<(), AppError> {
    let mut store = sessions.0.lock().map_err(|e| AppError::Db(e.to_string()))?;
    store.remove(&token);
    Ok(())
}
