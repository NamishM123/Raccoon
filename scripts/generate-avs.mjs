// Generates a realistic After Visit Summary PDF for testing Seagull's lab parsing,
// medication safety, and profile parsing code paths.
import { createElement as h } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { writeFileSync } from "fs";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 36,
    color: "#111",
    backgroundColor: "#fff",
  },
  // ── Header ──────────────────────────────────────────────────────────────
  headerBox: {
    backgroundColor: "#003865",
    color: "#fff",
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#fff" },
  headerSub: { fontSize: 8, color: "#cce4ff" },
  headerRight: { fontSize: 8, color: "#cce4ff", textAlign: "right" },

  // ── Patient info bar ────────────────────────────────────────────────────
  patientBar: {
    backgroundColor: "#f0f4f8",
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderRadius: 2,
  },
  patientCell: { flexDirection: "column", gap: 2 },
  patientLabel: { fontSize: 7, color: "#666", fontFamily: "Helvetica-Bold" },
  patientValue: { fontSize: 9 },

  // ── Section ─────────────────────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: "#e8eef5",
    borderLeftWidth: 3,
    borderLeftColor: "#003865",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 10,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#003865",
  },
  subsectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#444",
    marginTop: 5,
    marginBottom: 2,
  },
  body: { fontSize: 9, lineHeight: 1.5, marginBottom: 3 },
  bodyIndent: { fontSize: 9, lineHeight: 1.5, marginBottom: 2, marginLeft: 12 },
  bold: { fontFamily: "Helvetica-Bold" },

  // ── Lab table ───────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#003865",
    color: "#fff",
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#f7f9fb",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tableRowFlag: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#fff8e1",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  tableRowCritical: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#fdecea",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colTest:   { width: "34%", fontSize: 8 },
  colResult: { width: "14%", fontSize: 8, textAlign: "right" },
  colUnit:   { width: "16%", fontSize: 8, paddingLeft: 4 },
  colRef:    { width: "22%", fontSize: 8, color: "#555" },
  colFlag:   { width: "14%", fontSize: 8, textAlign: "center" },
  colHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fff" },

  flagH: { color: "#b71c1c", fontFamily: "Helvetica-Bold" },
  flagL: { color: "#1565c0", fontFamily: "Helvetica-Bold" },
  flagCrit: { color: "#b71c1c", fontFamily: "Helvetica-Bold" },

  // ── Med table ───────────────────────────────────────────────────────────
  medRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  medRowAlt: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    backgroundColor: "#f7f9fb",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colMedName: { width: "28%", fontSize: 8 },
  colMedDose: { width: "20%", fontSize: 8 },
  colMedRoute: { width: "18%", fontSize: 8 },
  colMedFreq: { width: "18%", fontSize: 8 },
  colMedSince: { width: "16%", fontSize: 8 },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: "#bbb",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: "#888" },
  disclaimer: {
    backgroundColor: "#fff8e1",
    borderWidth: 0.5,
    borderColor: "#f0c040",
    padding: 6,
    marginTop: 8,
    borderRadius: 2,
  },
  disclaimerText: { fontSize: 8, color: "#555", lineHeight: 1.4 },
});

// ── Data ─────────────────────────────────────────────────────────────────────
const PATIENT = {
  name: "Jordan Reyes",
  dob: "1995-08-14",
  mrn: "MRN-2948371",
  pronouns: "she/her",
  age: 29,
  provider: "Dr. Priya Mehta, MD — Comprehensive Gender Care",
  visit: "2026-05-14",
  location: "Cascade Health Center · 412 NE Irving St · Portland, OR 97212",
  phone: "(503) 555-0187",
  npi: "NPI 1234567890",
};

