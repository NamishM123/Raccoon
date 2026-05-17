import type { ProcedureKey } from "@/types";

export interface VerifiedSource {
  title: string;
  publisher: string;
  url: string;
  note?: string;
}

// Curated, hand-vetted sources per procedure. These are the links we'd
// hand a patient asking "where do I read the actual clinical / legal
// guidance instead of a stranger's anecdote?" Keep this list short and
// authoritative — quality over quantity.
export const VERIFIED_SOURCES_BY_PROCEDURE: Record<ProcedureKey, VerifiedSource[]> = {
  hrt_adult: [
    {
      title: "Standards of Care, Version 8",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
      note: "International clinical guideline for transgender health.",
    },
    {
      title: "Endocrine Treatment of Gender-Dysphoric/Gender-Incongruent Persons",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
      note: "Peer-reviewed clinical practice guideline.",
    },
    {
      title: "Transgender Hormone Therapy Overview",
      publisher: "UCSF Gender Affirming Health Program",
      url: "https://transcare.ucsf.edu/guidelines",
      note: "Patient-facing primary-care protocols.",
    },
    {
      title: "Hormone Therapy",
      publisher: "Planned Parenthood",
      url: "https://www.plannedparenthood.org/learn/gender-identity/transgender/what-do-i-need-know-about-trans-and-gender-nonconforming-identities",
    },
  ],
  hrt_minor: [
    {
      title: "Standards of Care, Version 8 — Adolescents",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "AAP Policy on Gender-Affirming Care",
      publisher: "American Academy of Pediatrics",
      url: "https://publications.aap.org/pediatrics/article/142/4/e20182162/37381",
    },
    {
      title: "Endocrine Society Guideline (Adolescents)",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
    },
  ],
  puberty_blockers: [
    {
      title: "GnRH Analogs (Puberty Blockers) — Clinical Overview",
      publisher: "Mayo Clinic",
      url: "https://www.mayoclinic.org/diseases-conditions/gender-dysphoria/in-depth/pubertal-blockers/art-20459075",
    },
    {
      title: "Endocrine Society Guideline — Pubertal Suppression",
      publisher: "Endocrine Society",
      url: "https://www.endocrine.org/clinical-practice-guidelines/gender-dysphoria-gender-incongruence",
    },
    {
      title: "Puberty Blockers Explainer",
      publisher: "Yale School of Medicine",
      url: "https://medicine.yale.edu/news-article/transgender-youth-puberty-blockers/",
    },
  ],
  surgery_adult: [
    {
      title: "Gender Confirmation Surgery — Procedure Library",
      publisher: "American Society of Plastic Surgeons (ASPS)",
      url: "https://www.plasticsurgery.org/reconstructive-procedures/gender-confirmation-surgeries",
    },
    {
      title: "WPATH SOC-8 — Surgery Chapter",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "Surgical Options Overview",
      publisher: "UCSF Gender Affirming Health Program",
      url: "https://transcare.ucsf.edu/surgical-options",
    },
  ],
  surgery_minor: [
    {
      title: "WPATH SOC-8 — Adolescent Surgery",
      publisher: "WPATH",
      url: "https://www.wpath.org/soc8",
    },
    {
      title: "AAP Policy on Gender-Affirming Care",
      publisher: "American Academy of Pediatrics",
      url: "https://publications.aap.org/pediatrics/article/142/4/e20182162/37381",
    },
  ],
  id_marker_change: [
    {
      title: "ID Documents Center",
      publisher: "Advocates for Trans Equality (A4TE / NCTE)",
      url: "https://transequality.org/documents",
      note: "State-by-state guide to changing name and gender markers.",
    },
    {
      title: "Changing Your Federal ID Documents",
      publisher: "Lambda Legal",
      url: "https://www.lambdalegal.org/know-your-rights/article/trans-changing-id-documents",
    },
    {
      title: "U.S. Passport Gender Marker Policy",
      publisher: "U.S. Department of State",
      url: "https://travel.state.gov/content/travel/en/passports/need-passport/selecting-your-gender-marker.html",
    },
  ],
  shield_law: [
    {
      title: "Trans Shield Law Map",
      publisher: "Movement Advancement Project",
      url: "https://www.mapresearch.org/equality-maps/healthcare/trans_shield_laws",
    },
    {
      title: "Shield Law Case Tracker",
      publisher: "Lambda Legal",
      url: "https://lambdalegal.org/cases/",
    },
    {
      title: "Legislative Attacks on LGBTQ Rights",
      publisher: "ACLU",
      url: "https://www.aclu.org/legislative-attacks-on-lgbtq-rights",
    },
  ],
};

