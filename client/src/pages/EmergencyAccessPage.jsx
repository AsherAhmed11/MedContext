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
  const [filter, setFilter] = useState({ status: "", patientId: "" });

  const loadAccesses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.patientId) params.patientId = filter.patientId;
      const data = await api.getEmergencyAccesses(params);
      setAccesses(data.emergencyAccesses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAccesses();
  }, [loadAccesses]);

  async function handleEnd(accessId) {
    if (!confirm("End this emergency access early?")) return;
    try {
      setError("");
      await api.endEmergencyAccess(accessId);
      setMessage("Emergency access ended.");
      loadAccesses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleInitiate(form) {
    try {
      setError("");
      await api.createEmergencyAccess(form);
      setMessage("Emergency access initiated.");
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
        <span>Loading emergency access records...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Emergency Access</h1>
        <p>
          {user?.role === "doctor"
            ? "Break-glass access to patient charts in emergencies"
            : "Monitor emergency access events in your organization"}
        </p>
      </div>

      {error && <div className="message message--error">{error}</div>}
      {message && <div className="message message--success">{message}</div>}

      {user?.role === "admin" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="filter-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status Filter</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Emergency Access Records</h3>
          {user?.role === "doctor" && (
            <button
              className="btn btn--primary"
              onClick={() => setShowInitiate(true)}
            >
              + Initiate Emergency Access
            </button>
          )}
        </div>

        {accesses.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M12 3L2 21h20L12 3z" />
              <path d="M12 9v5" strokeWidth="2" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="2" />
            </svg>
            <p>No emergency access records found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accesses.map((a) => (
                  <tr key={a._id || a.id}>
                    <td>{a.patientId}</td>
                    <td>{a.accessedByUserId}</td>
                    <td className="reason-cell">{a.reason}</td>
                    <td>
                      <span className={`badge badge--${a.status}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>{formatDate(a.startedAt)}</td>
                    <td>{formatDate(a.expiresAt)}</td>
                    <td>
                      {a.status === "active" && (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleEnd(a._id || a.id)}
                        >
                          End Access
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

      {showInitiate && (
        <InitiateModal
          onClose={() => setShowInitiate(false)}
          onInitiate={handleInitiate}
        />
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Initiate Emergency Access</h2>
          <button className="modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="emergency-banner">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L2 21h20L12 3z" />
                <path d="M12 9v5" strokeWidth="2" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="2" />
              </svg>
              <span>
                Emergency access bypasses consent requirements and is fully
                audited. Use only in genuine emergencies.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="patientId">Patient ID</label>
              <input
                id="patientId"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reason">Reason (required)</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why emergency access is needed..."
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <input
                id="duration"
                type="number"
                min="5"
                max="480"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              <small className="form-hint">5 minutes to 8 hours. Default: 60 minutes.</small>
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--danger" disabled={busy}>
              {busy ? "Initiating..." : "Initiate Emergency Access"}
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
    hour: "2-digit",
    minute: "2-digit",
  });
}
