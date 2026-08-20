export const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,39}$/;

// HTML pattern attributes use the RegExp `v` flag, where a hyphen in a
// character class must be escaped even when it appears last.
export const USERNAME_HTML_PATTERN = String.raw`[A-Za-z0-9][A-Za-z0-9._\-]{2,39}`;
