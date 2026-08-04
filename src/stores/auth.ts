import { createStore } from "solid-js/store";
import { api } from "../lib/api";

export const [authState, setAuthState] = createStore({
  isAuthenticated: false,
  token: null as string | null,
  username: null as string | null,
  expiresIn: 0,
});

let expiryTimer: ReturnType<typeof setInterval> | null = null;

function startExpiryTimer(seconds: number) {
  stopExpiryTimer();
  setAuthState("expiresIn", seconds);

  expiryTimer = setInterval(() => {
    const remaining = authState.expiresIn - 1;
    if (remaining <= 0) {
      logout();
    } else {
      setAuthState("expiresIn", remaining);
    }
  }, 1000);
}

function stopExpiryTimer() {
  if (expiryTimer !== null) {
    clearInterval(expiryTimer);
    expiryTimer = null;
  }
}

export function onLoginSuccess(token: string, username: string, expiresIn: number) {
  setAuthState({
    isAuthenticated: true,
    token,
    username,
    expiresIn,
  });
  startExpiryTimer(expiresIn);
}

export async function refreshSession() {
  if (!authState.token) return;
  try {
    const remaining = await api.refreshToken(authState.token);
    startExpiryTimer(remaining);
  } catch {
    logout();
  }
}

export function logout() {
  stopExpiryTimer();
  if (authState.token) {
    api.logoutToken(authState.token).catch(() => {});
  }
  setAuthState({
    isAuthenticated: false,
    token: null,
    username: null,
    expiresIn: 0,
  });
}
