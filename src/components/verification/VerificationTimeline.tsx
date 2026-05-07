import React from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/utils/tailwind";
import { deriveVerificationState } from "@/utils/attestation";
import { Shield, CheckCircle2, AlertCircle, Clock, Cpu } from "lucide-react";

export interface VerificationTimelineProps {
  verificationState: ReturnType<typeof deriveVerificationState>;
}

export function VerificationTimeline({
  verificationState,
}: VerificationTimelineProps) {
  return (
    <div className="rounded-xl bg-background/60 p-4 space-y-4">
      <div className="relative">
        <div className="absolute top-6 left-8 right-8 h-0.5 bg-gradient-to-r from-gray-200 via-emerald-200 to-emerald-200 hidden sm:block" />
        <div className="relative flex flex-col sm:flex-row justify-between gap-4 sm:gap-2">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-semibold leading-tight",
                  verificationState.steps.address.status === "success"
                    ? "text-emerald-700"
                    : "text-muted-foreground"
                )}
              >
                Secure Key Generation
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center",
                verificationState.steps.gpu.status === "success" ||
                  verificationState.steps.cpu.status === "success"
                  ? "bg-emerald-50 border-emerald-500"
                  : "bg-gray-50 border-gray-300"
              )}
            >
              {verificationState.steps.gpu.status === "success" ||
              verificationState.steps.cpu.status === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <Shield className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-semibold leading-tight",
                  verificationState.steps.gpu.status === "success" ||
                    verificationState.steps.cpu.status === "success"
                    ? "text-emerald-700"
                    : "text-muted-foreground"
                )}
              >
                Hardware Attestation
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center",
                verificationState.steps.address.status === "success"
                  ? "bg-emerald-50 border-emerald-500"
                  : "bg-gray-50 border-gray-300"
              )}
            >
              {verificationState.steps.address.status === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-semibold leading-tight",
                  verificationState.steps.address.status === "success"
                    ? "text-emerald-700"
                    : "text-muted-foreground"
                )}
              >
                Key Binding
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center",
                verificationState.steps.signature.status === "success"
                  ? "bg-emerald-50 border-emerald-500"
                  : "bg-gray-50 border-gray-300"
              )}
            >
              {verificationState.steps.signature.status === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-semibold leading-tight",
                  verificationState.steps.signature.status === "success"
                    ? "text-emerald-700"
                    : "text-muted-foreground"
                )}
              >
                Message Signing
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center",
                verificationState.overall === "verified"
                  ? "bg-emerald-50 border-emerald-500"
                  : verificationState.overall === "failed"
                  ? "bg-red-50 border-red-500"
                  : "bg-gray-50 border-gray-300"
              )}
            >
              {verificationState.overall === "verified" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : verificationState.overall === "failed" ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <Clock className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "font-semibold leading-tight",
                  verificationState.overall === "verified"
                    ? "text-emerald-700"
                    : verificationState.overall === "failed"
                    ? "text-red-700"
                    : "text-muted-foreground"
                )}
              >
                Complete Verification
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="pt-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex-shrink-0 mt-0.5">
              {verificationState.steps.gpu.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs">GPU Attestation</p>
              <p className="text-[10px] text-muted-foreground">
                {verificationState.steps.gpu.message}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex-shrink-0 mt-0.5">
              {verificationState.steps.cpu.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Cpu className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs">CPU Attestation</p>
              <p className="text-[10px] text-muted-foreground">
                {verificationState.steps.cpu.message}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex-shrink-0 mt-0.5">
              {verificationState.steps.signature.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs">Digital Signature</p>
              <p className="text-[10px] text-muted-foreground">
                {verificationState.steps.signature.message}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <div className="flex-shrink-0 mt-0.5">
              {verificationState.steps.nonce.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs">Nonce Binding</p>
              <p className="text-[10px] text-muted-foreground">
                {verificationState.steps.nonce.message}
              </p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
