import Image from "next/image";
import Link from "next/link";
import { FileText, Map as MapIcon, FlaskConical, ArrowRight, ArrowDown, User, ExternalLink, NotebookText } from "lucide-react";
import { Container } from "@/components/Container";
import { GlassButton, GlassFilter } from "@/components/ui/liquid-glass";
import { WaveBackground } from "@/components/WaveBackground";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ToolCards />
      <TrustSection />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate -mt-16 pt-16 overflow-hidden ocean-hero">
      <WaveBackground />
      {/* Long fade at the bottom of the hero. The final color is the SAME
          effective rgb the Tools wash produces at its top edge
          (rgba(186,230,253,0.55) over white body ≈ rgb(217,241,254)), so the
          two sections meet at an identical pixel value — no visible seam. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-96 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(217,241,254,0) 0%, rgba(217,241,254,0.3) 35%, rgba(217,241,254,0.75) 70%, rgba(217,241,254,1) 100%)",
        }}
      />
      <GlassFilter />

      <Container>
        <div className="relative mx-auto max-w-[860px] text-center pt-28 pb-section">
          <h1 className="text-hero text-balance text-sea-ink">
            A Translator Between You And Your Doctor
          </h1>
          <p className="mt-6 text-lede text-sea-ink text-balance max-w-[560px] mx-auto">
            Log meds once. Hand your doctor a 30 second card that separates
            your HRT from today&rsquo;s visit, and decode your lab results
            using live medical data using
            <span className="font-bold"> openFDA</span> and
            <span className="font-bold"> PubMed</span>.
          </p>

          <div className="mt-10 flex items-center justify-center">
            <GlassButton
              href="#tools"
              ariaLabel="See The Tools. Jump to all four."
            >
              <span className="inline-flex items-center gap-2 text-body font-medium text-sea-ink">
                See The Tools
                <ArrowDown className="h-6 w-6" strokeWidth={2} />
              </span>
            </GlassButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ToolCards() {
  const tools = [
    {
      href: "/places",
      icon: User,
      title: "Your Profile",
      desc: "Meds, surgeries, last labs. Type it once, and every other tool pulls from it automatically.",
    },
    {
      href: "/document",
      icon: FileText,
      title: "Previsit Card",
      desc: "Two boxes for the doctor, today's complaint and your hormone context, kept separate.",
    },
    {
      href: "/analysis",
      icon: NotebookText,
      title: "After Visit",
      desc: "Upload your visit notes. Get a plain language breakdown checked against your own data.",
    },
    {
      href: "/continuity",
      icon: FlaskConical,
      title: "Lab Check",
      desc: "Type a weird number. Find out if it's from your hormones or something else worth asking about.",
    },
    {
      href: "/map",
      icon: MapIcon,
      title: "Care Map",
      desc: "See where your state stands on gender affirming care, ID changes, and shield laws.",
    },
  ];
  return (
    <section id="tools" className="relative scroll-mt-24 pb-section">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(186,230,253,0.55) 0%, rgba(224,242,254,0.35) 30%, rgba(240,249,255,0.2) 55%, rgba(255,255,255,0) 100%)",
        }}
      />
      <Container className="relative">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group relative flex flex-col glass rounded-card p-5 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-deep focus-visible:ring-offset-2"
            >
              {/* Icon */}
              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-icon text-sea-ink"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.75) 50%, rgba(125,211,252,0.55) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.5), 0 1px 2px rgba(15,42,61,0.06)",
                }}
              >
                <t.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h3 className="relative mt-4 text-[17px] font-bold tracking-tight text-sea-ink">
                {t.title}
              </h3>
              <p className="relative mt-2 text-meta text-ink-secondary leading-relaxed">
                {t.desc}
              </p>

              <div className="relative mt-auto pt-4">
                <div className="h-px w-full bg-gradient-to-r from-sea-mist/70 via-sea-mist/25 to-transparent" />
                <div className="mt-3 inline-flex items-center gap-1.5 text-meta font-medium text-sea-ink transition-colors duration-200 group-hover:text-sea-deep">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustSection() {
  const sources = [
    {
      tag: "Medications",
      name: "RxNorm",
      org: "U.S. National Library of Medicine",
      url: "https://rxnav.nlm.nih.gov/",
    },
    {
      tag: "Recalls",
      name: "openFDA",
      org: "U.S. Food & Drug Administration",
      url: "https://open.fda.gov/apis/drug/",
    },
    {
      tag: "Studies",
      name: "PubMed",
      org: "National Center for Biotechnology Information",
      url: "https://eutils.ncbi.nlm.nih.gov/",
    },
  ];
  return (
    <section className="pb-20">
      <Container>
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 text-meta uppercase tracking-[0.18em] font-medium text-ink-secondary">
            Live Sources
            <span className="relative flex h-1.5 w-1.5 self-start mt-1" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sources.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={s.org}
                aria-label={`${s.name}, ${s.org}. Opens in a new tab.`}
                className="group inline-flex items-center gap-2 rounded-chip glass px-3.5 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-deep focus-visible:ring-offset-2"
              >
                <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-sea-deep">
                  {s.tag}
                </span>
                <span className="text-meta text-sea-ink font-medium">
                  {s.name}
                </span>
                <ExternalLink
                  className="h-3 w-3 text-ink-secondary/50 transition-colors duration-200 group-hover:text-sea-deep"
                  aria-hidden
                />
              </a>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
