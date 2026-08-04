import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api } from "../lib/api";
import { onLoginSuccess } from "../stores/auth";

export default function Login() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [isRegistering, setIsRegistering] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegistering()) {
        const msg = await api.register(username(), password());
        setSuccess(msg + " — you can now log in.");
        setIsRegistering(false);
      } else {
        const token = await api.login(username(), password());
        // Token is valid for 30 min; validate to get exact remaining seconds
        const remaining = await api.validateToken(token);
        onLoginSuccess(token, username(), remaining);
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="page-center">
      <div class="card">
        <div class="card-header">
          <span class="title-icon" />
          <span class="title-text">
            {isRegistering() ? "Create Account" : "Sign In"}
          </span>
        </div>

        <div class="card-body">
          <form onSubmit={handleSubmit}>
            <div class="form-row">
              <label>Username</label>
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  placeholder="Enter username"
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-row">
              <label>Password</label>
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword() ? "text" : "password"}
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Enter password"
                  autocomplete={isRegistering() ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  class="eye-btn"
                  onClick={() => setShowPassword(!showPassword())}
                  tabIndex={-1}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <Show when={!showPassword()} fallback={
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    }>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </Show>
                  </svg>
                </button>
              </div>
            </div>

            <Show when={error()}>
              <p class="msg error">{error()}</p>
            </Show>
            <Show when={success()}>
              <p class="msg success">{success()}</p>
            </Show>

            <div class="card-footer">
              <button
                type="button"
                class="btn-link"
                onClick={() => {
                  setIsRegistering(!isRegistering());
                  setError("");
                  setSuccess("");
                }}
              >
                {isRegistering() ? "Back to Sign In" : "Create Account"}
              </button>
              <button type="submit" class="btn-primary" disabled={loading()}>
                {loading() ? "Please wait…" : isRegistering() ? "Register" : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
