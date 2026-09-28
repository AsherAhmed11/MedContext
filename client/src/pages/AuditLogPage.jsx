import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";
import "./AuditLogPage.css";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [filters, setFilters] = useState({
    action: "",
    outcome: "",
    from: "",
    to: "",
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit, offset };
      if (filters.action) params.action = filters.action;
      if (filters.outcome) params.outcome = filters.outcome;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await api.getAuditLogs(params);
      setLogs(data.auditLogs);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    api
      .getAuditStats()
      .then((data) => setStats(data.stats))
      .catch(() => {});
  }, []);

  function handleFilterChange(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  }

  function clearFilters() {
    setFilters({ action: "", outcome: "", from: "", to: "" });
    setOffset(0);
  }

  const hasFilters = Object.values(filters).some((v) => v);

  if (loading && logs.length === 0) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <div className="page-header-simple">
        <h1 className="page-title-large">System Activity Log</h1>
        <p className="page-subtitle">
          Monitor all access and changes across your organization
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Events</span>
          </div>
          {Object.entries(stats.byOutcome || {}).map(([outcome, count]) => (
            <div className="stat-card" key={outcome}>
              <span className="stat-value">{count}</span>
              <span className="stat-label">{outcome}</span>
            </div>
          ))}
        </div>
      )}

      <div className="audit-card">
        <div className="audit-card__header">
          <h3 className="section-subtitle">Activity Records ({total})</h3>
          {hasFilters && (
            <button className="btn-large btn-large--outline" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="audit-filters">
          <div className="form-group-large">
            <label className="label-large">Filter by Action</label>
            <select
              className="input-large"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
            >
              <option value="">All actions</option>
              <option value="consent_granted">Consent Granted</option>
              <option value="consent_revoked">Consent Removed</option>
              <option value="emergency_access_initiated">Emergency Started</option>
              <option value="emergency_access_ended">Emergency Ended</option>
              <option value="chart_accessed">Chart Viewed</option>
              <option value="user_registered">User Registered</option>
              <option value="user_login">User Login</option>
            </select>
          </div>

          <div className="form-group-large">
            <label className="label-large">Filter by Result</label>
            <select
              className="input-large"
              value={filters.outcome}
              onChange={(e) => handleFilterChange("outcome", e.target.value)}
            >
              <option value="">All results</option>
              <option value="success">Success</option>
              <option value="failure">Failed</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          <div className="form-group-large">
            <label className="label-large">From Date</label>
            <input
              type="date"
              className="input-large"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
            />
          </div>

          <div className="form-group-large">
            <label className="label-large">To Date</label>
            <input
              type="date"
              className="input-large"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
            />
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state-large">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 10h6M9 14h4" />
            </svg>
            <p className="empty-text">No activity records found</p>
          </div>
        ) : (
          <>
            <div className="audit-list">
              {logs.map((log) => (
                <AuditLogCard key={log._id || log.id} log={log} />
              ))}
            </div>

            <div className="pagination-large">
              <button
                className="btn-large btn-large--outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </button>
              <span className="pagination-info">
                {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <button
                className="btn-large btn-large--outline"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuditLogCard({ log }) {
  return (
    <div className="audit-log-card">
      <div className="audit-log-card__header">
        <div className="audit-log-card__main">
          <h4 className="audit-log-card__action">{formatAction(log.action)}</h4>
          <p className="audit-log-card__time">{formatDateTime(log.timestamp)}</p>
        </div>
        <span className={`status-badge status-badge--${log.outcome}`}>
          {log.outcome}
        </span>
      </div>

      <div className="audit-log-card__details">
        {log.actorUserId && (
          <div className="detail-row">
            <span className="detail-label">User:</span>
            <span className="detail-value">{log.actorUserId}</span>
          </div>
        )}
        {log.patientId && (
          <div className="detail-row">
            <span className="detail-label">Patient:</span>
            <span className="detail-value">{log.patientId}</span>
          </div>
        )}
        {log.resourceType && (
          <div className="detail-row">
            <span className="detail-label">Resource:</span>
            <span className="detail-value">{log.resourceType}</span>
          </div>
        )}
        {log.reason && (
          <div className="detail-row">
            <span className="detail-label">Reason:</span>
            <span className="detail-value">{log.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAction(action) {
  if (!action) return "";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