// Labs — deliberately chosen to exercise every verdict path in the parser:
//  · likely_normal_for_regimen  (E2, T, LH, FSH, Hgb, Hct, Na, K)
//  · borderline_ask_doctor      (Prolactin elevated, AST borderline)
//  · outside_hrt_explanation    (ALT flagged H — real concern)
//  · critical flag              (none — so the UI empty-state isn't triggered)
const LABS = [
  // ── Hormone panel ──────────────────────────────────────────────────────
  { section: "Hormone Panel", test: "Estradiol (E2)", result: "312", unit: "pg/mL", ref: "15–350 (HRT target)", flag: "", note: "" },
  { test: "Testosterone, Total", result: "18", unit: "ng/dL", ref: "<50 (feminizing HRT)", flag: "L", note: "" },
  { test: "Testosterone, Free", result: "1.4", unit: "pg/mL", ref: "<6.8 (female range)", flag: "", note: "" },
  { test: "LH", result: "0.5", unit: "mIU/mL", ref: "1.7–8.6", flag: "L", note: "" },
  { test: "FSH", result: "0.8", unit: "mIU/mL", ref: "1.5–12.4", flag: "L", note: "" },
  { test: "Prolactin", result: "42.1", unit: "ng/mL", ref: "2.0–29.2", flag: "H", note: "Recheck in 3 months; estrogen effect likely" },
  { test: "SHBG", result: "87", unit: "nmol/L", ref: "18–114 (female)", flag: "", note: "" },

  // ── Complete Blood Count ────────────────────────────────────────────────
  { section: "Complete Blood Count (CBC)", test: "WBC", result: "6.2", unit: "K/µL", ref: "4.5–11.0", flag: "", note: "" },
  { test: "RBC", result: "4.1", unit: "M/µL", ref: "3.9–5.2 (female)", flag: "", note: "" },
  { test: "Hemoglobin", result: "12.4", unit: "g/dL", ref: "11.6–15.0 (female)", flag: "", note: "" },
  { test: "Hematocrit", result: "37.2", unit: "%", ref: "35–45 (female)", flag: "", note: "" },
  { test: "MCV", result: "86", unit: "fL", ref: "80–100", flag: "", note: "" },
  { test: "Platelets", result: "218", unit: "K/µL", ref: "150–400", flag: "", note: "" },

  // ── Comprehensive Metabolic Panel ───────────────────────────────────────
  { section: "Comprehensive Metabolic Panel (CMP)", test: "Sodium", result: "138", unit: "mEq/L", ref: "136–145", flag: "", note: "" },
  { test: "Potassium", result: "5.2", unit: "mEq/L", ref: "3.5–5.1", flag: "H", note: "Borderline — spironolactone effect; repeat in 4 wks" },
  { test: "Chloride", result: "101", unit: "mEq/L", ref: "98–107", flag: "", note: "" },
  { test: "CO2 (Bicarbonate)", result: "25", unit: "mEq/L", ref: "22–29", flag: "", note: "" },
  { test: "BUN", result: "11", unit: "mg/dL", ref: "7–20", flag: "", note: "" },
  { test: "Creatinine", result: "0.63", unit: "mg/dL", ref: "0.50–1.10 (female)", flag: "", note: "" },
  { test: "eGFR", result: ">60", unit: "mL/min/1.73m²", ref: ">60", flag: "", note: "" },
  { test: "Glucose", result: "88", unit: "mg/dL", ref: "70–99", flag: "", note: "" },
  { test: "Calcium", result: "9.4", unit: "mg/dL", ref: "8.6–10.3", flag: "", note: "" },
  { test: "Total Protein", result: "7.1", unit: "g/dL", ref: "6.1–8.1", flag: "", note: "" },
  { test: "Albumin", result: "4.3", unit: "g/dL", ref: "3.5–5.0", flag: "", note: "" },

  // ── Liver Function ──────────────────────────────────────────────────────
  { section: "Liver Function Tests (LFT)", test: "AST (SGOT)", result: "38", unit: "U/L", ref: "10–40", flag: "", note: "Borderline upper limit; monitor" },
  { test: "ALT (SGPT)", result: "67", unit: "U/L", ref: "7–56", flag: "H", note: "Elevated — discuss with provider; spiro/E2 monitoring" },
  { test: "Alkaline Phosphatase", result: "74", unit: "U/L", ref: "44–147", flag: "", note: "" },
  { test: "Total Bilirubin", result: "0.8", unit: "mg/dL", ref: "0.2–1.2", flag: "", note: "" },

  // ── Lipid Panel ────────────────────────────────────────────────────────
  { section: "Lipid Panel (fasting ×12h)", test: "Total Cholesterol", result: "188", unit: "mg/dL", ref: "<200 (optimal)", flag: "", note: "" },
  { test: "LDL Cholesterol", result: "108", unit: "mg/dL", ref: "<130", flag: "", note: "" },
  { test: "HDL Cholesterol", result: "62", unit: "mg/dL", ref: ">50 (female)", flag: "", note: "" },
  { test: "Triglycerides", result: "142", unit: "mg/dL", ref: "<150", flag: "", note: "" },
  { test: "Non-HDL Cholesterol", result: "126", unit: "mg/dL", ref: "<160", flag: "", note: "" },

  // ── Other ───────────────────────────────────────────────────────────────
  { section: "Additional Markers", test: "HbA1c", result: "5.4", unit: "%", ref: "<5.7", flag: "", note: "" },
  { test: "TSH", result: "1.82", unit: "µIU/mL", ref: "0.40–4.50", flag: "", note: "" },
  { test: "Vitamin D, 25-OH", result: "28", unit: "ng/mL", ref: "30–100", flag: "L", note: "Mildly deficient; start D3 2000 IU/day" },
  { test: "Ferritin", result: "24", unit: "ng/mL", ref: "13–150 (female)", flag: "", note: "" },
];