// Reddit search queries per procedure. Multiple strings — the API route
// tries them in order until one returns results. Tuned to surface
// first-person experience posts (recovery, side effects, what it felt
// like) rather than news or policy debate.
export const REDDIT_QUERIES_BY_PROCEDURE: Record<ProcedureKey, string[]> = {
  hrt_adult: [
    "HRT experience timeline",
    "estradiol changes feeling",
    "testosterone month update",
  ],
  hrt_minor: [
    "HRT teen experience",
    "started hormones 17",
    "puberty hormones experience",
  ],
  puberty_blockers: [
    "puberty blockers experience",
    "blockers side effects",
    "GnRH implant experience",
  ],
  surgery_adult: [
    "top surgery recovery experience",
    "bottom surgery recovery week",
    "gender affirming surgery recovery",
  ],
  surgery_minor: [
    "top surgery 17 experience",
    "top surgery as a teen",
    "minor top surgery recovery",
  ],
  id_marker_change: [
    "name change gender marker experience",
    "court order gender marker",
    "passport gender marker change",
  ],
  shield_law: [
    "shield law moved state",
    "moved for gender affirming care",
    "sanctuary state experience trans",
  ],
};

// Backwards-compat single-query export, kept so any other importer keeps
// compiling.
export const REDDIT_QUERY_BY_PROCEDURE: Record<ProcedureKey, string> = {
  hrt_adult: REDDIT_QUERIES_BY_PROCEDURE.hrt_adult[0],
  hrt_minor: REDDIT_QUERIES_BY_PROCEDURE.hrt_minor[0],
  puberty_blockers: REDDIT_QUERIES_BY_PROCEDURE.puberty_blockers[0],
  surgery_adult: REDDIT_QUERIES_BY_PROCEDURE.surgery_adult[0],
  surgery_minor: REDDIT_QUERIES_BY_PROCEDURE.surgery_minor[0],
  id_marker_change: REDDIT_QUERIES_BY_PROCEDURE.id_marker_change[0],
  shield_law: REDDIT_QUERIES_BY_PROCEDURE.shield_law[0],
};

// Short clinical / practical summary per procedure, synthesised from the
// verified sources above. Neutral, evidence-grounded, 2-4 sentences.
// Shown at the top of the expanded procedure row so users get an
// authoritative answer before the anecdotes and reference links.
export const SUMMARY_BY_PROCEDURE: Record<ProcedureKey, string> = {
  hrt_adult:
    "Adult hormone therapy typically means estradiol (oral, patch, or injection) with an anti-androgen for transfeminine care, or testosterone (injection or gel) for transmasculine care. Most clinics follow WPATH SOC-8 and the Endocrine Society guideline using informed-consent or letter-based intake. Visible changes begin within weeks, but most effects unfold over 2 to 5 years with regular lab monitoring of hormone levels, lipids, and other metabolic markers.",
  hrt_minor:
    "For adolescents, WPATH SOC-8, the American Academy of Pediatrics, and the Endocrine Society endorse gender-affirming hormones after sustained gender incongruence, a mental-health assessment, and family involvement — usually starting around Tanner stage 2 to 3. Care is individualised; reversible interventions are prioritised first, and irreversible effects are introduced gradually and only with consent of the adolescent and guardians.",
  puberty_blockers:
    "GnRH analogs (commonly leuprolide injections or a histrelin implant) pause endogenous puberty and are described by the Endocrine Society and Mayo Clinic as essentially reversible — body restarts its own puberty if treatment stops. They are used to give adolescents and families more time to consider next steps. Peer-reviewed follow-up studies report improved mental-health outcomes when blockers are provided under proper multidisciplinary care.",
  surgery_adult:
    "Adult gender-affirming surgery covers chest (top), genital (bottom), and facial procedures. WPATH SOC-8 typically requires at least one mental-health letter for genital surgery and a multidisciplinary team. Recovery ranges from a few weeks for chest surgery to many months for bottom surgery; published satisfaction rates consistently exceed 90% across procedure types.",
  surgery_minor:
    "Surgical care for minors is rare and handled case-by-case. WPATH SOC-8 limits it primarily to chest surgery in late adolescence, requiring documented persistent dysphoria, parental consent, and a multidisciplinary assessment. AAP supports access through individualised evaluation; genital surgery in minors is essentially never performed in current clinical practice.",
  id_marker_change:
    "Process varies sharply by state: some accept self-attestation, others require a court order or — until recently — surgical evidence (an approach now widely contested in court). Federal documents (U.S. passport, Social Security record) accept self-attestation under current policy. The Advocates for Trans Equality (A4TE / NCTE) ID Documents Center maintains the most reliable per-state walkthrough.",
  shield_law:
    "Shield laws protect patients, families, and providers in the shielding state from out-of-state subpoenas, extradition, and civil suits tied to gender-affirming care lawfully received there. Scope varies — some statutes shield medical records, others bar professional-license sanctions or insurance retaliation. Movement Advancement Project and Lambda Legal track current scope by state.",
};

// Curated fallback "experience" posts — used when the live Reddit search
// returns nothing (rate limit, region block, etc.). Written to mirror
// real community-post tone without impersonating any specific user.
// Marked as sample on the UI so we're honest about provenance.
export interface SampleReview {
  title: string;
  snippet: string;
  subreddit: string;
}

