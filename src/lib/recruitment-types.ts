// Client-safe types for the recruitment pipeline.

export type RecruitmentLanguage = "Português" | "English" | "Español";

export interface Dimension {
  number: number;
  name: string;
  weight: number;
  criteria: string[];
}

export interface Mission {
  number: number;
  description: string;
}

export interface BriefingOutput {
  client_name: string;
  position_title: string;
  company_context: string;
  vacancy_reason: string | null;
  missions: Mission[];
  not_expected: string[];
  dimensions: Dimension[];
  disqualifying_signals: string[];
  behavioral_profile: string | null;
  stakeholders: string[];
  selection_process: string | null;
  compensation: string | null;
  work_model: string | null;
  next_steps: string | null;
}

export interface DimensionScore {
  dimension: string;
  score: number | null;
  justification: string;
  has_evidence: boolean;
}

export interface CandidateEvaluationOutput {
  candidate_name: string;
  executive_summary: string;
  dimension_scores: DimensionScore[];
  strengths: string[];
  attention_points: string[];
  disqualifying_signals_found: string[];
  recommendation: "priority" | "caveats" | "not_recommended";
  recommendation_detail: string;
  overall_score: number;
}

export interface ShortlistOutput {
  comparison_table: {
    candidate_name: string;
    dimension_scores: Record<string, number | "S/E">;
    weighted_score: number;
    recommendation: "priority" | "caveats" | "not_recommended";
  }[];
  heat_map: { candidate_name: string; narrative: string }[];
  shortlist: {
    priority: string[];
    caveats: { candidate_name: string; caveat: string }[];
    not_recommended: { candidate_name: string; reason: string }[];
  };
  market_gaps: {
    recurring_gaps: string[];
    is_market_gap_or_mapping_limitation: string;
    calibration_suggestion: string | null;
  };
  shortlist_risks: {
    candidate_name: string;
    main_risk: string;
    points_to_deepen: string;
    cultural_fit_concern: string | null;
  }[];
}

export interface ProjectRow {
  id: string;
  client_name: string;
  position_title: string;
  language: RecruitmentLanguage;
  company_context: string | null;
  vacancy_reason: string | null;
  missions: Mission[];
  not_expected: string[];
  dimensions: Dimension[];
  disqualifying_signals: string[];
  behavioral_profile: string | null;
  stakeholders: string[];
  selection_process: string | null;
  compensation: string | null;
  work_model: string | null;
  next_steps: string | null;
  created_at: string;
}

export interface EvaluationRow {
  id: string;
  project_id: string;
  candidate_name: string;
  raw_response: CandidateEvaluationOutput;
  created_at: string;
}
