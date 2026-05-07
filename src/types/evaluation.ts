export interface EvaluationCriterion {
  pass: boolean;
  reason: string;
  /**
   * Concrete suggested rewrite or addition that would address the issue
   * raised in `reason`. Required when `pass === false`; an empty string
   * (or omission) is fine when the criterion already passes.
   *
   * The model is instructed to return a self-contained markdown snippet
   * the proposal author can paste into their draft. Capped at ~1500 chars.
   */
  suggestedEdit?: string;
}

export interface AttentionScore {
  score: "high" | "medium" | "low";
  reason: string;
}

export interface Evaluation {
  // Quality Score Criteria (6 criteria)
  complete: EvaluationCriterion;
  legible: EvaluationCriterion;
  consistent: EvaluationCriterion;
  compliant: EvaluationCriterion;
  justified: EvaluationCriterion;
  measurable: EvaluationCriterion;

  // Attention Score Criteria (2 criteria)
  relevant: AttentionScore;
  material: AttentionScore;

  // Computed Scores
  qualityScore: number;
  attentionScore: number;

  // Overall Result
  overallPass: boolean;
  summary: string;
  model?: string;
}
