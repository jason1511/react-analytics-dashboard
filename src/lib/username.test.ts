import { describe, expect, it } from "vitest";
import { USERNAME_HTML_PATTERN, USERNAME_PATTERN } from "./username";

describe("username validation", () => {
  it("accepts the same usernames in JavaScript and the HTML pattern", () => {
    const htmlPattern = new RegExp(`^(?:${USERNAME_HTML_PATTERN})$`, "v");

    for (const username of ["jason", "jason.dev", "jason_1511", "jason-dev"]) {
      expect(USERNAME_PATTERN.test(username)).toBe(true);
      expect(htmlPattern.test(username)).toBe(true);
    }
  });

  it("rejects invalid usernames", () => {
    for (const username of ["ab", "-jason", "jason account", "jason@dev"]) {
      expect(USERNAME_PATTERN.test(username)).toBe(false);
    }
  });
});
