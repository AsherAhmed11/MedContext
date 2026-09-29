/**
 * Medication Safety Warnings - Phase 6
 *
 * Pipeline: Medication → Allergies → Current Meds → Previous Reactions
 * → Prototype Interaction Data → Potential Concern → Explanation → Clinician Review
 *
 * NEVER claims "this is safe" - only identifies "potential concerns"
 */

// Common drug classes and their interactions
const DRUG_CLASSES = {
  penicillins: ["penicillin", "amoxicillin", "ampicillin", "cloxacillin"],
  cephalosporins: ["cephalexin", "ceftriaxone", "cefuroxime", "cefixime"],
  sulfonamides: ["sulfamethoxazole", "trimethoprim", "sulfasalazine"],
  nsaids: ["ibuprofen", "naproxen", "diclofenac", "aspirin", "celecoxib"],
  ace_inhibitors: ["lisinopril", "enalapril", "captopril", "ramipril"],
  beta_blockers: ["metoprolol", "propranolol", "atenolol", "carvedilol"],
  statins: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
  warfarin: ["warfarin", "coumadin"],
  digoxin: ["digoxin", "lanoxin"],
  lithium: ["lithium", "lithobid"],
};

// Prototype drug interaction data
const DRUG_INTERACTIONS = [
  {
    drug1Class: "warfarin",
    drug2Class: "nsaids",
    severity: "high",
    concern: "Increased bleeding risk due to anticoagulant enhancement",
    recommendation: "Monitor INR closely if concurrent use necessary",
  },
  {
    drug1Class: "ace_inhibitors",
    drug2Class: "nsaids",
    severity: "moderate",
    concern: "Reduced kidney function and blood pressure control",
    recommendation: "Monitor kidney function and blood pressure",
  },
  {
    drug1Class: "digoxin",
    drug2Class: "beta_blockers",
    severity: "moderate",
    concern: "Increased risk of heart rhythm problems",
    recommendation: "Monitor heart rate and digoxin levels",
  },
  {
    drug1Class: "statins",
    drug2Class: "warfarin",
    severity: "moderate",
    concern: "Potential increase in bleeding risk",
    recommendation: "Monitor INR if starting or stopping statin",
  },
  {
    drug1Class: "lithium",
    drug2Class: "ace_inhibitors",
    severity: "high",
    concern: "Lithium toxicity due to reduced kidney clearance",
    recommendation: "Monitor lithium levels closely",
  },
];

/**
 * Check for medication safety concerns
 */
export async function checkMedicationSafety(patientId, organizationId, newMedication = null) {
  // Import models dynamically to avoid circular dependencies
  const { default: Allergy } = await import("../models/Allergy.js");
  const { default: Medication } = await import("../models/Medication.js");

  const concerns = [];

  // Get patient's current data
  const [allergies, medications] = await Promise.all([
    Allergy.find({
      patientId,
      organizationId,
      status: "current"
    }).lean(),
    Medication.find({
      patientId,
      organizationId,
      status: "active"
    }).lean(),
  ]);

  // Medication to check (new or existing)
  const medicationToCheck = newMedication || null;
  const allMedications = newMedication ? [...medications, newMedication] : medications;

  // 1. Check against allergies
  if (medicationToCheck) {
    allergies.forEach(allergy => {
      const allergyMatch = checkAllergyMatch(medicationToCheck.medicationName, allergy.allergyName);
      if (allergyMatch) {
        concerns.push({
          type: "allergy",
          severity: allergy.severity === "severe" ? "critical" :
                   allergy.severity === "moderate" ? "high" : "moderate",
          title: `${allergy.severity.toUpperCase()} ALLERGY ALERT`,
          description: `Patient has documented ${allergy.severity} allergy to ${allergy.allergyName}`,
          medication: medicationToCheck.medicationName,
          allergen: allergy.allergyName,
          reaction: allergy.reaction || "See allergy record",
          recommendation: allergy.severity === "severe"
            ? "DO NOT ADMINISTER - Severe reaction risk"
            : "CAUTION - Monitor for allergic reaction",
          evidence: "Patient allergy record",
        });
      }
    });
  }

  // 2. Check drug-drug interactions
  for (let i = 0; i < allMedications.length; i++) {
    for (let j = i + 1; j < allMedications.length; j++) {
      const med1 = allMedications[i];
      const med2 = allMedications[j];

      const interaction = findDrugInteraction(med1.medicationName, med2.medicationName);
      if (interaction) {
        concerns.push({
          type: "interaction",
          severity: interaction.severity === "high" ? "high" : "moderate",
          title: `DRUG INTERACTION DETECTED`,
          description: interaction.concern,
          medication1: med1.medicationName,
          medication2: med2.medicationName,
          recommendation: interaction.recommendation,
          evidence: "Clinical drug interaction database",
        });
      }
    }
  }

  // 3. Check for duplicate drug classes
  const drugClassCounts = {};
  allMedications.forEach(med => {
    const drugClass = findDrugClass(med.medicationName);
    if (drugClass) {
      drugClassCounts[drugClass] = (drugClassCounts[drugClass] || []);
      drugClassCounts[drugClass].push(med.medicationName);
    }
  });

  Object.entries(drugClassCounts).forEach(([drugClass, drugs]) => {
    if (drugs.length > 1) {
      concerns.push({
        type: "duplication",
        severity: "moderate",
        title: `DUPLICATE DRUG CLASS`,
        description: `Multiple medications from same class (${drugClass})`,
        medications: drugs,
        recommendation: "Review for therapeutic duplication and dosing",
        evidence: "Drug classification analysis",
      });
    }
  });

  // Sort by severity (critical > high > moderate)
  concerns.sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, moderate: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return concerns;
}

