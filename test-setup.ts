import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock fetch globally
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Stub URL.createObjectURL for download tests
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => "blob://mock");
}
