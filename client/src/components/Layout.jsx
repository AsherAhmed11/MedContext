import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { MedContextLogo } from "./MedContextLogo.jsx";
import "./Layout.css";

const NAV_ITEMS = {
  patient: [
    { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { to: "/consents", label: "My Consents", icon: ShieldIcon },
  ],
  doctor: [
    { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { to: "/patients", label: "Patients", icon: UsersIcon },
    { to: "/consents", label: "Consents", icon: ShieldIcon },
    { to: "/emergency-access", label: "Emergency", icon: AlertIcon },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { to: "/patients", label: "Patients", icon: UsersIcon },
    { to: "/consents", label: "Consents", icon: ShieldIcon },
    { to: "/emergency-access", label: "Emergency", icon: AlertIcon },
    { to: "/audit-logs", label: "Audit Logs", icon: ClipboardIcon },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <MedContextLogo className="sidebar__logo" />
          <span className="sidebar__name">MedContext</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "is-active" : ""}`
              }
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="sidebar__role">{user.role}</span>
            <span className="sidebar__email">{user.email}</span>
          </div>
          <button className="sidebar__logout" onClick={handleLogout}>
            <LogoutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
      <circle cx="19" cy="7" r="3" />
      <path d="M22 21v-1.5a3 3 0 00-3-3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V7l8-4z" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3L2 21h20L12 3z" />
      <path d="M12 9v5" strokeWidth="2" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v2H9V3z" />
      <path d="M9 10h6M9 14h4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
