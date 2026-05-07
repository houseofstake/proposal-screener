import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface IndependentVerificationPanelProps {
  independentVerification: {
    status: "idle" | "verifying" | "success" | "failed";
    checks?: {
      signature: boolean;
      hashes: boolean;
      nonce: boolean;
      address: boolean;
      nras: boolean;
    };
    details?: string;
  };
}

export function IndependentVerificationPanel({
  independentVerification,
}: IndependentVerificationPanelProps) {
  if (!independentVerification.checks) return null;

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          Cryptographic Verification
        </h4>
        {independentVerification.status === "success" && (
          <Badge
            variant="default"
            className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
          >
            ✓ Verified in Browser
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          {independentVerification.checks.signature ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Signature</p>
            <p className="text-[10px] text-muted-foreground">
              {independentVerification.checks.signature ? "ECDSA valid" : "Failed"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          {independentVerification.checks.hashes ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Hashes</p>
            <p className="text-[10px] text-muted-foreground">
              {independentVerification.checks.hashes ? "Match signed text" : "Mismatch"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          {independentVerification.checks.nonce ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Nonce</p>
            <p className="text-[10px] text-muted-foreground">
              {independentVerification.checks.nonce ? "Bound to request" : "Unbound"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          {independentVerification.checks.address ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">TEE Address</p>
            <p className="text-[10px] text-muted-foreground">
              {independentVerification.checks.address ? "Matches node" : "No match"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 col-span-2">
          {independentVerification.checks.nras ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">NVIDIA NRAS JWT</p>
            <p className="text-[10px] text-muted-foreground">
              {independentVerification.checks.nras
                ? "Structure, issuer, and expiration validated"
                : "Invalid JWT"}
            </p>
          </div>
        </div>
      </div>

      {independentVerification.status === "success" && (
        <Alert variant="default" className="border-emerald-200 bg-emerald-50/50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs text-emerald-800">
            All cryptographic checks passed. Verified using ethers.js in your browser.
          </AlertDescription>
        </Alert>
      )}

      {independentVerification.status === "failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {independentVerification.details || "Some verification checks failed"}
          </AlertDescription>
        </Alert>
      )}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-blue-600 hover:underline w-full justify-center pt-2 border-t">
          <Info className="h-3 w-3" />
          How to verify this yourself
          <ChevronDown className="h-3 w-3 transition-transform ui-expanded:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 p-3 rounded-lg bg-blue-50/50 border border-blue-200 text-xs space-y-3">
            <p className="font-medium text-blue-900">Three ways to verify independently:</p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 flex-shrink-0">1.</span>
                <div>
                  <p className="font-medium text-blue-900">Browser Console</p>
                  <p className="text-blue-700 text-[11px] leading-relaxed">
                    Open DevTools (F12) and check the console. All verification steps are
                    automatically logged with actual cryptographic function calls you can inspect.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 flex-shrink-0">2.</span>
                <div>
                  <p className="font-medium text-blue-900">Export &amp; Verify Externally</p>
                  <p className="text-blue-700 text-[11px] leading-relaxed">
                    Click &quot;Export Proof&quot; above, then verify the signature at{" "}
                    <a
                      href="https://etherscan.io/verifiedSignatures"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      etherscan.io/verifiedSignatures
                    </a>{" "}
                    or any ECDSA verification tool you trust.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-700 flex-shrink-0">3.</span>
                <div>
                  <p className="font-medium text-blue-900">Verify Intel TDX Quote</p>
                  <p className="text-blue-700 text-[11px] leading-relaxed">
                    Use the &quot;Copy Intel Quote&quot; button below and paste at{" "}
                    <a
                      href="https://proof.t16z.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      proof.t16z.com
                    </a>{" "}
                    to verify CPU attestation with Phala&apos;s independent verifier.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                <strong>Note:</strong> Verification happens automatically in your browser using
                standard cryptographic libraries. You don&apos;t need to trust this server&apos;s
                verification results—inspect the console or use external tools to verify yourself.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
