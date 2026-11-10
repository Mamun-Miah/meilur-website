export const THEMES = ["heritage", "exhibition"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  heritage: "Heritage editorial",
  exhibition: "Contemporary exhibition",
};

export const ROLES = ["ADMIN", "EDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const PROJECT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const IMAGE_STATUSES = ["PUBLISHED", "ARCHIVED"] as const;

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "IN_DISCUSSION", "WON", "LOST"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  IN_DISCUSSION: "In discussion",
  WON: "Won",
  LOST: "Lost",
};

export const EVENT_TYPES = [
  "Exhibition or trade show",
  "Booth design and fabrication",
  "Corporate event or conference",
  "Product launch",
  "Opening ceremony",
  "Press conference",
  "Cultural programme",
  "Brand activation",
  "Other",
] as const;

export const EVENT_SCALES = [
  "Under 100 guests",
  "100 to 500 guests",
  "500 to 2,000 guests",
  "More than 2,000 guests",
  "Not sure yet",
] as const;

export const SESSION_COOKIE = "mlr_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours, sliding
export const RESET_TTL_MS = 1000 * 60 * 30; // 30 minutes
