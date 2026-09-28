import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import "./DashboardPage.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "admin") {
      api
        .getStats()
        .then((data) => setStats(data.stats))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.displayName || user?.email}</h1>
        <p>
          {user?.role === "admin" && "Hospital administration dashboard"}
          {user?.role === "doctor" && "Clinical workspace"}
          {user?.role === "patient" && "Your health portal"}
        </p>
      </div>

      {user?.role === "admin" && stats && (
        <div className="stats-grid">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Patients" value={stats.totalPatients} />
          <StatCard label="Doctors" value={stats.totalDoctors} />
          <StatCard label="Appointments" value={stats.totalAppointments} />
        </div>
      )}

      {user?.role === "doctor" && (
        <div className="card">
          <h3 className="card__title">Quick Actions</h3>
          <div className="quick-actions">
            <a href="/patients" className="action-card">
              <UsersIcon />
              <span>View Patients</span>
            </a>
            <a href="/consents" className="action-card">
              <ShieldIcon />
              <span>Manage Consents</span>
            </a>
            <a href="/emergency-access" className="action-card">
              <AlertIcon />
              <span>Emergency Access</span>
            </a>
          </div>
        </div>
      )}

      {user?.role === "patient" && (
        <div className="card">
          <h3 className="card__title">Quick Actions</h3>
          <div className="quick-actions">
            <a href="/consents" className="action-card">
              <ShieldIcon />
              <span>Manage Consents</span>
            </a>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card__title">Account Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role</span>
            <span className="info-value" style={{ textTransform: "capitalize" }}>
              {user?.role}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="badge badge--active">{user?.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value ?? 0}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V7l8-4z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3L2 21h20L12 3z" />
      <path d="M12 9v5" strokeWidth="2" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="2" />
    </svg>
  );
}