const MEDICATIONS = [
  { name: "Estradiol valerate", dose: "4 mg", route: "IM injection", freq: "Every 7 days", since: "Jan 2022" },
  { name: "Spironolactone", dose: "100 mg", route: "Oral", freq: "Once daily", since: "Nov 2021" },
  { name: "Micronized Progesterone", dose: "100 mg", route: "Oral (bedtime)", freq: "Once nightly", since: "Jun 2023" },
  { name: "Vitamin D3 (NEW)", dose: "2000 IU", route: "Oral", freq: "Once daily", since: "Today" },
];

const SURGERIES = [
  { proc: "Bilateral orchiectomy", date: "March 15, 2023", surgeon: "Dr. A. Fontaine", facility: "Oregon Health & Science University" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function flagStyle(f) {
  if (f === "H") return styles.flagH;
  if (f === "L") return styles.flagL;
  if (f === "CRIT") return styles.flagCrit;
  return {};
}

function rowStyle(f, i) {
  if (f === "CRIT") return styles.tableRowCritical;
  if (f === "H" || f === "L") return styles.tableRowFlag;
  return i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
}

// ── PDF component ─────────────────────────────────────────────────────────────
function AVS() {
  const labSections = [];
  let currentSection = null;
  let currentRows = [];

  for (const lab of LABS) {
    if (lab.section) {
      if (currentSection) labSections.push({ title: currentSection, rows: currentRows });
      currentSection = lab.section;
      currentRows = [];
    }
    currentRows.push(lab);
  }
  if (currentSection) labSections.push({ title: currentSection, rows: currentRows });

  return h(
    Document,
    {},
    h(
      Page,
      { size: "LETTER", style: styles.page },

      // ── Header ─────────────────────────────────────────────────────────
      h(View, { style: styles.headerBox },
        h(View, { style: styles.headerLeft },
          h(Text, { style: styles.headerTitle }, "AFTER VISIT SUMMARY"),
          h(Text, { style: styles.headerSub }, "Cascade Health Center · Comprehensive Gender Care Program"),
          h(Text, { style: styles.headerSub }, PATIENT.location),
        ),
        h(View, { style: styles.headerRight },
          h(Text, {}, `Visit Date: ${PATIENT.visit}`),
          h(Text, {}, `Provider: ${PATIENT.provider}`),
          h(Text, {}, PATIENT.npi),
          h(Text, {}, PATIENT.phone),
        ),
      ),

      // ── Patient info bar ────────────────────────────────────────────────
      h(View, { style: styles.patientBar },
        h(View, { style: styles.patientCell },
          h(Text, { style: styles.patientLabel }, "PATIENT NAME"),
          h(Text, { style: styles.patientValue }, PATIENT.name),
        ),
        h(View, { style: styles.patientCell },
          h(Text, { style: styles.patientLabel }, "DATE OF BIRTH"),
          h(Text, { style: styles.patientValue }, `${PATIENT.dob} (Age ${PATIENT.age})`),
        ),
        h(View, { style: styles.patientCell },
          h(Text, { style: styles.patientLabel }, "PRONOUNS"),
          h(Text, { style: styles.patientValue }, PATIENT.pronouns),
        ),
        h(View, { style: styles.patientCell },
          h(Text, { style: styles.patientLabel }, "MRN"),
          h(Text, { style: styles.patientValue }, PATIENT.mrn),
        ),
        h(View, { style: styles.patientCell },
          h(Text, { style: styles.patientLabel }, "SEX ASSIGNED AT BIRTH"),
          h(Text, { style: styles.patientValue }, "Male"),
        ),
      ),

      // ── Visit reason ────────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "REASON FOR VISIT"),
      h(Text, { style: styles.body },
        "Routine 6-month HRT monitoring visit. Patient presents for labs review, medication reassessment, and follow-up on prior concerns regarding mood stability and injection site reactions."
      ),

      // ── Vitals ──────────────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "VITAL SIGNS"),
      h(View, { style: { flexDirection: "row", gap: 20, marginBottom: 4 } },
        ...[
          ["Blood Pressure", "118 / 74 mmHg"],
          ["Pulse", "72 bpm"],
          ["Temperature", "98.4 °F"],
          ["Weight", "148 lbs (67.1 kg)"],
          ["Height", "5′ 8″ (173 cm)"],
          ["BMI", "22.6"],
          ["SpO₂", "99%"],
        ].map(([label, val]) =>
          h(View, { key: label, style: { flexDirection: "column" } },
            h(Text, { style: styles.patientLabel }, label),
            h(Text, { style: { fontSize: 9 } }, val),
          )
        )
      ),

      // ── Assessment & Plan ────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "ASSESSMENT & PLAN"),

      h(Text, { style: styles.subsectionHeader }, "1. Feminizing HRT — Stable"),
      h(Text, { style: styles.body },
        "Estradiol levels (312 pg/mL) are within the mid-therapeutic range for feminizing HRT. Testosterone is well-suppressed at 18 ng/dL. Patient reports satisfactory feminization progress, stable mood, and no injection site complications. Continue current regimen."
      ),
      h(Text, { style: styles.bodyIndent }, "• Estradiol valerate 4 mg IM every 7 days — CONTINUE"),
      h(Text, { style: styles.bodyIndent }, "• Spironolactone 100 mg PO daily — CONTINUE with electrolyte monitoring"),
      h(Text, { style: styles.bodyIndent }, "• Micronized progesterone 100 mg PO nightly — CONTINUE"),

      h(Text, { style: styles.subsectionHeader }, "2. Elevated Prolactin — Monitor"),
      h(Text, { style: styles.body },
        "Prolactin at 42.1 ng/mL is mildly elevated above the standard female reference range (2.0–29.2 ng/mL). This is a common, expected finding on estrogen therapy. However, values above 30–40 ng/mL warrant monitoring. Pituitary adenoma (prolactinoma) is unlikely but should be ruled out if levels continue to rise."
      ),
      h(Text, { style: styles.bodyIndent }, "• Repeat prolactin in 3 months. If >50 ng/mL, order pituitary MRI."),
      h(Text, { style: styles.bodyIndent }, "• No medication change at this time."),

      h(Text, { style: styles.subsectionHeader }, "3. Elevated ALT / Borderline AST — Follow Up Required"),
      h(Text, { style: styles.body },
        "ALT is 67 U/L (reference <56), above the upper limit of normal. AST is borderline at 38 U/L. This warrants attention — estradiol and spironolactone can both affect hepatic metabolism. Patient denies alcohol use, new supplements, or herbal products. Hepatitis B/C not indicated by history."
      ),
      h(Text, { style: styles.bodyIndent }, "• Repeat LFTs in 4–6 weeks off alcohol and new supplements."),
      h(Text, { style: styles.bodyIndent }, "• If ALT remains >60 at recheck, consider hepatology referral and dose adjustment."),
      h(Text, { style: styles.bodyIndent }, "• Discussed with patient: liver enzymes can fluctuate; one elevated reading is not an emergency."),

      h(Text, { style: styles.subsectionHeader }, "4. Potassium — Borderline High (Spironolactone Effect)"),
      h(Text, { style: styles.body },
        "Potassium at 5.2 mEq/L is just above the upper limit of the reference range (3.5–5.1). Spironolactone is a potassium-sparing diuretic and mild hyperkalemia is an expected side effect. Patient is asymptomatic (no muscle weakness, palpitations)."
      ),
      h(Text, { style: styles.bodyIndent }, "• Avoid high-potassium foods (bananas, potatoes, spinach, supplements)."),
      h(Text, { style: styles.bodyIndent }, "• Repeat BMP in 4 weeks. If K+ ≥5.5 mEq/L, reduce spironolactone to 75 mg."),

      h(Text, { style: styles.subsectionHeader }, "5. Vitamin D Deficiency — New Supplement"),
      h(Text, { style: styles.body },
        "25-OH Vitamin D at 28 ng/mL is mildly deficient (optimal >30 ng/mL). Initiating supplementation."
      ),
      h(Text, { style: styles.bodyIndent }, "• START Vitamin D3 2000 IU PO once daily with food."),
      h(Text, { style: styles.bodyIndent }, "• Recheck 25-OH Vitamin D at next 6-month visit."),

      h(Text, { style: styles.subsectionHeader }, "6. Post-Orchiectomy Care — Ongoing"),
      h(Text, { style: styles.body },
        "Patient underwent bilateral orchiectomy on March 15, 2023 (27 months prior). Recovery complete; no ongoing surgical concerns. Bone density baseline DEXA scan overdue — ordered today."
      ),
      h(Text, { style: styles.bodyIndent }, "• DEXA scan ordered — schedule within 60 days."),
      h(Text, { style: styles.bodyIndent }, "• Continue estrogen replacement for bone protection."),

      h(Text, { style: styles.subsectionHeader }, "7. Mental Health Screening"),
      h(Text, { style: styles.body },
        "PHQ-9 score: 4 (minimal depression). GAD-7 score: 3 (minimal anxiety). Patient reports overall improved quality of life since starting HRT. Noted ongoing stress related to workplace — see provider note below."
      ),
      h(Text, { style: styles.bodyIndent }, "• Continue current mental health support. Referred to PFLAG support group."),

      // ── Provider note re: workplace ──────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "PROVIDER NOTE — WORKPLACE INCIDENT"),
      h(View, { style: styles.disclaimer },
        h(Text, { style: { ...styles.disclaimerText, fontFamily: "Helvetica-Bold", marginBottom: 3 } },
          "Patient disclosed a workplace discrimination incident (healthcare context) — documented at patient request."
        ),
        h(Text, { style: styles.disclaimerText },
          "Patient reported that on approximately May 8, 2026, a supervisor at her place of employment (Ridgeline Medical Group, Portland OR) referred to her by incorrect pronouns and her deadname during a staff meeting, despite prior written notice to HR of her legal name change. When patient requested correction, supervisor stated \"I'll call you what your badge says,\" and the badge had not been updated per patient's formal request submitted February 2026."
        ),
        h(Text, { style: styles.disclaimerText, marginTop: 3 },
          "Patient experienced distress and left the meeting. No physical altercation. Witnesses present: two colleagues (names withheld pending patient decision to file). Patient has preserved the original HR request email, the meeting notes, and a follow-up email to HR supervisor (Darren Kowalski) sent May 9, 2026."
        ),
        h(Text, { style: styles.disclaimerText, marginTop: 3 },
          "Provider recommends patient consult Oregon Bureau of Labor and Industries (BOLI) and the National Center for Transgender Equality for next steps. This note is made for the medical record at patient request."
        ),
      ),

      // ── Medications ─────────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "CURRENT MEDICATIONS"),
      h(View, { style: styles.tableHeader },
        h(Text, { style: { ...styles.colMedName, ...styles.colHeaderText } }, "Medication"),
        h(Text, { style: { ...styles.colMedDose, ...styles.colHeaderText } }, "Dose"),
        h(Text, { style: { ...styles.colMedRoute, ...styles.colHeaderText } }, "Route"),
        h(Text, { style: { ...styles.colMedFreq, ...styles.colHeaderText } }, "Frequency"),
        h(Text, { style: { ...styles.colMedSince, ...styles.colHeaderText } }, "Since"),
      ),
      ...MEDICATIONS.map((m, i) =>
        h(View, { key: i, style: i % 2 === 0 ? styles.medRow : styles.medRowAlt },
          h(Text, { style: styles.colMedName }, m.name),
          h(Text, { style: styles.colMedDose }, m.dose),
          h(Text, { style: styles.colMedRoute }, m.route),
          h(Text, { style: styles.colMedFreq }, m.freq),
          h(Text, { style: styles.colMedSince }, m.since),
        )
      ),

      // ── Surgical history ─────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "SURGICAL HISTORY"),
      ...SURGERIES.map((s, i) =>
        h(View, { key: i, style: { marginBottom: 3 } },
          h(Text, { style: styles.body },
            `${s.proc} · ${s.date} · Surgeon: ${s.surgeon} · Facility: ${s.facility}`
          ),
        )
      ),

      // ── Lab results ─────────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "LABORATORY RESULTS — Collected: 2026-05-14 · Resulted: 2026-05-14"),
      h(Text, { style: { fontSize: 8, color: "#666", marginBottom: 4 } },
        "Reference ranges adjusted for feminizing HRT where applicable. H = High · L = Low. " +
        "Highlighted rows indicate flagged values."
      ),

      // Table header once
      h(View, { style: styles.tableHeader },
        h(Text, { style: { ...styles.colTest, ...styles.colHeaderText } }, "Test"),
        h(Text, { style: { ...styles.colResult, ...styles.colHeaderText } }, "Result"),
        h(Text, { style: { ...styles.colUnit, ...styles.colHeaderText } }, "Unit"),
        h(Text, { style: { ...styles.colRef, ...styles.colHeaderText } }, "Reference"),
        h(Text, { style: { ...styles.colFlag, ...styles.colHeaderText } }, "Flag"),
      ),

      ...labSections.flatMap(({ title, rows }, si) => [
        h(View, { key: `sec-${si}`, style: { backgroundColor: "#dde6f0", paddingVertical: 2, paddingHorizontal: 4 } },
          h(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#003865" } }, title),
        ),
        ...rows.map((lab, ri) =>
          h(View, { key: `${si}-${ri}`, style: rowStyle(lab.flag, ri) },
            h(View, { style: styles.colTest },
              h(Text, { style: { fontSize: 8 } }, lab.test),
              lab.note ? h(Text, { style: { fontSize: 7, color: "#888" } }, lab.note) : null,
            ),
            h(Text, { style: { ...styles.colResult, ...(lab.flag ? flagStyle(lab.flag) : {}) } }, lab.result),
            h(Text, { style: styles.colUnit }, lab.unit),
            h(Text, { style: styles.colRef }, lab.ref),
            h(Text, { style: { ...styles.colFlag, ...(lab.flag ? flagStyle(lab.flag) : {}) } }, lab.flag || "—"),
          )
        ),
      ]),

      // ── Follow-up ────────────────────────────────────────────────────────
      h(Text, { style: styles.sectionHeader }, "FOLLOW-UP & NEXT STEPS"),
      ...[
        "Return in 4 weeks for repeat BMP (potassium and ALT recheck).",
        "Return in 3 months for repeat prolactin level.",
        "Schedule DEXA bone density scan within 60 days.",
        "Begin Vitamin D3 2000 IU daily — available OTC.",
        "Continue avoiding NSAIDs and excessive alcohol while on spironolactone.",
        "Next routine 6-month HRT monitoring visit: November 2026.",
        "MyChart message or call (503) 555-0187 with any concerns before next visit.",
      ].map((item, i) =>
        h(Text, { key: i, style: styles.bodyIndent }, `• ${item}`)
      ),

      // ── Disclaimer ───────────────────────────────────────────────────────
      h(View, { style: { ...styles.disclaimer, marginTop: 12 } },
        h(Text, { style: styles.disclaimerText },
          "CONFIDENTIALITY NOTICE: This document contains protected health information (PHI) under HIPAA. It is intended solely for the use of the patient named above and their authorized representatives. Unauthorized disclosure is prohibited."
        ),
      ),

      // ── Footer ───────────────────────────────────────────────────────────
      h(View, { style: styles.footer },
        h(Text, { style: styles.footerText }, `Patient: ${PATIENT.name} · MRN: ${PATIENT.mrn} · DOB: ${PATIENT.dob}`),
        h(Text, { style: styles.footerText }, `Generated: ${PATIENT.visit} · Cascade Health Center`),
      ),
    )
  );
}

// ── Render ────────────────────────────────────────────────────────────────────
const buf = await renderToBuffer(h(AVS));
writeFileSync("avs-jordan-reyes.pdf", buf);
console.log("✓ avs-jordan-reyes.pdf written");
