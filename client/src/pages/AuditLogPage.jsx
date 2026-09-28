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
    resourceType: "",
    outcome: "",
    from: "",
    to: "",
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit, offset };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resourceType = filters.resourceType;
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
    setFilters({ action: "", resourceType: "", outcome: "", from: "", to: "" });
    setOffset(0);
  }

  const hasFilters = Object.values(filters).some((v) => v);

  if (loading && logs.length === 0) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span>Loading audit logs...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Track all access and changes across your organization</p>
      </div>

      {error && <div className="message message--error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-card__value">{stats.total}</span>
            <span className="stat-card__label">Total Events</span>
          </div>
          {Object.entries(stats.byOutcome || {}).map(([outcome, count]) => (
            <div className="stat-card" key={outcome}>
              <span className="stat-card__value">{count}</span>
              <span className="stat-card__label">{outcome}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Events ({total})</h3>
          {hasFilters && (
            <button className="btn btn--outline btn--sm" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="audit-filters">
          <div className="form-group">
            <label>Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
            >
              <option value="">All actions</option>
              <option value="consent_granted">Consent Granted</option>
              <option value="consent_revoked">Consent Revoked</option>
              <option value="emergency_access_initiated">Emergency Access Initiated</option>
              <option value="emergency_access_ended">Emergency Access Ended</option>
              <option value="chart_viewed">Chart Viewed</option>
              <option value="user_registered">User Registered</option>
              <option value="user_login">User Login</option>
            </select>
          </div>
          <div className="form-group">
            <label>Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => handleFilterChange("outcome", e.target.value)}
            >
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="denied">Denied</option>
            </select>
          </div>
          <div className="form-group">
            <label>From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange("from", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange("to", e.target.value)}
            />
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 10h6M9 14h4" />
            </svg>
            <p>No audit logs found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Outcome</th>
                    <th>Actor</th>
                    <th>Patient</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id || log.id}>
                      <td className="timestamp-cell">{formatDateTime(log.timestamp)}</td>
                      <td>
                        <span className="action-tag">{formatAction(log.action)}</span>
                      </td>
                      <td>{log.resourceType}</td>
                      <td>
                        <span className={`badge badge--${log.outcome}`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td className="id-cell">{log.actorUserId}</td>
                      <td className="id-cell">{log.patientId || "—"}</td>
                      <td className="detail-cell">{log.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                className="btn btn--outline btn--sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </button>
              <span className="pagination__info">
                {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <button
                className="btn btn--outline btn--sm"
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

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAction(action) {
  if (!action) return "";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
