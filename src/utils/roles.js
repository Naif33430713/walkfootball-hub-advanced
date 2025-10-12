// src/utils/roles.js
const ADMIN_EMAILS = [
  "admin@test.com",
];

export function roleFromEmail(email = "") {
  const e = String(email).toLowerCase().trim();
  if (!e) return "user";
  return ADMIN_EMAILS.includes(e) ? "admin" : "user";
}
