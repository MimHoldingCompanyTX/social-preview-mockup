// Persistent Work Log (edit-safe). New entries append at end.
// Schema: { date: "YYYY-MM-DD", start: "HH:MM", end: "HH:MM", title: string, cat: string }
window.WORK_LOG = [
  // 2026-02-06 — Initial stabilization
  { date: "2026-02-06", start: "10:00", end: "12:00", title: "Website mockup stabilized (design-mockup)", cat: "Web" },
  { date: "2026-02-06", start: "13:00", end: "15:00", title: "Kanban board + Git setup", cat: "Admin" },

  // 2026-02-11 — Infra & automations
  { date: "2026-02-11", start: "09:30", end: "12:00", title: "Vercel deploy + GitHub CI", cat: "Deploy" },
  { date: "2026-02-11", start: "13:00", end: "16:00", title: "Lead form → Apps Script → Tracker wiring", cat: "Infra/Debug" },

  // 2026-02-14 — Marketing direction
  { date: "2026-02-14", start: "10:00", end: "12:00", title: "Marketing narrative + service copy", cat: "Content" },
  { date: "2026-02-14", start: "13:00", end: "15:00", title: "Website upgrades (v3.7.0)", cat: "Web" },

  // 2026-02-15 — Ops & client kit
  { date: "2026-02-15", start: "09:30", end: "12:00", title: "Google Drive org + Client Success Kit", cat: "Admin" },

  // 2026-02-16 — Lead tracker fix + deploy
  { date: "2026-02-16", start: "12:30", end: "18:15", title: "Lead Tracker debugging (GOOD/BAD sheet, script)", cat: "Infra/Debug" },
  { date: "2026-02-16", start: "18:15", end: "18:25", title: "Website form fix + push v3.7.2", cat: "Deploy" }
];
