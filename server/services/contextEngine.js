import Allergy from "../models/Allergy.js";
import Medication from "../models/Medication.js";
import MedicalHistory from "../models/MedicalHistory.js";
import MedicalReport from "../models/MedicalReport.js";
import Appointment from "../models/Appointment.js";

/**
 * Context Engine - Core ranking algorithm
 * Safety Priority > Clinical Relevance
 */

// Specialty-to-report mapping
const SPECIALTY_MAPPINGS = {
  cardiology: ["ecg", "echo", "cardiac", "heart", "cardiovascular", "ekg"],
  neurology: ["mri", "ct", "neuro", "brain", "eeg", "nerve"],
  orthopedics: ["xray", "x-ray", "bone", "fracture", "joint", "musculoskeletal"],
  gastroenterology: ["endoscopy", "colonoscopy", "gi", "gastro", "intestinal"],
  pulmonology: ["chest", "lung", "respiratory", "pulmonary", "breathing"],
  nephrology: ["kidney", "renal", "dialysis", "urinary"],
  endocrinology: ["diabetes", "thyroid", "hormone", "metabolic", "glucose"],
  dermatology: ["skin", "dermat", "rash", "lesion"],
  ophthalmology: ["eye", "vision", "retina", "optic"],
  oncology: ["cancer", "tumor", "oncology", "chemo", "radiation"],
};

/**
 * Rank patient data by safety priority and clinical relevance
 */
