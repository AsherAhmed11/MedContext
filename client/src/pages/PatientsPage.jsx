import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import "./PatientsPage.css";

export default function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    api
      .getPatients()
      .then((data) => setPatients(data.patients))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function viewPatient(patientId) {
    try {
      setDetailsLoading(true);
      setSelectedPatient(patientId);
      const data = await api.getPatient(patientId);
      setPatientDetails(data.patient);
    } catch (err) {
      setError(err.message);
      setPatientDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span>Loading patients...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Patients</h1>
        <p>
          {user?.role === "doctor"
            ? "Patients you have a clinical relationship with"
            : "All patients in your organization"}
        </p>
      </div>

      {error && <div className="message message--error">{error}</div>}

      <div className="patients-layout">
        <div className="card patients-list-card">
          <div className="card__header">
            <h3 className="card__title">Patient List ({patients.length})</h3>
          </div>

          {patients.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="9" cy="7" r="4" />
                <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
              </svg>
              <p>No patients found.</p>
            </div>
          ) : (
            <div className="patient-cards">
              {patients.map((p) => (
                <button
                  key={p._id || p.id}
                  className={`patient-card ${selectedPatient === (p._id || p.id) ? "is-selected" : ""}`}
                  onClick={() => viewPatient(p._id || p.id)}
                >
                  <span className="patient-card__name">
                    {p.givenName} {p.familyName}
                  </span>
                  <span className="patient-card__mrn">MRN: {p.mrn || "N/A"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card patient-detail-card">
          {detailsLoading ? (
            <div className="loading-page">
              <span className="spinner" />
            </div>
          ) : patientDetails ? (
            <div>
              <h3 className="card__title">
                {patientDetails.givenName} {patientDetails.familyName}
              </h3>
              <div className="detail-grid">
                <DetailItem label="Date of Birth" value={formatDate(patientDetails.dateOfBirth)} />
                <DetailItem label="Sex at Birth" value={patientDetails.sexAtBirth} />
                <DetailItem label="MRN" value={patientDetails.mrn || "N/A"} />
                <DetailItem label="Status" value={patientDetails.status} />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p>Select a patient to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-item__label">{label}</span>
      <span className="detail-item__value">{value}</span>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
