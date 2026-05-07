import React from "react";

export interface ModelAttestationProps {
  model?: string;
  renderCodeField: (
    label: string,
    value?: string,
    copyable?: boolean
  ) => React.ReactNode;
}

export function ModelAttestation({
  model,
  renderCodeField,
}: ModelAttestationProps) {
  return (
    <div className="space-y-3">{renderCodeField("Model", model, false)}</div>
  );
}