/**
 * Check if medication matches an allergy
 */
function checkAllergyMatch(medicationName, allergyName) {
  const medLower = medicationName.toLowerCase();
  const allergyLower = allergyName.toLowerCase();

  // Direct match
  if (medLower.includes(allergyLower) || allergyLower.includes(medLower)) {
    return true;
  }

  // Check drug class matches
  for (const [className, drugs] of Object.entries(DRUG_CLASSES)) {
    const medicationInClass = drugs.some(drug => medLower.includes(drug));
    const allergyInClass = drugs.some(drug => allergyLower.includes(drug)) ||
                          allergyLower.includes(className);

    if (medicationInClass && allergyInClass) {
      return true;
    }
  }

  return false;
}

/**
 * Find drug interaction between two medications
 */
function findDrugInteraction(med1, med2) {
  const class1 = findDrugClass(med1);
  const class2 = findDrugClass(med2);

  if (!class1 || !class2) return null;

  return DRUG_INTERACTIONS.find(interaction =>
    (interaction.drug1Class === class1 && interaction.drug2Class === class2) ||
    (interaction.drug1Class === class2 && interaction.drug2Class === class1)
  );
}

/**
 * Find which drug class a medication belongs to
 */
function findDrugClass(medicationName) {
  const medLower = medicationName.toLowerCase();

  for (const [className, drugs] of Object.entries(DRUG_CLASSES)) {
    if (drugs.some(drug => medLower.includes(drug))) {
      return className;
    }
  }

  return null;
}

/**
 * Generate safety warning text that never claims certainty
 */
export function generateSafetyWarning(concerns) {
  if (concerns.length === 0) {
    return {
      status: "reviewed",
      message: "No immediate safety concerns identified in this review.",
      disclaimer: "This review is based on available data. Clinical judgment always applies.",
    };
  }

  const criticalConcerns = concerns.filter(c => c.severity === "critical");
  const highConcerns = concerns.filter(c => c.severity === "high");

  let status = "caution";
  let message = "Potential safety concerns identified - review recommended.";

  if (criticalConcerns.length > 0) {
    status = "alert";
    message = "CRITICAL safety concerns detected - immediate review required.";
  } else if (highConcerns.length > 0) {
    status = "warning";
    message = "HIGH priority safety concerns - review before prescribing.";
  }

  return {
    status,
    message,
    concernCount: concerns.length,
    criticalCount: criticalConcerns.length,
    highCount: highConcerns.length,
    disclaimer: "These are potential concerns for clinical review. Final prescribing decisions require medical judgment.",
  };
}