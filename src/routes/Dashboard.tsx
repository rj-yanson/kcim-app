import { createSignal, createEffect, onMount, Show, For } from "solid-js";
import { useNavigate, Navigate } from "@solidjs/router";
import { api } from "../lib/api";
import type { FolderEntry } from "../lib/api";
import { authState, logout, refreshSession } from "../stores/auth";

export default function Dashboard() {
  const navigate = useNavigate();

  createEffect(() => {
    if (!authState.isAuthenticated) {
      navigate("/", { replace: true });
    }
  });

  if (!authState.isAuthenticated) {
    return <Navigate href="/" />;
  }

  const [folderName, setFolderName] = createSignal("");
  const [baseDir, setBaseDir] = createSignal("");
  const [result, setResult] = createSignal("");
  const [resultType, setResultType] = createSignal<"success" | "error">("success");
  const [suggestion, setSuggestion] = createSignal<string | null>(null);
  const [folders, setFolders] = createSignal<FolderEntry[]>([]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const loadFolders = async () => {
    try {
      const list = await api.listFolders(authState.username!);
      setFolders(list);
    } catch { /* ignore */ }
  };

  onMount(loadFolders);

  const handleCreate = async () => {
    setResult("");
    setSuggestion(null);
    if (!baseDir().trim() || !folderName().trim()) {
      setResult("Please fill in both fields");
      setResultType("error");
      return;
    }
    try {
      const res = await api.createFolder(authState.username!, baseDir(), folderName());
      if (res.suggested_name) {
        setSuggestion(res.suggested_name);
        setResult(`"${folderName()}" already exists.`);
        setResultType("error");
      } else {
        setResult(`Created: ${res.path}`);
        setResultType("success");
        setFolderName("");
        loadFolders();
      }
    } catch (err: any) {
      setResult(typeof err === "string" ? err : "Failed to create folder");
      setResultType("error");
    }
  };

  const handleAcceptSuggestion = async () => {
    const name = suggestion();
    if (!name) return;
    setSuggestion(null);
    setResult("");
    try {
      const res = await api.createFolder(authState.username!, baseDir(), name);
      if (res.suggested_name) {
        setSuggestion(res.suggested_name);
        setResult(`"${name}" also exists.`);
        setResultType("error");
      } else {
        setResult(`Created: ${res.path}`);
        setResultType("success");
        setFolderName("");
        loadFolders();
      }
    } catch (err: any) {
      setResult(typeof err === "string" ? err : "Failed to create folder");
      setResultType("error");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
          <span class="title-icon" />
          <h1>Dashboard</h1>
        </div>
        <div class="user-info">
          <span class="session-timer" classList={{ warn: authState.expiresIn <= 120 }}>
            ⏱ {formatTime(authState.expiresIn)}
          </span>
          <button type="button" class="btn-secondary" onClick={refreshSession}>
            Extend
          </button>
          <span>👤 {authState.username}</span>
          <button type="button" class="btn-secondary" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main class="dashboard-main">
        <div class="card">
          <div class="card-header">
            <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 8h20" />
            </svg>
            <span class="title-text">Create a Folder</span>
          </div>
          <div class="card-body">
            <div class="form-row">
              <label>Base Directory</label>
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 8h20" />
                </svg>
                <input
                  type="text"
                  value={baseDir()}
                  onInput={(e) => setBaseDir(e.currentTarget.value)}
                  placeholder="C:\Users\me\Documents"
                />
              </div>
            </div>
            <div class="form-row">
              <label>Folder Name</label>
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 8h20" />
                </svg>
                <input
                  type="text"
                  value={folderName()}
                  onInput={(e) => setFolderName(e.currentTarget.value)}
                  placeholder="my-new-folder"
                />
              </div>
            </div>

            <Show when={result()}>
              <p class={`msg ${resultType()}`}>{result()}</p>
            </Show>

            <div class="card-footer">
              <div />
              <button type="button" class="btn-primary" onClick={handleCreate}>
                Create Folder
              </button>
            </div>
          </div>
        </div>

        {/* Folder History */}
        <div class="card" style={{ "margin-top": "16px" }}>
          <div class="card-header">
            <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3h7l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            </svg>
            <span class="title-text">Created Folders</span>
          </div>
          <div class="card-body">
            <Show when={folders().length > 0} fallback={<p class="text-muted">No folders created yet.</p>}>
              <table class="folder-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Path</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={folders()}>
                    {(f) => (
                      <tr>
                        <td>{f.folder_name}</td>
                        <td class="path-cell">{f.full_path}</td>
                        <td>{new Date(f.created_at).toLocaleString()}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </div>
        </div>
      </main>

      {/* Suggestion Modal */}
      <Show when={suggestion()}>
        <div class="modal-overlay" onClick={() => setSuggestion(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <span class="modal-title">Folder Already Exists</span>
              <button type="button" class="modal-close" onClick={() => setSuggestion(null)}>✕</button>
            </div>
            <div class="modal-body">
              <p>A folder named <strong>"{folderName()}"</strong> already exists in the selected directory.</p>
              <p>Would you like to create it as <strong>"{suggestion()}"</strong> instead?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-link" onClick={() => setSuggestion(null)}>Cancel</button>
              <button type="button" class="btn-primary" onClick={handleAcceptSuggestion}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
