"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, ShieldCheck, Sparkles, ChevronDown, Loader2, Wand2, AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, Siren, Lock, HeartHandshake, ArrowRight } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { AuroraOverlay } from "@/components/ui/aurora-background";
import { cn } from "@/lib/cn";
import {
  emptyProfile,
  loadProfile,
  newId,
  saveProfile,
  type Allergy,
  type LabValue,
  type Medication,
  type Profile,
  type Surgery,
} from "@/lib/profile";

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
      <AuroraOverlay variant="sky" />
      <PageHero
        title={<>Type It Once<br />Use It Everywhere</>}
        description="Add your meds, surgeries, and labs once. The Previsit Card and Lab Check pull from here automatically, so you never retype anything."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-sea-ink/75">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-ink-primary font-bold">Stays on your device</span>
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
              title="Allergies"
              subtitle="Listed first on your Previsit Card so clinicians see it before prescribing."
              icon={<Siren className="h-7 w-7 text-status-banned" />}
              action={
                <Button size="sm" variant="secondary" onClick={addAllergy}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.allergies.length === 0 ? (
                <EmptyHint>No known allergies. Add one if you have any.</EmptyHint>
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

            <Section
              title="Anatomical Inventory"
              subtitle="What's actually in your body now. Cuts through gendered EHR defaults so the right screenings get ordered."
              icon={<span className="text-[1.75rem] leading-none" aria-hidden>🫀</span>}
            >
              <textarea
                value={profile.anatomical_inventory}
                onChange={(e) => update("anatomical_inventory", e.target.value)}
                onBlur={flashSaved}
                rows={2}
                placeholder="e.g. Cervix, ovaries, prostate present. Uterus removed 2023."
                className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </Section>

            <Section
              title="Medications"
              subtitle="One line each. Write it like you'd tell a friend. Formatting doesn't matter."
              action={
                <Button size="sm" variant="secondary" onClick={addMed}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
              className="relative z-20"
            >
              {profile.medications.length > 0 && (
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

            <Section
              title="Surgical History"
              subtitle="Past gender affirming procedures, or anything else relevant."
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
                      age={profile.age}
                      onChange={(patch) => updateSurgery(s.id, patch)}
                      onCommit={flashSaved}
                      onRemove={() => removeSurgery(s.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Recent Labs"
              subtitle="Optional. Adds context when a new number looks off."
              action={
                <Button size="sm" variant="secondary" onClick={addLab}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              }
            >
              {profile.recent_labs.length === 0 ? (
                <EmptyHint>
                  No labs logged. You can also just upload a bloodwork PDF in Lab Check.
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
              label="About You (Optional)"
              hint="Only used to personalize the Previsit Card."
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
                <div className="flex flex-col gap-3">
                  <TextField
                    label="Age"
                    value={profile.age}
                    onChange={(v) => update("age", v)}
                    onCommit={flashSaved}
                    inputMode="numeric"
                  />
                  <Button asChild className="w-full">
                    <Link href="/document">
                      Create My Previsit Card
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
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
              </div>
            </Disclosure>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
            <div className="glass rounded-card p-7 flex items-start gap-4">
              <Lock className="h-7 w-7 shrink-0 text-accent" />
              <div>
                <h2 className="text-subsection">Your Data, Your Machine</h2>
                <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                  Everything you type stays in this browser. Smart Fill sends
                  only the text you paste, nothing else, to Claude.
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
            </div>

            <div className="glass rounded-card p-7 flex items-start gap-4">
              <HeartHandshake className="h-7 w-7 shrink-0 text-status-protected" />
              <div>
                <h2 className="text-subsection">Help The Next Person</h2>
                <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                  Medical books have ranges for "men" and "women," not
                  "person on estradiol for 4 years."
                </p>
                <div className="my-4 border-t divider-soft" />
                <p className="text-meta text-ink-secondary leading-relaxed">
                  Opt in and your numbers (no name, no face) join the reference
                  set Lab Check uses to show people what normal actually looks
                  like.
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
                    style={{ accentColor: "#BAE6FD" }}
                  />
                  <span className="text-meta text-ink-primary">
                    Share my labs and regimen anonymously
                  </span>
                </label>
              </div>
            </div>

            <div className="glass rounded-card p-7 flex items-start gap-4">
              <Save className="h-7 w-7 shrink-0 text-ink-secondary" />
              <div>
                <h2 className="text-subsection">Saved As You Type</h2>
                <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                  No save button. Every field commits to local storage the
                  moment you stop typing.
                </p>
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
        <Sparkles className="h-7 w-7 text-accent" />
        <h2 className="text-subsection">Smart Fill</h2>
      </div>
      <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
        Describe your regimen in a sentence or two. We'll fill the structured
        fields below so you don't have to.
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
          Adds to your profile. Won't overwrite what's already there.
        </span>
        <Button
          onClick={run}
          disabled={!text.trim() || busy}
          className="btn-glow-blue"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Fill From This
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
            RxNorm Matches
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
            <ShieldCheck className="h-7 w-7 text-accent" />
            <h2 className="text-subsection">Drug Safety Check</h2>
          </div>
          <p className="mt-1 text-meta text-ink-secondary">
            Live check against FDA drug recall and adverse event databases.
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
                    {it.adverse.total_reports.toLocaleString()} adverse event reports on file
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
                    Top Reported Reactions
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {it.adverse.top_reactions.map((r) => (
                      <span
                        key={r.term}
                        className="text-meta px-2 py-0.5 rounded-chip bg-surface text-ink-primary"
                      >
                        {r.term.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
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

function SurgeryRow({
  surgery,
  age,
  onChange,
  onCommit,
  onRemove,
}: {
  surgery: Surgery;
  age: string;
  onChange: (patch: Partial<Surgery>) => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const parsedAge = parseInt(age, 10);
  const hasAge = Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 130;
  const minYear = hasAge ? currentYear - parsedAge : 1900;

  const descError = useMemo(() => {
    if (!surgery.description.trim()) return null;
    if (/\d/.test(surgery.description)) return "Letters only.";
    return null;
  }, [surgery.description]);

  const dateError = useMemo(() => {
    if (!surgery.date.trim()) return null;
    if (/[^0-9\-\/]/.test(surgery.date)) return "Numbers only.";
    const yearMatch = surgery.date.match(/(\d{4})/);
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[1], 10);
    if (year > currentYear) return "Can't be in the future.";
    if (year < minYear) return hasAge ? "Before you were born." : "Year looks too far back.";
    return null;
  }, [surgery.date, minYear, currentYear, hasAge]);

  const hasError = Boolean(descError || dateError);

  function handleDescChange(v: string) {
    onChange({ description: v.replace(/[0-9]/g, "") });
  }
  function handleDateChange(v: string) {
    onChange({ date: v.replace(/[^0-9\-\/]/g, "") });
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-btn border bg-surface px-3 py-2",
          hasError ? "border-status-banned/50" : "border-divider"
        )}
      >
        <input
          value={surgery.description}
          onChange={(e) => handleDescChange(e.target.value)}
          onBlur={onCommit}
          placeholder="e.g. Top surgery"
          className="flex-[2] bg-transparent text-body focus:outline-none"
        />
        <input
          value={surgery.date}
          onChange={(e) => handleDateChange(e.target.value)}
          onBlur={onCommit}
          inputMode="numeric"
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
      {hasError && (
        <div className="mt-1 px-3 text-meta text-status-banned flex flex-wrap gap-x-4 gap-y-0.5">
          {descError && <span>{descError}</span>}
          {dateError && <span>{dateError}</span>}
        </div>
      )}
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
  icon,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-card p-7", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-subsection">{title}</h2>
          </div>
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
    <div className="flex items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2">
      <Siren className="h-4 w-4 text-status-banned shrink-0" />
      <input
        value={allergy.substance}
        onChange={(e) => onChange({ substance: e.target.value })}
        onBlur={onCommit}
        placeholder="Substance (e.g. penicillin)"
        className="flex-[1] min-w-0 bg-transparent text-body focus:outline-none"
      />
      <input
        value={allergy.reaction}
        onChange={(e) => onChange({ reaction: e.target.value })}
        onBlur={onCommit}
        placeholder="Reaction (e.g. hives, anaphylaxis)"
        className="flex-[1] min-w-0 bg-transparent text-body text-ink-secondary focus:outline-none border-l border-divider pl-2"
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
