import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import "./EmergencyAccessPage.css";

export default function EmergencyAccessPage() {
  const { user } = useAuth();
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showInitiate, setShowInitiate] = useState(false);

  const loadAccesses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getEmergencyAccesses({});
      setAccesses(data.emergencyAccesses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccesses();
  }, [loadAccesses]);

  async function handleEnd(accessId) {
    if (!confirm("End emergency access now?")) return;
    try {
      setError("");
      await api.endEmergencyAccess(accessId);
      setMessage("Emergency access ended successfully.");
      loadAccesses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleInitiate(form) {
    try {
      setError("");
      await api.createEmergencyAccess(form);
      setMessage("Emergency access activated.");
      setShowInitiate(false);
      loadAccesses();
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

  const activeAccesses = accesses.filter(a => a.status === "active");
  const expiredAccesses = accesses.filter(a => a.status !== "active");

  return (
    <div className="emergency-page">
      <div className="page-header-simple">
        <h1 className="page-title-large">
          {user?.role === "doctor" ? "Emergency Access" : "Emergency Access Log"}
        </h1>
        <p className="page-subtitle">
          {user?.role === "doctor"
            ? "Temporary access to patient records during emergencies"
            : "Monitor all emergency access events"}
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--success">{message}</div>}

      {user?.role === "doctor" && (
        <>
          <div className="emergency-warning">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3L2 21h20L12 3z" />
              <path d="M12 9v5" strokeWidth="2.5" />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
            <div>
              <p className="warning-title">Use Only for True Emergencies</p>
              <p className="warning-text">
                This bypasses normal consent. All access is recorded and reviewed.
              </p>
            </div>
          </div>

          <div className="action-section">
            <button className="btn-large btn-large--danger" onClick={() => setShowInitiate(true)}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3L2 21h20L12 3z" />
              </svg>
              <span>Start Emergency Access</span>
            </button>
          </div>
        </>
      )}

      {activeAccesses.length > 0 && (
        <>
          <h2 className="section-title">Active Emergency Access</h2>
          <div className="access-list">
            {activeAccesses.map((access) => (
              <AccessCard
                key={access._id || access.id}
                access={access}
                userRole={user?.role}
                onEnd={handleEnd}
              />
            ))}
          </div>
        </>
      )}

      {expiredAccesses.length > 0 && (
        <>
          <h2 className="section-title">Past Emergency Access</h2>
          <div className="access-list">
            {expiredAccesses.map((access) => (
              <AccessCard
                key={access._id || access.id}
                access={access}
                userRole={user?.role}
                onEnd={handleEnd}
              />
            ))}
          </div>
        </>
      )}

      {accesses.length === 0 && (
        <div className="empty-state-large">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3L2 21h20L12 3z" />
          </svg>
          <p className="empty-text">No emergency access records found</p>
        </div>
      )}

      {showInitiate && (
        <InitiateModal onClose={() => setShowInitiate(false)} onInitiate={handleInitiate} />
      )}
    </div>
  );
}

function AccessCard({ access, userRole, onEnd }) {
  const now = new Date();
  const expiresAt = new Date(access.expiresAt);
  const isActive = access.status === "active" && expiresAt > now;
  const timeLeft = isActive ? Math.round((expiresAt - now) / 60000) : 0;

  return (
    <div className={`access-card ${isActive ? "access-card--active" : "access-card--expired"}`}>
      <div className="access-card__header">
        <div>
          <h3 className="access-card__title">Patient ID: {access.patientId}</h3>
          <p className="access-card__meta">
            {isActive ? `Expires in ${timeLeft} minutes` : `Ended: ${formatDate(access.endedAt || access.expiresAt)}`}
          </p>
        </div>
        <span className={`status-badge ${isActive ? "status-badge--danger" : "status-badge--inactive"}`}>
          {isActive ? "ACTIVE" : access.status.toUpperCase()}
        </span>
      </div>

      <div className="access-card__reason">
        <p className="reason-label">Emergency Reason:</p>
        <p className="reason-text">{access.reason}</p>
      </div>

      <div className="access-card__details">
        <div className="detail-row">
          <span className="detail-label">Started:</span>
          <span className="detail-value">{formatDate(access.startedAt)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Expires:</span>
          <span className="detail-value">{formatDate(access.expiresAt)}</span>
        </div>
      </div>

      {isActive && userRole === "doctor" && (
        <div className="access-card__actions">
          <button
            className="btn-large btn-large--outline"
            onClick={() => onEnd(access._id || access.id)}
          >
            End Access Now
          </button>
        </div>
      )}
    </div>
  );
}

function InitiateModal({ onClose, onInitiate }) {
  const [patientId, setPatientId] = useState("");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    await onInitiate({
      patientId,
      reason,
      durationMinutes: parseInt(durationMinutes) || 60,
    });
    setBusy(false);
  }

  return (
    <div className="modal-overlay-large" onClick={onClose}>
      <div className="modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-large__header">
          <h2 className="modal-large__title">Start Emergency Access</h2>
          <button className="modal-large__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-large__body">
            <div className="emergency-banner-modal">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L2 21h20L12 3z" />
              </svg>
              <span>This access is fully audited and monitored</span>
            </div>

            <div className="form-group-large">
              <label htmlFor="patientId" className="label-large">Patient ID</label>
              <input
                id="patientId"
                className="input-large"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID"
                required
                autoFocus
              />
            </div>

            <div className="form-group-large">
              <label htmlFor="reason" className="label-large">Emergency Reason</label>
              <textarea
                id="reason"
                className="textarea-large"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why emergency access is needed..."
                rows="4"
                required
              />
              <p className="input-hint">Describe the emergency situation</p>
            </div>

            <div className="form-group-large">
              <label htmlFor="duration" className="label-large">Duration</label>
              <select
                id="duration"
                className="input-large"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              >
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour (recommended)</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours (maximum)</option>
              </select>
            </div>
          </div>

          <div className="modal-large__footer">
            <button type="button" className="btn-large btn-large--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-large btn-large--danger" disabled={busy}>
              {busy ? "Starting..." : "Start Emergency Access"}
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
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
