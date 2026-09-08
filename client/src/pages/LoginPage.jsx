import { useMemo, useState } from "react";
import { MedContextLogo } from "../components/MedContextLogo.jsx";
import { copy } from "../i18n/loginCopy.js";
import "./LoginPage.css";

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
];

export default function LoginPage() {
  const [language, setLanguage] = useState("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const t = useMemo(() => copy[language], [language]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!email.trim() || !password) {
      setError(t.required);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to sign in.");
        return;
      }
      setStatus("Signed in.");
    } catch {
      setError("The portal could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={[
        "login-stage",
        largeText ? "is-large-text" : "",
        screenReaderMode ? "is-screen-reader" : "",
      ].join(" ")}
    >
      <a className="skip-link" href="#login-form">
        Skip to sign in
      </a>

      <div className="device-shell" aria-label="MedContext healthcare portal">
        <span className="device-shell__camera" aria-hidden="true" />
        <div className="device-screen">
          <img
            className="clinic-photo"
            src="/clinic-lobby.png"
            alt=""
            aria-hidden="true"
          />
          <div className="clinic-blur" aria-hidden="true" />

          <div className="portal">
            <header className="brand">
              <MedContextLogo className="brand__logo" />
              <h1>{t.appName}</h1>
              <p>{t.tagline}</p>
            </header>

            <main>
              <section className="login-card" aria-labelledby="login-heading">
                <h2 id="login-heading">{t.heading}</h2>
                <p className="login-card__subtitle">{t.subtitle}</p>

                <form id="login-form" onSubmit={handleSubmit} noValidate>
                  <label className="field">
                    <span className="visually-hidden">{t.email}</span>
                    <span className="field__icon" aria-hidden="true">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="username"
                      placeholder={t.email}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="visually-hidden">{t.password}</span>
                    <span className="field__icon" aria-hidden="true">
                      <LockIcon />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder={t.password}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="field__toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </label>

                  <div className="actions">
                    <button className="login-btn" type="submit" disabled={busy}>
                      {t.login}
                    </button>
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => setStatus(t.forgotMessage)}
                    >
                      {t.forgot}
                    </button>
                  </div>

                  <div className="form-feedback" aria-live="polite">
                    {error ? <p className="error">{error}</p> : null}
                    {status ? <p className="status">{status}</p> : null}
                  </div>
                </form>
              </section>
            </main>

            <footer className="chrome">
              <div className="trust">
                <span className="trust__shield" aria-hidden="true">
                  <ShieldIcon />
                </span>
                <div>
                  <h3>{t.trustTitle}</h3>
                  <p>
                    {t.trustBody}{" "}
                    <button type="button" className="inline-link" onClick={() => setStatus(t.privacy)}>
                      {t.privacy}
                    </button>
                  </p>
                </div>
              </div>

              <div className="widgets">
                <button
                  type="button"
                  className={`widget ${screenReaderMode ? "is-active" : ""}`}
                  aria-pressed={screenReaderMode}
                  onClick={() => setScreenReaderMode((v) => !v)}
                >
                  <AccessibilityIcon />
                  <span>{t.screenReader}</span>
                </button>
                <button
                  type="button"
                  className={`widget ${largeText ? "is-active" : ""}`}
                  aria-pressed={largeText}
                  onClick={() => setLargeText((v) => !v)}
                >
                  <span className="aa" aria-hidden="true">
                    Aa
                  </span>
                  <span>{t.largeText}</span>
                </button>
                <div className="language" role="group" aria-label={t.language}>
                  <p>{t.language}</p>
                  <div className="language__options">
                    {LANGUAGES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={language === item.id ? "is-active" : ""}
                        aria-pressed={language === item.id}
                        onClick={() => setLanguage(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2" />
      <path d="M9.9 5.1A11 11 0 0112 5c6.5 0 10 7 10 7a16 16 0 01-3.2 4.2" />
      <path d="M6.1 6.1C3.7 7.8 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke="#1aa6b7" strokeWidth="1.8">
      <path d="M16 4l10 4v8c0 7-4.6 12.4-10 14-5.4-1.6-10-7-10-14V8l10-4z" />
      <path d="M11 16l3.2 3.2L21 12.4" strokeWidth="2.2" />
    </svg>
  );
}

function AccessibilityIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" fill="#1aa6b7">
      <circle cx="16" cy="6.5" r="2.6" />
      <path d="M7 12.2h18l-2.2 2.4H9.2z" />
      <path d="M14.2 14.8l-1.6 12h3.2l.8-6.4.8 6.4h3.2l-1.6-12z" />
    </svg>
  );
}
