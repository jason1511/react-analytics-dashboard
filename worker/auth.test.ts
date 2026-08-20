import { describe, expect, it } from "vitest";
import {
  PASSWORD_ITERATIONS,
  getCookie,
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  verifyPassword,
} from "./auth";

describe("Worker authentication helpers", () => {
  const pepper = "test-only-pepper-with-more-than-32-characters";

  it("normalizes and validates portfolio usernames", () => {
    expect(normalizeUsername("  Jason.dev ")).toBe("JASON.DEV");
    expect(isValidUsername("Jason_1511")).toBe(true);
    expect(isValidUsername("-invalid")).toBe(false);
    expect(isValidPassword("long-enough-password")).toBe(true);
    expect(isValidPassword("short")).toBe(false);
  });

  it("hashes and verifies a password", async () => {
    const salt = "00112233445566778899aabbccddeeff";
    const hash = await hashPassword("portfolio-password", salt, pepper);
    expect(
      await verifyPassword(
        "portfolio-password",
        salt,
        hash,
        PASSWORD_ITERATIONS,
        pepper,
      ),
    ).toBe(true);
    expect(
      await verifyPassword("wrong-password", salt, hash, PASSWORD_ITERATIONS, pepper),
    ).toBe(false);
    expect(
      await verifyPassword(
        "portfolio-password",
        salt,
        hash,
        PASSWORD_ITERATIONS,
        "different-test-pepper-with-32-characters",
      ),
    ).toBe(false);
  });

  it("reads a named cookie", () => {
    const request = new Request("https://example.com", {
      headers: { cookie: "theme=dark; analytics_session=abc123; mode=full" },
    });
    expect(getCookie(request, "analytics_session")).toBe("abc123");
  });
});
