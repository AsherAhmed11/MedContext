# MedContext — Session Context

## Session 6 — 2026-09-28 (Continued)

### Prompt (Continued)

Complete Phase 5: Context Engine implementation with ranking algorithm.

### Answer

**Phase 5 — Context Engine (Core Feature) COMPLETED:**

The Context Engine implements the core principle: **Safety Priority > Clinical Relevance**

**Ranking Algorithm Implemented:**

1. **CRITICAL Bucket (Score: 850-1000)** - Always on top:
   - Severe allergies (current, verified) - Score 1000
   - Moderate allergies (current) - Score 950
   - Active medications - Score 900
   - Life-threatening conditions (heart failure, stroke, cancer, etc.) - Score 850

2. **HIGH Bucket (Score: 700-800)** - Specialty-relevant recent data:
   - Recent specialty-relevant reports (last 30 days) - Score 800
   - Active specialty-related conditions - Score 750
   - Recent specialty appointments (last 90 days) - Score 700

3. **MEDIUM Bucket (Score: 550-600)** - Recent general context:
   - Recent non-specialty reports (30-90 days) - Score 600
   - Other active conditions (not critical, not specialty-related) - Score 550

4. **LOW Bucket (Score: 300-400)** - Historical reference:
   - Older reports (90+ days) - Score 400
   - Resolved/historical conditions - Score 350
   - Mild allergies - Score 300

**Specialty Mappings:**
- Cardiology: ECG, Echo, Cardiac, Heart, Cardiovascular
- Neurology: MRI, CT, Neuro, Brain, EEG
- Orthopedics: X-ray, Bone, Fracture, Joint
- Gastroenterology: Endoscopy, Colonoscopy, GI
- Pulmonology: Chest, Lung, Respiratory
- And 5 more specialties...

**Key Features:**
- ✅ Safety items NEVER hidden regardless of specialty
- ✅ Each item includes explanation for ranking
- ✅ Recency weighted (30 days = high, 90 days = medium, 90+ = low)
- ✅ Specialty-specific relevance scoring
- ✅ Results cached for performance
- ✅ All ranking operations fully audited

**API Endpoints Created:**
- `POST /api/context-engine/rank` - Generate ranked data for appointment
- `GET /api/context-engine/results/:appointmentId` - Get cached result
- `GET /api/context-engine/explain/:priority/:itemType` - Get ranking explanation

**Models Created:**
- `ContextEngineResult` - Stores ranked data with timestamps
- `Allergy` - Patient allergy records with severity levels

**Example Ranking Output:**
```javascript
{
  critical: [
    { type: "allergy", data: {...}, reason: "Severe allergy - life-threatening risk", score: 1000 },
    { type: "medication", data: {...}, reason: "Currently taking - interaction risk", score: 900 }
  ],
  high: [
    { type: "report", data: {...}, reason: "Recent cardiology-related investigation", score: 800 }
  ],
  medium: [...],
  low: [...]
}
```

### Files changed

- `server/services/contextEngine.js` (created - 290 lines)
- `server/models/ContextEngineResult.js` (created)
- `server/models/Allergy.js` (created)
- `server/routes/contextEngine.js` (created)
- `server/index.js` (updated - added context engine routes)

### Next action

Phase 6: Medication Safety Warnings - Implement drug interaction checker and allergy cross-reference.

---
