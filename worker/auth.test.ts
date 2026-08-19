import { describe, expect, it } from "vitest";
import {
  getCookie,
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  verifyPassword,
} from "./auth";

describe("Worker authentication helpers", () => {
  it("normalizes and validates portfolio usernames", () => {
    expect(normalizeUsername("  Jason.dev ")).toBe("JASON.DEV");
    expect(isValidUsername("Jason_1511")).toBe(true);
    expect(isValidUsername("-invalid")).toBe(false);
    expect(isValidPassword("long-enough-password")).toBe(true);
    expect(isValidPassword("short")).toBe(false);
  });

  it("hashes and verifies a password", async () => {
    const salt = "00112233445566778899aabbccddeeff";
    const hash = await hashPassword("portfolio-password", salt, 1_000);
    expect(await verifyPassword("portfolio-password", salt, hash, 1_000)).toBe(true);
    expect(await verifyPassword("wrong-password", salt, hash, 1_000)).toBe(false);
  });

  it("reads a named cookie", () => {
    const request = new Request("https://example.com", {
      headers: { cookie: "theme=dark; analytics_session=abc123; mode=full" },
    });
    expect(getCookie(request, "analytics_session")).toBe("abc123");
  });
});
