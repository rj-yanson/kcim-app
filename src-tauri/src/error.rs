use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol")]
    PasswordTooWeak,
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("Folder name is invalid")]
    InvalidFolderName,
    #[error("IO error: {0}")]
    Io(String),
    #[error("Session expired")]
    SessionExpired,
    #[error("Database error: {0}")]
    Db(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
