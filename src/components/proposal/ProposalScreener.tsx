import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { VerificationProof } from "@/components/verification/VerificationProof";
import { useNear } from "@/hooks/useNear";
import type { VerificationMetadata } from "@/types/agui-events";
import type { Evaluation, EvaluationCriterion } from "@/types/evaluation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  Shield,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { useState } from "react";

type QualityKey =
  | "complete"
  | "legible"
  | "consistent"
  | "compliant"
  | "justified"
  | "measurable";

const QUALITY_LABELS: Record<QualityKey, string> = {
  complete: "Complete",
  legible: "Legible",
  consistent: "Consistent",
  compliant: "Compliant",
  justified: "Justified",
  measurable: "Measurable",
};

/**
 * Build a NEP-413 Bearer token from the connected wallet. `near-sign-verify`'s
 * `sign()` accepts the wallet directly as a signer and returns a token that
 * the server verifies via `verify(token, { expectedRecipient: "social.near" })`.
 */
async function signAuthToken(
  wallet: unknown,
  message: string,
): Promise<string> {
  const { sign } = await import("near-sign-verify");
  return sign(message, {
    signer: wallet as Parameters<typeof sign>[1]["signer"],
    recipient: "social.near",
  });
}

export const ProposalScreener = () => {
  const { wallet, signedAccountId, signIn, loading: walletLoading } = useNear();

  const [title, setTitle] = useState<string>("");
  const [proposal, setProposal] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [verificationMeta, setVerificationMeta] =
    useState<VerificationMetadata | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const evaluateProposal = async () => {
    if (!title.trim()) {
      setError("Please enter a proposal title");
      return;
    }
    if (!proposal.trim()) {
      setError("Please enter a proposal");
      return;
    }
    if (!signedAccountId || !wallet) {
      setError("Connect your NEAR wallet to screen a proposal");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSubmissionId(null);
    setVerificationMeta(null);
    setVerificationId(null);
    setModel(null);

    try {
      const authToken = await signAuthToken(
        wallet,
        `Screen proposal: ${title.slice(0, 80)}`,
      );

      const response = await fetch("/api/screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ title, proposal }),
      });

      if (!response.ok) {
        let errorMessage: string | undefined;
        try {
          const errorData: { error?: string; message?: string } =
            await response.json();
          errorMessage = errorData.message || errorData.error;
        } catch {
          // ignore JSON errors
        }
        throw new Error(
          errorMessage || `API request failed: ${response.status}`,
        );
      }

      const data: {
        submissionId?: string;
        evaluation: Evaluation;
        verification?: VerificationMetadata | null;
        verificationId?: string | null;
        model?: string | null;
      } = await response.json();

      setResult(data.evaluation);
      setSubmissionId(data.submissionId ?? null);
      setVerificationMeta(data.verification ?? null);
      setVerificationId(
        data.verificationId ?? data.verification?.messageId ?? null,
      );
      setModel(data.model ?? data.evaluation?.model ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to evaluate proposal";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => `${(score * 100).toFixed(0)}%`;

  const copySuggestedEdit = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard API may be unavailable; ignore silently.
    }
  };

  const renderQualityCriterion = (
    key: QualityKey,
    label: string,
    criterion: EvaluationCriterion,
  ) => {
    const hasSuggestion =
      !criterion.pass &&
      typeof criterion.suggestedEdit === "string" &&
      criterion.suggestedEdit.trim().length > 0;

    return (
      <Card key={key}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {criterion.pass ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <CardTitle className="text-base">{label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-3 space-y-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {criterion.reason}
          </p>
          {hasSuggestion && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Wand2 className="h-4 w-4" />
                  Suggested edit
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    copySuggestedEdit(key, criterion.suggestedEdit ?? "")
                  }
                >
                  {copiedKey === key ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90 font-mono">
                {criterion.suggestedEdit}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const connectDisabled = walletLoading;
  const screenDisabled = loading || walletLoading || !signedAccountId;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-8">
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">AI Proposal Screener</CardTitle>
            <CardDescription className="text-base">
              <strong>Private Governance Proposal Reviews</strong>
            </CardDescription>
            {/* <CardDescription>Built on NEAR AI Cloud</CardDescription> */}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Proposal Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a clear, descriptive title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposal">
                  Proposal Content
                  <span className="text-xs text-muted-foreground ml-1">
                    — Include objectives, budget, timeline, and KPIs
                  </span>
                </Label>
                <Textarea
                  id="proposal"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Paste your full proposal here..."
                  rows={14}
                  className="font-mono text-sm resize-none"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!signedAccountId ? (
                <Button
                  onClick={() => signIn().catch(() => undefined)}
                  disabled={connectDisabled}
                  className="w-full gap-2"
                  size="lg"
                >
                  {walletLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Initializing wallet...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Connect Wallet to Screen
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={evaluateProposal}
                  disabled={screenDisabled}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Evaluating proposal...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Screen Proposal
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-6 pt-6">
                <Separator />

                {/* Status Card */}
                <Alert
                  className={
                    result.overallPass
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  }
                >
                  <div className="flex items-start gap-3">
                    {result.overallPass ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 mt-1" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-lg">
                        {result.overallPass
                          ? "Ready for Submission"
                          : "Needs Improvement"}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <strong>Quality:</strong>{" "}
                          {formatScore(result.qualityScore)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <strong>Attention:</strong>{" "}
                          {formatScore(result.attentionScore)}
                        </div>
                        {submissionId && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>ID:</span>
                            <code className="text-xs">{submissionId}</code>
                          </div>
                        )}
                      </div>
                      <AlertDescription className="text-sm">
                        {result.summary}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>

                {/* Quality Criteria */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Quality Criteria</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(Object.keys(QUALITY_LABELS) as QualityKey[]).map(
                      (key) => {
                        const criterion = result[key] as
                          | EvaluationCriterion
                          | undefined;
                        if (
                          !criterion ||
                          typeof criterion !== "object" ||
                          !("pass" in criterion)
                        ) {
                          return null;
                        }
                        return renderQualityCriterion(
                          key,
                          QUALITY_LABELS[key],
                          criterion,
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Attention Scores */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Attention Scores</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              result.relevant?.score === "high"
                                ? "default"
                                : result.relevant?.score === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {result.relevant?.score?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                          <CardTitle className="text-base">Relevant</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {result.relevant?.reason || "No assessment available"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              result.material?.score === "high"
                                ? "default"
                                : result.material?.score === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {result.material?.score?.toUpperCase() || "UNKNOWN"}
                          </Badge>
                          <CardTitle className="text-base">Material</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {result.material?.reason || "No assessment available"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Success Message */}
                {result.overallPass && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      <strong>AI Screened & Approved</strong>
                      <br />
                      This proposal has passed all automated quality criteria
                    </AlertDescription>
                  </Alert>
                )}

                {(verificationMeta || verificationId) && (
                  <VerificationProof
                    verification={verificationMeta ?? undefined}
                    verificationId={verificationId ?? undefined}
                    model={model ?? result?.model ?? undefined}
                    className="mt-3"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            AI screening supports both proposal authors and community reviewers.
            Results are advisory and independent of official governance
            processes.
          </p>
        </div>
      </div>
    </div>
  );
};
