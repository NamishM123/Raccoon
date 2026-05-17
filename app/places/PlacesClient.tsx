"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Save, ShieldCheck, Sparkles, ChevronDown, Loader2, Wand2, AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, Heart, Activity } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import {
  ageFromDob,
  emptyProfile,
  inferHrtDirection,
  loadProfile,
  newId,
  saveProfile,
  type Allergy,
  type AnatomyInventory,
  type AnatomyState,
  type HrtDirection,
  type LabValue,
  type Medication,
  type Profile,
  type Surgery,
} from "@/lib/profile";
import {
  findInteractions,
  SEVERITY_LABEL,
  type InteractionSeverity,
} from "@/lib/hrt_interactions";

export function PlacesClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setAboutOpen(Boolean(p.display_name || p.pronouns || p.age || p.sex_assigned_at_birth));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveProfile(profile);
  }, [profile, loaded]);

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function addMed() {
    setProfile((p) => ({
      ...p,
      medications: [...p.medications, { id: newId(), description: "" }],
    }));
  }
  function updateMed(id: string, description: string) {
    setProfile((p) => ({
      ...p,
      medications: p.medications.map((m) => (m.id === id ? { ...m, description } : m)),
    }));
  }
  function removeMed(id: string) {
    setProfile((p) => ({ ...p, medications: p.medications.filter((m) => m.id !== id) }));
  }

  function addSurgery() {
    setProfile((p) => ({
      ...p,
      surgeries: [...p.surgeries, { id: newId(), description: "", date: "" }],
    }));
  }
  function updateSurgery(id: string, patch: Partial<Surgery>) {
    setProfile((p) => ({
      ...p,
      surgeries: p.surgeries.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }
  function removeSurgery(id: string) {
    setProfile((p) => ({ ...p, surgeries: p.surgeries.filter((s) => s.id !== id) }));
  }

  function addLab() {
    setProfile((p) => ({
      ...p,
      recent_labs: [
        ...p.recent_labs,
        { id: newId(), name: "", value: "", unit: "", date: "" },
      ],
    }));
  }
  function updateLab(id: string, patch: Partial<LabValue>) {
    setProfile((p) => ({
      ...p,
      recent_labs: p.recent_labs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }
  function removeLab(id: string) {
    setProfile((p) => ({ ...p, recent_labs: p.recent_labs.filter((l) => l.id !== id) }));
  }

  function addAllergy() {
    setProfile((p) => ({
      ...p,
      allergies: [...p.allergies, { id: newId(), substance: "", reaction: "" }],
    }));
  }
  function updateAllergy(id: string, patch: Partial<Allergy>) {
    setProfile((p) => ({
      ...p,
      allergies: p.allergies.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }
  function removeAllergy(id: string) {
    setProfile((p) => ({ ...p, allergies: p.allergies.filter((a) => a.id !== id) }));
  }

  function setAnatomy(key: keyof AnatomyInventory, value: AnatomyState) {
    setProfile((p) => ({ ...p, anatomy: { ...p.anatomy, [key]: value } }));
    flashSaved();
  }

  function applySmartFill(result: {
    regimen_summary: string;
    medications: Array<{ description: string }>;
    surgeries: Array<{ description: string; date: string }>;
  }) {
    setProfile((p) => ({
      ...p,
      hormone_regimen_summary: result.regimen_summary || p.hormone_regimen_summary,
      medications: [
        ...p.medications,
        ...result.medications.map((m) => ({ id: newId(), description: m.description })),
      ],
      surgeries: [
        ...p.surgeries,
        ...result.surgeries.map((s) => ({ id: newId(), description: s.description, date: s.date })),
      ],
    }));
    flashSaved();
  }

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Your profile"
        title="Type it once. Use it everywhere."
        description="The Pre-visit Card and Lab Check both read from this. Lives in your browser. Never sent to a server unless you opt in below."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-sea-ink/75">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-ink-primary font-bold">Local-only</span> by default
          </span>
          <span className={cn("transition-opacity", savedFlash ? "opacity-100" : "opacity-0")}>
            <span className="text-status-protected font-bold">Saved</span>
          </span>
        </div>
      </PageHero>

      <Container className="pb-16">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <SmartFill onApply={applySmartFill} />

            <Section
              title="Medications"
              subtitle="One line each. Don't worry about formatting — write it like you'd tell a friend."
              action={
                <Button size="sm" variant="secondary" onClick={addMed}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.medications.length === 0 ? (
                <EmptyHint>
                  No medications yet. Use "Smart fill" above, or click "Add".
                </EmptyHint>
              ) : (
                <div className="space-y-2">
                  {profile.medications.map((m) => (
                    <MedRow
                      key={m.id}
                      med={m}
                      onChange={(v) => updateMed(m.id, v)}
                      onCommit={flashSaved}
                      onRemove={() => removeMed(m.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <DrugSafety medications={profile.medications} />

            <InteractionChecker medications={profile.medications} />

            <Section
              title="Surgical history"
              subtitle="Past gender-affirming procedures, or anything else relevant."
              action={
                <Button size="sm" variant="secondary" onClick={addSurgery}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.surgeries.length === 0 ? (
                <EmptyHint>No surgeries logged.</EmptyHint>
              ) : (
                <div className="space-y-2">
                  {profile.surgeries.map((s) => (
                    <SurgeryRow
                      key={s.id}
                      surgery={s}
                      onChange={(patch) => updateSurgery(s.id, patch)}
                      onCommit={flashSaved}
                      onRemove={() => removeSurgery(s.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Allergies"
              subtitle="Shown in red at the top of the visit card and the wallet card."
              action={
                <Button size="sm" variant="secondary" onClick={addAllergy}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.allergies.length === 0 ? (
                <EmptyHint>
                  No allergies logged. If you have none, you can leave this empty —
                  the card will show "No known allergies".
                </EmptyHint>
              ) : (
                <div className="space-y-2">
                  {profile.allergies.map((a) => (
                    <AllergyRow
                      key={a.id}
                      allergy={a}
                      onChange={(patch) => updateAllergy(a.id, patch)}
                      onCommit={flashSaved}
                      onRemove={() => removeAllergy(a.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <AnatomySection anatomy={profile.anatomy} onSet={setAnatomy} />

            <Section
              title="Recent labs"
              subtitle="Optional. Adds context when a new number looks off."
              action={
                <Button size="sm" variant="secondary" onClick={addLab}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.recent_labs.length === 0 ? (
                <EmptyHint>
                  No labs logged. You can also just upload a blood-work PDF in Lab Check.
                </EmptyHint>
              ) : (
                <div className="space-y-2">
                  {profile.recent_labs.map((l) => (
                    <LabRow
                      key={l.id}
                      lab={l}
                      onChange={(patch) => updateLab(l.id, patch)}
                      onCommit={flashSaved}
                      onRemove={() => removeLab(l.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Disclosure
              open={aboutOpen}
              onToggle={() => setAboutOpen((v) => !v)}
              label="About you (optional)"
              hint="Personalizes the visit card and wallet card. Used locally."
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField
                  label="Name (or what you go by)"
                  value={profile.display_name}
                  onChange={(v) => update("display_name", v)}
                  onCommit={flashSaved}
                />
                <TextField
                  label="Pronouns"
                  value={profile.pronouns}
                  onChange={(v) => update("pronouns", v)}
                  onCommit={flashSaved}
                  placeholder="she/her, they/them, …"
                />
                <div>
                  <FieldLabel>Date of birth</FieldLabel>
                  <input
                    type="date"
                    value={profile.dob}
                    onChange={(e) => update("dob", e.target.value)}
                    onBlur={flashSaved}
                    className="mt-2 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  {ageFromDob(profile.dob) !== null && (
                    <div className="mt-1 text-meta text-ink-secondary">
                      Age {ageFromDob(profile.dob)}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Sex assigned at birth</FieldLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["male", "female", "intersex"] as const).map((s) => (
                      <Pill
                        key={s}
                        selected={profile.sex_assigned_at_birth === s}
                        onClick={() => {
                          update(
                            "sex_assigned_at_birth",
                            profile.sex_assigned_at_birth === s ? "" : s
                          );
                          flashSaved();
                        }}
                      >
                        {s[0].toUpperCase() + s.slice(1)}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>HRT direction</FieldLabel>
                  <p className="mt-1 text-meta text-ink-secondary">
                    Picks which lab target ranges Lab Check uses.
                    {!profile.hrt_direction && inferHrtDirection(profile) && (
                      <>
                        {" "}Guess from your meds:{" "}
                        <span className="text-ink-primary font-bold">
                          {inferHrtDirection(profile)}
                        </span>
                        .
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["feminizing", "masculinizing", "nonbinary", "none"] as const).map((d) => (
                      <Pill
                        key={d}
                        selected={profile.hrt_direction === d}
                        onClick={() => {
                          update(
                            "hrt_direction",
                            profile.hrt_direction === d ? "" : (d as HrtDirection)
                          );
                          flashSaved();
                        }}
                      >
                        {d === "none" ? "Not on HRT" : d[0].toUpperCase() + d.slice(1)}
                      </Pill>
                    ))}
                  </div>
                </div>
                <TextField
                  label="Emergency contact"
                  value={profile.emergency_contact}
                  onChange={(v) => update("emergency_contact", v)}
                  onCommit={flashSaved}
                  placeholder="Name + phone"
                />
                <TextField
                  label="Prescribing provider"
                  value={profile.provider_contact}
                  onChange={(v) => update("provider_contact", v)}
                  onCommit={flashSaved}
                  placeholder="Clinic + phone"
                />
              </div>
            </Disclosure>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
            <div className="glass rounded-card p-7">
              <h2 className="text-subsection">Your data, your machine</h2>
              <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
                Everything you type is saved only in this browser. The smart-fill
                feature sends just the text you paste to Claude and nothing else.
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (confirm("Clear all profile data from this browser?")) {
                      setProfile(emptyProfile());
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Clear all data
                </Button>
              </div>
            </div>

            <div className="glass rounded-card p-7">
              <h2 className="text-subsection">Help the next person</h2>
              <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
                Medical books mostly have ranges for "men" and "women" — not
                "person on estradiol for 4 years." Opt in and your numbers (no
                name, no face) join a reference set the Lab Check uses to tell
                people what normal actually looks like.
              </p>
              <label className="mt-5 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.share_anonymously}
                  onChange={(e) => {
                    update("share_anonymously", e.target.checked);
                    flashSaved();
                  }}
                  className="mt-1 h-4 w-4 rounded border-divider"
                />
                <span className="text-meta text-ink-primary">
                  Share my labs and regimen anonymously
                </span>
              </label>
            </div>

            <div className="glass rounded-card p-7">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-ink-secondary" />
                <span className="text-meta text-ink-secondary">
                  Saves automatically as you type.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function SmartFill({
  onApply,
}: {
  onApply: (r: {
    regimen_summary: string;
    medications: Array<{ description: string }>;
    surgeries: Array<{ description: string; date: string }>;
  }) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setErr(data?.error || "Couldn't parse that.");
      } else {
        onApply(data);
        setText("");
      }
    } catch (e: any) {
      setErr(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-subsection">Smart fill</h2>
      </div>
      <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
        Describe your regimen and history in a sentence or two. We'll fill in
        the structured fields below so you don't have to.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. I'm on estradiol valerate 4mg IM weekly and spiro 100mg twice daily, started July 2022. Had top surgery in March 2024."
        className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-meta text-ink-secondary">
          Adds to your profile — doesn't replace anything you already typed.
        </span>
        <Button onClick={run} disabled={!text.trim() || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Fill from this
            </>
          )}
        </Button>
      </div>
      {err && (
        <div className="mt-3 text-meta text-status-banned">{err}</div>
      )}
    </div>
  );
}

function MedRow({
  med,
  onChange,
  onCommit,
  onRemove,
}: {
  med: Medication;
  onChange: (v: string) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Array<{ rxcui: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Pull the searchable head off the description (first word or two).
  const head = useMemo(() => med.description.split(/[\s,·]+/)[0] || "", [med.description]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (!head || head.length < 2 || !open) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/meds/search?q=${encodeURIComponent(head)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.candidates) ? data.candidates : []);
      } catch {
        /* ignore aborts */
      }
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [head, open]);

  function applySuggestion(name: string) {
    const rest = med.description.slice(head.length);
    onChange(`${name}${rest}`);
    setOpen(false);
    setActive(-1);
    onCommit();
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2">
        <FlaskConical className="h-4 w-4 text-ink-secondary shrink-0" />
        <input
          value={med.description}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so click on a suggestion can register first.
            setTimeout(() => setOpen(false), 120);
            onCommit();
          }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              applySuggestion(suggestions[active].name);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="e.g. Estradiol 4 mg IM weekly since Jan 2022"
          className="flex-1 bg-transparent text-body focus:outline-none"
        />
        <button
          onClick={onRemove}
          className="text-ink-secondary hover:text-status-banned p-1"
          aria-label="Remove medication"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 z-20 glass-strong rounded-btn border border-divider shadow-cardHover overflow-hidden">
          <div className="px-3 py-1.5 text-meta uppercase tracking-[0.12em] text-ink-secondary border-b divider-soft">
            RxNorm matches
          </div>
          {suggestions.map((s, i) => (
            <button
              key={s.rxcui}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applySuggestion(s.name)}
              className={cn(
                "w-full text-left px-3 py-2 text-body hover:bg-surface-inset transition-colors",
                i === active && "bg-surface-inset"
              )}
            >
              <span className="text-ink-primary">{s.name}</span>
              <span className="ml-2 text-meta text-ink-secondary">RxCUI {s.rxcui}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DrugSafety({ medications }: { medications: Medication[] }) {
  const drugs = useMemo(
    () => medications.map((m) => m.description.split(/[\s,·]+/)[0]).filter(Boolean),
    [medications]
  );
  const [items, setItems] = useState<Array<{
    drug: string;
    recalls: Array<{
      recall_number: string;
      recall_initiation_date: string;
      classification: string;
      reason_for_recall: string;
      recalling_firm: string;
      product_description: string;
    }>;
    adverse: { total_reports: number; top_reactions: Array<{ term: string; count: number }> } | null;
  }>>([]);
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!drugs.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meds/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugs }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || "Couldn't check the FDA.");
      else {
        setItems(data.items || []);
        setCheckedAt(new Date().toLocaleString());
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (drugs.length === 0) return null;

  const recallCount = items.reduce((acc, it) => acc + it.recalls.length, 0);

  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="text-subsection">Drug safety check</h2>
          </div>
          <p className="mt-1 text-meta text-ink-secondary">
            Live lookup against the FDA's drug recall & adverse-event databases.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={run} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </>
          ) : (
            <>Check now</>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-card bg-status-banned/10 px-4 py-3 text-meta text-status-banned">
          {error}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="text-meta text-ink-secondary">
            Last checked {checkedAt} ·{" "}
            {recallCount === 0 ? (
              <span className="text-status-protected font-bold">No active recalls</span>
            ) : (
              <span className="text-status-restricted font-bold">
                {recallCount} recall{recallCount === 1 ? "" : "s"} found
              </span>
            )}
          </div>
          {items.map((it) => (
            <div key={it.drug} className="rounded-card border border-divider bg-surface-inset/30 p-4">
              <div className="flex items-center gap-2">
                {it.recalls.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-status-protected" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-status-restricted" />
                )}
                <span className="text-body text-ink-primary font-bold capitalize">
                  {it.drug}
                </span>
                {it.adverse && (
                  <span className="ml-auto text-meta text-ink-secondary">
                    {it.adverse.total_reports.toLocaleString()} adverse-event reports on file
                  </span>
                )}
              </div>
              {it.recalls.length === 0 ? (
                <div className="mt-2 text-meta text-ink-secondary">
                  No recent FDA recalls for this drug.
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {it.recalls.map((r) => (
                    <li
                      key={r.recall_number}
                      className="rounded-btn border border-divider bg-surface px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-meta">
                        <span className="uppercase tracking-[0.1em] font-bold text-status-restricted">
                          {r.classification || "recall"}
                        </span>
                        <span className="text-ink-secondary">
                          {r.recall_initiation_date}
                        </span>
                      </div>
                      <div className="mt-1 text-meta text-ink-primary leading-snug">
                        {r.reason_for_recall}
                      </div>
                      <div className="mt-1 text-meta text-ink-secondary">
                        {r.recalling_firm}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {it.adverse?.top_reactions?.length ? (
                <div className="mt-3">
                  <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
                    Top reported reactions
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {it.adverse.top_reactions.map((r) => (
                      <span
                        key={r.term}
                        className="text-meta px-2 py-0.5 rounded-chip bg-surface text-ink-primary"
                      >
                        {r.term.toLowerCase()}{" "}
                        <span className="text-ink-secondary">({r.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <div className="text-meta text-ink-secondary">
            Source: openFDA.{" "}
            <a
              href="https://open.fda.gov/apis/drug/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline inline-flex items-center gap-1"
            >
              About this data <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractionChecker({ medications }: { medications: Medication[] }) {
  const hits = useMemo(() => findInteractions(medications), [medications]);
  if (hits.length === 0) return null;

  const severityClass: Record<InteractionSeverity, string> = {
    warning: "border-status-banned/40 bg-status-banned/5",
    caution: "border-status-restricted/40 bg-status-restricted/5",
    watch: "border-divider bg-surface-inset/40",
  };
  const severityTextClass: Record<InteractionSeverity, string> = {
    warning: "text-status-banned",
    caution: "text-status-restricted",
    watch: "text-ink-secondary",
  };

  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-accent" />
        <h2 className="text-subsection">HRT-relevant interactions</h2>
      </div>
      <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
        A curated short list of combinations that come up enough on HRT to
        flag. Not a full interaction database — talk to your pharmacist for
        the complete picture.
      </p>
      <div className="mt-5 space-y-3">
        {hits.map(({ rule, matched }) => (
          <div
            key={rule.id}
            className={cn(
              "rounded-card border p-4",
              severityClass[rule.severity]
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn("h-4 w-4 shrink-0", severityTextClass[rule.severity])}
              />
              <span className={cn("text-meta uppercase tracking-[0.12em] font-bold", severityTextClass[rule.severity])}>
                {SEVERITY_LABEL[rule.severity]}
              </span>
            </div>
            <div className="mt-1 text-body text-ink-primary font-bold leading-snug">
              {rule.title}
            </div>
            <p className="mt-2 text-meta text-ink-primary leading-relaxed">
              {rule.explanation}
            </p>
            <p className="mt-2 text-meta text-ink-primary leading-relaxed">
              <span className="font-bold">What to do: </span>
              {rule.what_to_do}
            </p>
            <div className="mt-2 text-meta text-ink-secondary">
              Matched: {matched.join(" · ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurgeryRow({
  surgery,
  onChange,
  onCommit,
  onRemove,
}: {
  surgery: Surgery;
  onChange: (patch: Partial<Surgery>) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2">
      <input
        value={surgery.description}
        onChange={(e) => onChange({ description: e.target.value })}
        onBlur={onCommit}
        placeholder="e.g. Top surgery"
        className="flex-[2] bg-transparent text-body focus:outline-none"
      />
      <input
        value={surgery.date}
        onChange={(e) => onChange({ date: e.target.value })}
        onBlur={onCommit}
        placeholder="2024-03"
        className="flex-[1] min-w-0 bg-transparent text-body text-ink-secondary focus:outline-none border-l border-divider pl-2"
      />
      <button
        onClick={onRemove}
        className="text-ink-secondary hover:text-status-banned p-1"
        aria-label="Remove surgery"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AllergyRow({
  allergy,
  onChange,
  onCommit,
  onRemove,
}: {
  allergy: Allergy;
  onChange: (patch: Partial<Allergy>) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-btn border border-status-banned/30 bg-status-banned/5 px-3 py-2">
      <AlertTriangle className="h-4 w-4 text-status-banned shrink-0" />
      <input
        value={allergy.substance}
        onChange={(e) => onChange({ substance: e.target.value })}
        onBlur={onCommit}
        placeholder="Substance (e.g. penicillin, latex)"
        className="flex-[2] bg-transparent text-body focus:outline-none"
      />
      <input
        value={allergy.reaction}
        onChange={(e) => onChange({ reaction: e.target.value })}
        onBlur={onCommit}
        placeholder="Reaction (e.g. hives, anaphylaxis)"
        className="flex-[2] min-w-0 bg-transparent text-body text-ink-secondary focus:outline-none border-l border-divider pl-2"
      />
      <button
        onClick={onRemove}
        className="text-ink-secondary hover:text-status-banned p-1"
        aria-label="Remove allergy"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

const ANATOMY_FIELDS: Array<{
  key: keyof AnatomyInventory;
  label: string;
  hint: string;
}> = [
  { key: "cervix", label: "Cervix", hint: "Pap smear screening depends on this." },
  { key: "uterus", label: "Uterus", hint: "" },
  { key: "ovaries", label: "Ovaries", hint: "" },
  { key: "breasts", label: "Breast tissue", hint: "Mammogram screening depends on this." },
  { key: "prostate", label: "Prostate", hint: "Still present after bottom surgery." },
  { key: "testes", label: "Testes", hint: "" },
  { key: "penis", label: "Penis", hint: "" },
];

function AnatomySection({
  anatomy,
  onSet,
}: {
  anatomy: AnatomyInventory;
  onSet: (key: keyof AnatomyInventory, value: AnatomyState) => void;
}) {
  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            <h2 className="text-subsection">Anatomy inventory</h2>
          </div>
          <p className="mt-1 text-meta text-ink-secondary leading-relaxed">
            What organs are present. This is what tells a doctor whether to do a Pap,
            a prostate exam, a mammogram. Optional — leave blank if you'd rather not.
          </p>
        </div>
      </div>
      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        {ANATOMY_FIELDS.map((f) => (
          <div
            key={f.key}
            className="rounded-btn border border-divider bg-surface px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-body text-ink-primary">{f.label}</div>
              <div className="flex gap-1">
                {(["present", "absent", ""] as const).map((v) => (
                  <button
                    key={v || "unknown"}
                    onClick={() => onSet(f.key, v)}
                    className={cn(
                      "text-meta px-2 py-1 rounded-chip transition-colors",
                      anatomy[f.key] === v
                        ? "bg-accent/15 text-accent font-bold"
                        : "text-ink-secondary hover:bg-surface-inset"
                    )}
                  >
                    {v === "" ? "Skip" : v}
                  </button>
                ))}
              </div>
            </div>
            {f.hint && (
              <div className="mt-1 text-meta text-ink-secondary">{f.hint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LabRow({
  lab,
  onChange,
  onCommit,
  onRemove,
}: {
  lab: LabValue;
  onChange: (patch: Partial<LabValue>) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2">
      <input
        value={lab.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={onCommit}
        placeholder="Test"
        className="bg-transparent text-body focus:outline-none"
      />
      <input
        value={lab.value}
        onChange={(e) => onChange({ value: e.target.value })}
        onBlur={onCommit}
        placeholder="Value"
        className="bg-transparent text-body focus:outline-none border-l border-divider pl-2"
      />
      <input
        value={lab.unit}
        onChange={(e) => onChange({ unit: e.target.value })}
        onBlur={onCommit}
        placeholder="Unit"
        className="bg-transparent text-body focus:outline-none border-l border-divider pl-2"
      />
      <input
        value={lab.date}
        onChange={(e) => onChange({ date: e.target.value })}
        onBlur={onCommit}
        placeholder="Date"
        className="bg-transparent text-body text-ink-secondary focus:outline-none border-l border-divider pl-2"
      />
      <button
        onClick={onRemove}
        className="text-ink-secondary hover:text-status-banned p-1"
        aria-label="Remove lab"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-subsection">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-meta text-ink-secondary">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Disclosure({
  open,
  onToggle,
  label,
  hint,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-7 py-5 hover:bg-surface-inset/40 transition-colors text-left"
      >
        <div>
          <div className="text-subsection text-ink-primary">{label}</div>
          {hint && <div className="mt-0.5 text-meta text-ink-secondary">{hint}</div>}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-ink-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t divider-soft px-7 py-6">{children}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  placeholder?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface-inset px-5 py-4 text-meta text-ink-secondary">
      {children}
    </div>
  );
}
