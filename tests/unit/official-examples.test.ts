import { describe, it, expect } from "vitest";
import { verifyMessage } from "ethers";

describe("Official NEAR AI examples - signature verification", () => {
  it("verifies primary example signature/address", () => {
    const requestHash = "2ec65b4a042f68d7d4520e21a7135505a5154d52aa87dbd19e9d08021ffe5c4d";
    const responseHash = "bdcfaa70301ea760ad215a2de31e80b7a69ee920c02a4b97ae05d0798b75fe79";
    const text = `${requestHash}:${responseHash}`;
    const signature =
      "0xb6bed282118266c5bc157bc7a88185dd017826da13c7aeb2aeebb9be88c7c7400047b88528d29f82792df1f2288a1b84e11ffddfe32517d46d5f7056e9082b941c";
    const expectedAddress = "0xCaAA4842758658A85785Ad15367a700C601ffEA5";

    const recovered = verifyMessage(text, signature);
    expect(recovered.toLowerCase()).toBe(expectedAddress.toLowerCase());
  });

  it("verifies alternative example signature/address", () => {
    const text =
      "65b0adb47d0450971803dfb18d0ce4af4a64d27420a43d5aad4066ebf10b81b5:e508d818744d175a62aae1a9fb3f373c075460cbe50bf962a88ac008c843dff1";
    const signature =
      "0xf28f537325c337fd96ae6e156783c904ca708dcd38fb8a476d1280dfc72dc88e4fcb5c3941bdd4f8fe5238a2253b975c6b02ea6a0a450b5b0f9296ab54cf24181b";
    const expectedAddress = "0xc51268C9b46140619CBC066A34441a6ca51F85f9";

    const recovered = verifyMessage(text, signature);
    expect(recovered.toLowerCase()).toBe(expectedAddress.toLowerCase());
  });
});
