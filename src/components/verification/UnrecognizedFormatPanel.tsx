import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { VerificationProofResponse } from "@/types/verification";

export interface UnrecognizedFormatPanelProps {
  remoteProof: VerificationProofResponse;
  renderDataField: (
    label: string,
    value?: unknown,
    collapsible?: boolean
  ) => React.ReactNode;
}

export function UnrecognizedFormatPanel({
  remoteProof,
  renderDataField,
}: UnrecognizedFormatPanelProps) {
  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Unrecognized Format</AlertTitle>
      <AlertDescription className="text-amber-800">
        Proof was fetched but signature or attestation fields are missing or in an unexpected format.
      </AlertDescription>
      {renderDataField("Raw Proof Data", remoteProof, true)}
    </Alert>
  );
}
