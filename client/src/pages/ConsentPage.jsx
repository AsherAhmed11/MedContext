import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import "./ConsentPage.css";

export default function ConsentPage() {
  const { user } = useAuth();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGrant, setShowGrant] = useState(false);
  const [message, setMessage] = useState("");

  const loadConsents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getConsents();
      setConsents(data.consents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  async function handleRevoke(consentId) {
    if (!confirm("Are you sure you want to stop this doctor from accessing your records?")) return;
    try {
      setError("");
      await api.revokeConsent(consentId);
      setMessage("Access removed successfully.");
      loadConsents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrant(form) {
    try {
      setError("");
      await api.createConsent(form);
      setMessage("Doctor can now access your records.");
      setShowGrant(false);
      loadConsents();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  return (
    <div className="consent-page">
      <div className="page-header-simple">
        <h1 className="page-title-large">
          {user?.role === "patient" ? "Who Can See My Records" : "Patient Access"}
        </h1>
        <p className="page-subtitle">
          {user?.role === "patient"
            ? "Control which doctors can view your medical information"
            : user?.role === "doctor"
            ? "Patients who gave you access to their records"
            : "All access permissions in your organization"}
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--success">{message}</div>}

      {user?.role === "patient" && (
        <div className="action-section">
          <button className="btn-large btn-large--primary" onClick={() => setShowGrant(true)}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span>Give a Doctor Access</span>
          </button>
        </div>
      )}

      {consents.length === 0 ? (
        <div className="empty-state-large">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V7l8-4z" />
          </svg>
          <p className="empty-text">
            {user?.role === "patient"
              ? "You haven't given access to any doctors yet"
              : "No access permissions found"}
          </p>
        </div>
      ) : (
        <div className="consent-list">
          {consents.map((c) => (
            <ConsentCard
              key={c._id || c.id}
              consent={c}
              userRole={user?.role}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}

      {showGrant && (
        <GrantConsentModal
          onClose={() => setShowGrant(false)}
          onGrant={handleGrant}
        />
      )}
    </div>
  );
}

function ConsentCard({ consent, userRole, onRevoke }) {
  const isExpired = consent.expiresAt && new Date(consent.expiresAt) < new Date();
  const statusText = consent.status === "active" && !isExpired ? "Active" :
                     isExpired ? "Expired" :
                     consent.status === "revoked" ? "Removed" : consent.status;

  return (
    <div className={`consent-card ${consent.status !== "active" || isExpired ? "consent-card--inactive" : ""}`}>
      <div className="consent-card__header">
        <div className="consent-card__info">
          <h3 className="consent-card__title">{consent.purpose}</h3>
          <p className="consent-card__meta">
            {userRole === "patient" ? `Doctor ID: ${consent.grantedToUserId}` : `Patient ID: ${consent.patientId}`}
          </p>
        </div>
        <span className={`status-badge status-badge--${consent.status === "active" && !isExpired ? "active" : "inactive"}`}>
          {statusText}
        </span>
      </div>

      <div className="consent-card__details">
        <div className="detail-row">
          <span className="detail-label">Given on:</span>
          <span className="detail-value">{formatDate(consent.grantedAt)}</span>
        </div>
        {consent.expiresAt && (
          <div className="detail-row">
            <span className="detail-label">Expires:</span>
            <span className="detail-value">{formatDate(consent.expiresAt)}</span>
          </div>
        )}
        {!consent.expiresAt && (
          <div className="detail-row">
            <span className="detail-label">Expires:</span>
            <span className="detail-value">Never</span>
          </div>
        )}
      </div>

      {consent.status === "active" && !isExpired && userRole === "patient" && (
        <div className="consent-card__actions">
          <button
            className="btn-large btn-large--danger"
            onClick={() => onRevoke(consent._id || consent.id)}
          >
            Remove Access
          </button>
        </div>
      )}
    </div>
  );
}

function GrantConsentModal({ onClose, onGrant }) {
  const [doctorUserId, setDoctorUserId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    await onGrant({ doctorUserId, purpose });
    setBusy(false);
  }

  return (
    <div className="modal-overlay-large" onClick={onClose}>
      <div className="modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-large__header">
          <h2 className="modal-large__title">Give Doctor Access</h2>
          <button className="modal-large__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-large__body">
            <div className="form-group-large">
              <label htmlFor="doctorUserId" className="label-large">Doctor's ID</label>
              <input
                id="doctorUserId"
                className="input-large"
                value={doctorUserId}
                onChange={(e) => setDoctorUserId(e.target.value)}
                placeholder="Enter the doctor's user ID"
                required
                autoFocus
              />
              <p className="input-hint">Ask your doctor for their user ID</p>
            </div>

            <div className="form-group-large">
              <label htmlFor="purpose" className="label-large">Reason</label>
              <input
                id="purpose"
                className="input-large"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Heart checkup"
                required
              />
              <p className="input-hint">Why does this doctor need access?</p>
            </div>
          </div>

          <div className="modal-large__footer">
            <button type="button" className="btn-large btn-large--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-large btn-large--primary" disabled={busy}>
              {busy ? "Processing..." : "Give Access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
