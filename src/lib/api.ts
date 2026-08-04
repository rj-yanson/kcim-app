import { invoke } from "@tauri-apps/api/core";

export interface CreateFolderResult {
  path: string;
  suggested_name: string | null;
}

export interface FolderEntry {
  id: number;
  folder_name: string;
  full_path: string;
  created_at: string;
}

export const api = {
  login: (username: string, password: string) =>
    invoke<string>("login", { username, password }),

  register: (username: string, password: string) =>
    invoke<string>("register", { username, password }),

  validateToken: (token: string) =>
    invoke<number>("validate_token", { token }),

  refreshToken: (token: string) =>
    invoke<number>("refresh_token", { token }),

  logoutToken: (token: string) =>
    invoke<void>("logout_token", { token }),

  createFolder: (username: string, baseDir: string, folderName: string) =>
    invoke<CreateFolderResult>("create_folder", { username, baseDir, folderName }),

  listFolders: (username: string) =>
    invoke<FolderEntry[]>("list_folders", { username }),
};
