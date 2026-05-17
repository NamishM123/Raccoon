"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

// ── Demo profile ───────────────────────────────────────────────────────────────
// Full profile for demo patient Alex Rivera (she/her), trans woman, 29, on HRT
// 2+ years, post-orchiectomy, multiple health concerns for presentation showcasing.

const DEMO_PROFILE = {
  display_name: "Alex Rivera",
  legal_name: "Alex Rivera",
  pronouns: "she/her",
  age: "29",
  sex_assigned_at_birth: "male",
  anatomical_inventory:
    "Intact prostate. Testes removed — bilateral orchiectomy March 15, 2024. No uterus, cervix, or ovaries. Breast tissue present (approximately 2 years HRT-induced development).",
  hormone_regimen_summary:
    "Estradiol valerate 6 mg sublingual daily since January 2023 (dose increased from 2 mg → 3 mg → 6 mg over 14 months). Spironolactone 100 mg daily January 2023 – March 2024, discontinued after orchiectomy. Managed by Dr. Sarah Chen, Endocrinology, Seattle Gender Wellness Center.",
  allergies: [
    { id: "a1", substance: "Penicillin", reaction: "rash, urticaria" },
    { id: "a2", substance: "Sulfonamides", reaction: "hives, facial swelling" },
  ],
  medications: [
    { id: "m1", description: "Estradiol valerate 6 mg sublingual daily — HRT since January 2023" },
    { id: "m2", description: "Vitamin D3 2,000 IU daily — started September 2023 for deficiency" },
    { id: "m3", description: "Atorvastatin 10 mg daily — started January 2024 for hypercholesterolemia" },
  ],
  surgeries: [
    { id: "s1", description: "Bilateral orchiectomy (Dr. K. Pham, Swedish Medical Center)", date: "2024-03-15" },
  ],
  patient_preferences:
    "Please use she/her pronouns throughout the visit. I am a transgender woman and my hormone therapy is being managed separately by Dr. Sarah Chen at Seattle Gender Wellness Center. I am here for general wellness and any concerns unrelated to my HRT unless specifically noted.",
  recent_labs: [
    // Estradiol — 5 data points showing rise into target range
    { id: "l01", name: "Estradiol",    value: "45",   unit: "pg/mL",  date: "2023-01-15" },
    { id: "l02", name: "Estradiol",    value: "112",  unit: "pg/mL",  date: "2023-04-20" },
    { id: "l03", name: "Estradiol",    value: "178",  unit: "pg/mL",  date: "2023-09-10" },
    { id: "l04", name: "Estradiol",    value: "223",  unit: "pg/mL",  date: "2024-01-08" },
    { id: "l05", name: "Estradiol",    value: "245",  unit: "pg/mL",  date: "2024-06-20" },
    // Testosterone — dramatic suppression over time
    { id: "l06", name: "Testosterone", value: "480",  unit: "ng/dL",  date: "2023-01-15" },
    { id: "l07", name: "Testosterone", value: "210",  unit: "ng/dL",  date: "2023-04-20" },
    { id: "l08", name: "Testosterone", value: "55",   unit: "ng/dL",  date: "2023-09-10" },
    { id: "l09", name: "Testosterone", value: "22",   unit: "ng/dL",  date: "2024-01-08" },
    { id: "l10", name: "Testosterone", value: "12",   unit: "ng/dL",  date: "2024-06-20" },
    // Prolactin — slowly rising, worth watching
    { id: "l11", name: "Prolactin",    value: "7.2",  unit: "ng/mL",  date: "2023-01-15" },
    { id: "l12", name: "Prolactin",    value: "8.5",  unit: "ng/mL",  date: "2023-09-10" },
    { id: "l13", name: "Prolactin",    value: "12.2", unit: "ng/mL",  date: "2024-01-08" },
    { id: "l14", name: "Prolactin",    value: "15.8", unit: "ng/mL",  date: "2024-06-20" },
    // Vitamin D — deficient, now recovering
    { id: "l15", name: "Vitamin D",    value: "22",   unit: "ng/mL",  date: "2023-09-10" },
    { id: "l16", name: "Vitamin D",    value: "29",   unit: "ng/mL",  date: "2024-01-08" },
    { id: "l17", name: "Vitamin D",    value: "38",   unit: "ng/mL",  date: "2024-06-20" },
    // Cholesterol — peaked, now coming down on statin
    { id: "l18", name: "Cholesterol",  value: "198",  unit: "mg/dL",  date: "2023-09-10" },
    { id: "l19", name: "Cholesterol",  value: "215",  unit: "mg/dL",  date: "2024-01-08" },
    { id: "l20", name: "Cholesterol",  value: "178",  unit: "mg/dL",  date: "2024-06-20" },
    // LDL
    { id: "l21", name: "LDL",          value: "128",  unit: "mg/dL",  date: "2024-01-08" },
    { id: "l22", name: "LDL",          value: "98",   unit: "mg/dL",  date: "2024-06-20" },
    // Potassium — rose on spiro, normalized after stopping
    { id: "l23", name: "Potassium",    value: "4.1",  unit: "mEq/L",  date: "2023-01-15" },
    { id: "l24", name: "Potassium",    value: "4.2",  unit: "mEq/L",  date: "2023-04-20" },
    { id: "l25", name: "Potassium",    value: "4.8",  unit: "mEq/L",  date: "2023-09-10" },
    { id: "l26", name: "Potassium",    value: "5.0",  unit: "mEq/L",  date: "2024-01-08" },
    { id: "l27", name: "Potassium",    value: "4.3",  unit: "mEq/L",  date: "2024-06-20" },
    // Hemoglobin — gradually declining (expected on feminizing HRT)
    { id: "l28", name: "Hemoglobin",   value: "14.8", unit: "g/dL",   date: "2023-01-15" },
    { id: "l29", name: "Hemoglobin",   value: "13.9", unit: "g/dL",   date: "2023-09-10" },
    { id: "l30", name: "Hemoglobin",   value: "13.2", unit: "g/dL",   date: "2024-01-08" },
    { id: "l31", name: "Hemoglobin",   value: "12.8", unit: "g/dL",   date: "2024-06-20" },
    // ALT — elevated briefly, normalized
    { id: "l32", name: "ALT",          value: "38",   unit: "U/L",    date: "2023-09-10" },
    { id: "l33", name: "ALT",          value: "34",   unit: "U/L",    date: "2024-01-08" },
    { id: "l34", name: "ALT",          value: "31",   unit: "U/L",    date: "2024-06-20" },
  ],
  share_anonymously: false,
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    try {
      localStorage.setItem("seagull_profile_v1", JSON.stringify(DEMO_PROFILE));
      setStatus("done");
      // Redirect to profile after a short pause so user sees confirmation
      setTimeout(() => { window.location.href = "/places"; }, 1800);
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800">Loading Demo Profile…</h1>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">Demo Profile Loaded</h1>
            <p className="text-gray-500 text-sm mb-6">
              Alex Rivera's full profile has been seeded into the app.<br />
              Redirecting to Your Profile…
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-2">Demo patient: Alex Rivera (she/her)</p>
              <p>• Trans woman · 29 · 2.5 years on HRT</p>
              <p>• Estradiol valerate + post-orchiectomy</p>
              <p>• 16 lab data points across 7 metrics</p>
              <p>• Allergies, medications, surgical history</p>
              <p>• 3 PDF visit notes ready to upload</p>
            </div>
            <p className="mt-5 text-xs text-gray-400">
              PDFs to upload are in{" "}
              <code className="bg-gray-100 px-1 rounded">public/demo/</code>
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600 font-semibold">Failed to load demo profile.</p>
            <p className="text-sm text-gray-500 mt-2">Check that localStorage is enabled in your browser.</p>
          </>
        )}
      </div>
    </div>
  );
}
