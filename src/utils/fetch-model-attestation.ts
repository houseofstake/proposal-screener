export async function fetchModelAttestation(model: string) {
  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error("NEAR_AI_CLOUD_API_KEY not configured");
  }

  const response = await fetch(
    `https://cloud-api.near.ai/v1/attestation/report?model=${encodeURIComponent(model)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch model attestation: ${response.status}`);
  }

  return response.json();
}

export async function extractExpectationsFromAttestation(attestation: any) {
  // Handle gateway_attestation as array or object
  let gateway = attestation?.gateway_attestation;
  if (Array.isArray(gateway) && gateway.length > 0) {
    gateway = gateway[0];
  }

  const payloadCandidates = [
    attestation?.nvidia_payload,
    attestation?.model_attestations?.[0]?.nvidia_payload,
    gateway?.nvidia_payload,
  ];

  let nvidiaPayload: any = payloadCandidates.find(Boolean);
  if (typeof nvidiaPayload === "string") {
    try {
      nvidiaPayload = JSON.parse(nvidiaPayload);
    } catch {
      throw new Error("Unable to parse nvidia_payload JSON");
    }
  }

  if (!nvidiaPayload || typeof nvidiaPayload !== "object") {
    throw new Error("No NVIDIA payload found in attestation");
  }

  console.log("[expectations] Parsing NVIDIA payload:", {
    hasEvidenceList: !!nvidiaPayload.evidence_list,
    evidenceCount: nvidiaPayload.evidence_list?.length || 0,
    arch: nvidiaPayload.arch,
  });

  const evidenceList =
    nvidiaPayload.evidence_list ||
    nvidiaPayload.evidenceList ||
    nvidiaPayload.evidences ||
    [];

  // Extract expectations from evidence items
  let deviceCertHash = "";
  let rimHash = "";
  let ueid = "";
  const measurements: string[] = [];

  if (Array.isArray(evidenceList) && evidenceList.length > 0) {
    for (let i = 0; i < evidenceList.length; i++) {
      const item = evidenceList[i];

      // Extract certificate (for device_cert_hash)
      if (item?.certificate && !deviceCertHash) {
        try {
          const certDecoded = Buffer.from(item.certificate, "base64");
          const crypto = await import("crypto");
          deviceCertHash = crypto
            .createHash("sha256")
            .update(certDecoded)
            .digest("hex");
          console.log(`[expectations] Extracted deviceCertHash from evidence ${i}`);
        } catch (e) {
          console.warn(`[expectations] Failed to decode certificate ${i}:`, e);
        }
      }

      // Extract evidence (for measurements)
      if (item?.evidence) {
        try {
          const evidenceDecoded = Buffer.from(item.evidence, "base64");
          const evidenceHex = evidenceDecoded.toString("hex");
          if (evidenceHex.length > 0) {
            measurements.push(evidenceHex);
            console.log(
              `[expectations] Added measurement ${i}: ${evidenceHex.substring(
                0,
                32
              )}...`
            );
          }
        } catch (e) {
          console.warn(`[expectations] Failed to decode evidence ${i}:`, e);
        }
      }

      // Extract RIM and UEID from evidence item properties
      if (item?.rim && !rimHash) {
        rimHash = item.rim;
        console.log(`[expectations] Found rimHash in evidence ${i}`);
      }
      if (item?.ueid && !ueid) {
        ueid = item.ueid;
        console.log(`[expectations] Found ueid in evidence ${i}`);
      }
    }
  }

  // Fallback to top-level properties if not found in evidence
  deviceCertHash = deviceCertHash || nvidiaPayload.device_cert_hash || "";
  rimHash = rimHash || nvidiaPayload.rim_hash || nvidiaPayload.rim || "";
  ueid = ueid || nvidiaPayload.ueid || "";

  console.log("[expectations] Final extracted values:", {
    arch: nvidiaPayload.arch || "HOPPER",
    hasDeviceCertHash: !!deviceCertHash,
    deviceCertHashPreview: deviceCertHash
      ? `${deviceCertHash.substring(0, 16)}...`
      : "null",
    hasRimHash: !!rimHash,
    hasUeid: !!ueid,
    measurementsCount: measurements.length,
  });

  return {
    arch: nvidiaPayload.arch || nvidiaPayload.gpu_arch || "HOPPER",
    deviceCertHash,
    rimHash,
    ueid,
    measurements,
  };
}