export async function rankPatientData(patientId, appointmentSpecialty, organizationId) {
  // Fetch all patient data in parallel
  const [allergies, medications, histories, reports, appointments] = await Promise.all([
    Allergy.find({ patientId, organizationId }).lean(),
    Medication.find({ patientId, organizationId }).lean(),
    MedicalHistory.find({ patientId, organizationId }).lean(),
    MedicalReport.find({ patientId, organizationId }).lean(),
    Appointment.find({ patientId, organizationId }).sort({ appointmentDate: -1 }).limit(10).lean(),
  ]);

  const now = new Date();
  const rankedData = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  // CRITICAL BUCKET: Safety-critical items (always on top)

  // 1. Severe allergies (current, verified)
  allergies
    .filter(a => a.severity === "severe" && a.status === "current")
    .forEach(allergy => {
      rankedData.critical.push({
        type: "allergy",
        resourceId: allergy._id,
        data: allergy,
        reason: "Severe allergy - life-threatening risk",
        score: 1000,
      });
    });

  // 2. Moderate allergies (current)
  allergies
    .filter(a => a.severity === "moderate" && a.status === "current")
    .forEach(allergy => {
      rankedData.critical.push({
        type: "allergy",
        resourceId: allergy._id,
        data: allergy,
        reason: "Moderate allergy - safety concern",
        score: 950,
      });
    });

  // 3. Active medications
  medications
    .filter(m => m.status === "active")
    .forEach(medication => {
      rankedData.critical.push({
        type: "medication",
        resourceId: medication._id,
        data: medication,
        reason: "Currently taking - interaction risk",
        score: 900,
      });
    });

  // 4. Critical/Life-threatening conditions (active)
  const criticalConditions = ["heart failure", "stroke", "cancer", "kidney failure", "liver failure", "copd", "diabetes"];
  histories
    .filter(h => h.status === "active" && criticalConditions.some(c => h.condition.toLowerCase().includes(c)))
    .forEach(history => {
      rankedData.critical.push({
        type: "condition",
        resourceId: history._id,
        data: history,
        reason: "Life-threatening condition - critical awareness needed",
        score: 850,
      });
    });

  // HIGH RELEVANCE: Specialty-related recent data

  const specialtyKeywords = SPECIALTY_MAPPINGS[appointmentSpecialty.toLowerCase()] || [];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 5. Recent specialty-relevant reports (last 30 days)
  reports
    .filter(r => {
      const reportDate = new Date(r.reportDate);
      const isRecent = reportDate >= thirtyDaysAgo;
      const isRelevant = specialtyKeywords.some(keyword =>
        r.reportType.toLowerCase().includes(keyword) ||
        (r.summary && r.summary.toLowerCase().includes(keyword))
      );
      return isRecent && isRelevant;
    })
    .forEach(report => {
      rankedData.high.push({
        type: "report",
        resourceId: report._id,
        data: report,
        reason: `Recent ${appointmentSpecialty}-related investigation`,
        score: 800,
      });
    });

  // 6. Specialty-relevant active conditions
  histories
    .filter(h => {
      const isActive = h.status === "active";
      const isRelevant = specialtyKeywords.some(keyword =>
        h.condition.toLowerCase().includes(keyword)
      );
      return isActive && isRelevant;
    })
    .forEach(history => {
      rankedData.high.push({
        type: "history",
        resourceId: history._id,
        data: history,
        reason: `Active ${appointmentSpecialty}-related condition`,
        score: 750,
      });
    });

  // 7. Recent specialty appointments (last 90 days)
  appointments
    .filter(a => {
      const apptDate = new Date(a.appointmentDate);
      return apptDate >= ninetyDaysAgo && a.type === appointmentSpecialty.toLowerCase();
    })
    .forEach(appointment => {
      rankedData.high.push({
        type: "appointment",
        resourceId: appointment._id,
        data: appointment,
        reason: `Recent ${appointmentSpecialty} visit - continuity of care`,
        score: 700,
      });
    });

  // MEDIUM RELEVANCE: Recent but not specialty-specific

  // 8. Recent reports (last 90 days, not specialty-matched)
  reports
    .filter(r => {
      const reportDate = new Date(r.reportDate);
      const isRecent = reportDate >= ninetyDaysAgo && reportDate < thirtyDaysAgo;
      const isRelevant = !specialtyKeywords.some(keyword =>
        r.reportType.toLowerCase().includes(keyword)
      );
      return isRecent && isRelevant;
    })
    .forEach(report => {
      rankedData.medium.push({
        type: "report",
        resourceId: report._id,
        data: report,
        reason: "Recent investigation - general health context",
        score: 600,
      });
    });

  // 9. Other active conditions (not critical, not specialty-related)
  histories
    .filter(h => {
      const isActive = h.status === "active";
      const isCritical = criticalConditions.some(c => h.condition.toLowerCase().includes(c));
      const isSpecialtyRelated = specialtyKeywords.some(keyword =>
        h.condition.toLowerCase().includes(keyword)
      );
      return isActive && !isCritical && !isSpecialtyRelated;
    })
    .forEach(history => {
      rankedData.medium.push({
        type: "history",
        resourceId: history._id,
        data: history,
        reason: "Active medical condition - background context",
        score: 550,
      });
    });

  // LOW RELEVANCE: Older data, historical information

  // 10. Older reports (90+ days ago)
  reports
    .filter(r => {
      const reportDate = new Date(r.reportDate);
      return reportDate < ninetyDaysAgo;
    })
    .forEach(report => {
      rankedData.low.push({
        type: "report",
        resourceId: report._id,
        data: report,
        reason: "Historical investigation - reference only",
        score: 400,
      });
    });

  // 11. Historical/resolved conditions
  histories
    .filter(h => h.status === "resolved" || h.status === "historical")
    .forEach(history => {
      rankedData.low.push({
        type: "history",
        resourceId: history._id,
        data: history,
        reason: "Past medical history - reference only",
        score: 350,
      });
    });

  // 12. Mild allergies (current)
  allergies
    .filter(a => a.severity === "mild" && a.status === "current")
    .forEach(allergy => {
      rankedData.low.push({
        type: "allergy",
        resourceId: allergy._id,
        data: allergy,
        reason: "Mild allergy - minor precaution",
        score: 300,
      });
    });

  // Sort each bucket by score (descending)
  rankedData.critical.sort((a, b) => b.score - a.score);
  rankedData.high.sort((a, b) => b.score - a.score);
  rankedData.medium.sort((a, b) => b.score - a.score);
  rankedData.low.sort((a, b) => b.score - a.score);

  return rankedData;
}

/**
 * Get explanation for ranking decision
 */
export function getExplanation(priority, itemType) {
  const explanations = {
    critical: {
      allergy: "Severe allergies can cause life-threatening reactions. Always checked before any treatment.",
      medication: "Current medications must be reviewed to prevent dangerous drug interactions.",
      condition: "Life-threatening conditions require immediate awareness and careful monitoring.",
      history: "Critical medical history impacts all treatment decisions.",
    },
    high: {
      report: "Recent test results relevant to your specialty provide essential clinical context.",
      history: "Active specialty-related conditions are central to today's consultation.",
      appointment: "Recent visits to this specialty show continuity of care and treatment progress.",
      medication: "Relevant medications may interact with specialty-specific treatments.",
    },
    medium: {
      report: "Recent general tests provide overall health context.",
      history: "Other active conditions may influence treatment planning.",
      appointment: "Recent medical visits show general health trajectory.",
    },
    low: {
      report: "Historical test results are available for reference if needed.",
      history: "Past medical history is documented for completeness.",
      allergy: "Mild allergies noted for minor precautions.",
      appointment: "Historical visits are on record.",
    },
  };

  return explanations[priority]?.[itemType] || "Included for medical record completeness.";
}
