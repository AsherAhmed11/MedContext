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
    if (!confirm("Are you sure you want to revoke this consent?")) return;
    try {
      setError("");
      await api.revokeConsent(consentId);
      setMessage("Consent revoked successfully.");
      loadConsents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrant(form) {
    try {
      setError("");
      await api.createConsent(form);
      setMessage("Consent granted successfully.");
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
        <span>Loading consents...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{user?.role === "patient" ? "My Consents" : "Patient Consents"}</h1>
        <p>
          {user?.role === "patient"
            ? "Manage which doctors can access your medical records"
            : user?.role === "doctor"
            ? "Consents patients have granted to you"
            : "All consent records in your organization"}
        </p>
      </div>

      {error && <div className="message message--error">{error}</div>}
      {message && <div className="message message--success">{message}</div>}

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Consent Records</h3>
          {user?.role === "patient" && (
            <button className="btn btn--primary" onClick={() => setShowGrant(true)}>
              + Grant Consent
            </button>
          )}
        </div>

        {consents.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M12 3l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V7l8-4z" />
            </svg>
            <p>No consents found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Granted</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c._id || c.id}>
                    <td>{c.patientId}</td>
                    <td>{c.grantedToUserId}</td>
                    <td>{c.purpose}</td>
                    <td>
                      <span className={`badge badge--${c.status}`}>{c.status}</span>
                    </td>
                    <td>{formatDate(c.grantedAt)}</td>
                    <td>{c.expiresAt ? formatDate(c.expiresAt) : "No expiry"}</td>
                    <td>
                      {c.status === "active" && user?.role === "patient" && (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleRevoke(c._id || c.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGrant && (
        <GrantConsentModal
          onClose={() => setShowGrant(false)}
          onGrant={handleGrant}
        />
      )}
    </div>
  );
}

function GrantConsentModal({ onClose, onGrant }) {
  const [doctorUserId, setDoctorUserId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    await onGrant({
      doctorUserId,
      purpose,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Grant Consent</h2>
          <button className="modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="form-group">
              <label htmlFor="doctorUserId">Doctor User ID</label>
              <input
                id="doctorUserId"
                value={doctorUserId}
                onChange={(e) => setDoctorUserId(e.target.value)}
                placeholder="Enter doctor's user ID"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="purpose">Purpose</label>
              <input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Cardiology consultation"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiresAt">Expires At (optional)</label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Granting..." : "Grant Consent"}
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
    month: "short",
    day: "numeric",
  });
}
