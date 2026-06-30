import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { Sparkles, FileText, Users, ListChecks } from "lucide-react";
import findLogo from "@/assets/find-logo.png";
import findLetterhead from "@/assets/find-letterhead.png";
import { CVFormatterTab } from "@/components/CVFormatterTab";
import { CandidateEvaluationTab } from "@/components/CandidateEvaluationTab";
import { ShortlistConsolidationTab } from "@/components/ShortlistConsolidationTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIND Recruitment Suite" },
      {
        name: "description",
        content: "Suite interna FIND: formatação de CVs, avaliação de candidatos e consolidação de shortlist.",
      },
    ],
  }),
  component: Index,
});

type Tab = "cv" | "evaluation" | "shortlist";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "cv", label: "CV Formatter", icon: FileText },
  { id: "evaluation", label: "Avaliação de Candidato", icon: Users },
  { id: "shortlist", label: "Consolidação de Shortlist", icon: ListChecks },
];

function Index() {
  const [tab, setTab] = useState<Tab>("cv");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafbfc]">
      <img
        src={findLetterhead}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[640px] opacity-[0.08] select-none print:hidden"
      />

      <header className="relative z-10 border-b border-[#e5e9ef] bg-white/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={findLogo} alt="FIND Human Resources" className="h-10" />
          <div className="text-xs text-[#5A8FBF] font-medium tracking-wide hidden sm:block">
            Digital Transformation by People
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-8 sm:py-10">
        <div className="mb-6 print:hidden">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5A8FBF]/10 px-3 py-1 text-xs font-medium text-[#0B1F3A]">
            <Sparkles className="h-3.5 w-3.5 text-[#5A8FBF]" /> FIND Recruitment Suite — uso interno
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#0B1F3A] sm:text-3xl">
            Ferramentas de recrutamento
          </h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-[#e5e9ef] print:hidden">
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-[#0B1F3A] text-[#0B1F3A]"
                      : "border-transparent text-[#6b7280] hover:text-[#0B1F3A]"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {tab === "cv" && <CVFormatterTab />}
        {tab === "evaluation" && <CandidateEvaluationTab />}
        {tab === "shortlist" && <ShortlistConsolidationTab />}
      </main>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