export const FALLBACK_REDDIT_BY_PROCEDURE: Record<ProcedureKey, SampleReview[]> = {
  hrt_adult: [
    {
      subreddit: "MtF",
      title: "6 months on estradiol — what nobody warned me about",
      snippet:
        "The emotional changes hit way before the physical ones. Crying at commercials by week 3. Skin softened around month 2. Breast budding started maybe month 4 and was sore for weeks. Energy is more stable but I sleep harder than I used to.",
    },
    {
      subreddit: "FtM",
      title: "1 year on T — honest recap",
      snippet:
        "Voice cracked around month 3, settled deeper by month 8. Fat redistribution is wild — face got more angular, shoulders feel broader. Acne flared early then chilled out. Energy and libido went way up. Zero regrets, would do it again.",
    },
    {
      subreddit: "asktransgender",
      title: "Switched from oral to injections — night and day",
      snippet:
        "Oral E worked but my levels were all over the place between checks. Switched to IM injections and the mood swings basically stopped. Less brain fog too. My endo said it's because injection skips first-pass metabolism. Worth asking yours.",
    },
  ],
  hrt_minor: [
    {
      subreddit: "asktransgender",
      title: "Started HRT at 17 — what the first month was like",
      snippet:
        "Therapist letter took longer than the actual prescribing appointment. First month was mostly just… nothing visible? But I felt calmer almost immediately, which my parents noticed before I did. Voice changes started maybe month 4.",
    },
    {
      subreddit: "trans",
      title: "Parents were on the fence — what changed their minds",
      snippet:
        "Our pediatrician walked them through the Endocrine Society guideline page by page. The 'reversible first, then partly reversible' framing landed. We started with blockers for 8 months, then hormones. They're glad now.",
    },
  ],
  puberty_blockers: [
    {
      subreddit: "asktransgender",
      title: "On Lupron for 14 months — daily life",
      snippet:
        "Honestly it just feels like pause. Mood is fine. Hot flashes the first 2 weeks after each shot, then nothing. Bone density labs every 6 months. The big thing is I'm not panicking about my body changing in the wrong direction anymore.",
    },
    {
      subreddit: "trans",
      title: "Histrelin implant vs Lupron shots — comparing",
      snippet:
        "Did Lupron shots for a year, switched to the implant last summer. Implant is way more convenient — no monthly visits. Insertion was a 20 minute outpatient thing under local. Insurance approval took longer than the procedure.",
    },
  ],
  surgery_adult: [
    {
      subreddit: "FtM",
      title: "Top surgery week 1 recovery diary",
      snippet:
        "Drains stayed in for 5 days. Pain peaked at day 2, then mostly itchy. Sleeping upright with a wedge pillow is the move. By week 2 I was walking around the block. Don't underestimate how much you'll need help reaching things.",
    },
    {
      subreddit: "MtF",
      title: "Vaginoplasty 6 months out — what I wish I'd known",
      snippet:
        "Dilation schedule is no joke and you have to stay disciplined. First month is mostly couch and shows. By month 3 most of the swelling was gone. Sexual sensation is real and started coming back around month 4 for me. So glad I did it.",
    },
    {
      subreddit: "asktransgender",
      title: "FFS recovery — bruising was the worst part",
      snippet:
        "Looked like I'd been in a car accident for the first 10 days. Numbness around the forehead lasted months. Final result settles over a year. The first time I caught my reflection and didn't flinch was unreal.",
    },
  ],
  surgery_minor: [
    {
      subreddit: "asktransgender",
      title: "Top surgery at 17 — process was longer than the surgery",
      snippet:
        "Took almost 2 years from first consult to surgery date. Two therapy letters, parents involved at every visit, multiple meetings with the surgeon. Recovery itself was 4 weeks of taking it easy. School wasn't a problem since I did it over summer.",
    },
    {
      subreddit: "FtM",
      title: "Parents asked the right questions — sharing what helped",
      snippet:
        "They wanted to know about reversibility, complications, and why now vs waiting. Our surgeon walked through scarring outcomes and the data on regret rates. Knowing other teens at the practice had done it without issues mattered a lot to them.",
    },
  ],
  id_marker_change: [
    {
      subreddit: "asktransgender",
      title: "Got my passport updated — easier than I expected",
      snippet:
        "Filled out the DS-11 with my chosen gender marker, no doctor letter needed under current policy. New passport showed up in about 5 weeks. Then I used that to update Social Security, which was a same-day thing at the office.",
    },
    {
      subreddit: "trans",
      title: "State court order — what to actually expect",
      snippet:
        "My state still required a court order. Filed pro se using forms the LGBTQ center gave me. Hearing was 10 minutes — judge basically read the form and signed. Total cost was filing fees plus a notarised affidavit, maybe $250.",
    },
  ],
  shield_law: [
    {
      subreddit: "asktransgender",
      title: "Moved from a ban state to a shield state — logistics",
      snippet:
        "Hardest part wasn't the move itself, it was finding a new provider with space. Shield-state clinic accepted me as a new patient within 6 weeks. They were familiar with patients coming from out-of-state and had a whole process for transferring records.",
    },
    {
      subreddit: "trans",
      title: "Shield law actually mattered for our family",
      snippet:
        "We didn't move, but our home state subpoenaed records from the out-of-state clinic that prescribed for our kid. The clinic's lawyer cited the shield law and refused to comply. Felt like the first time the law worked in our favor.",
    },
  ],
};
