import React from "react";
import { Separator } from "@/components/ui/separator";

export interface SignatureDetailsPanelProps {
  signaturePayload: {
    text?: string;
    signature?: string;
    signing_address?: string;
  } | null;
  localSignedText: string | null;
  renderCodeField: (label: string, value?: string, copyable?: boolean) => React.ReactNode;
}

export function SignatureDetailsPanel({
  signaturePayload,
  localSignedText,
  renderCodeField,
}: SignatureDetailsPanelProps) {
  if (!signaturePayload) return null;

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
          Message Signature
        </h4>
        {renderCodeField("Signed Text (Request:Response)", signaturePayload.text)}
        {renderCodeField("ECDSA Signature", signaturePayload.signature)}
        {renderCodeField("TEE Address", signaturePayload.signing_address)}
        {localSignedText &&
          localSignedText !== signaturePayload.text &&
          renderCodeField("Local Hash Payload", localSignedText)}
      </div>
    </>
  );
}
