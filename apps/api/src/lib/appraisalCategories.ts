import { AppraisalCategory } from "@prisma/client";

// Canonical criterion-key → category mapping. MUST stay in sync with the
// criteria catalog in routes/faculty.ts (each criterion carries a `category`).
// Used to derive/backfill AppraisalItem.category when only the key is known
// (e.g. self-submitted draft items in routes/appraisals.ts).
const KEY_TO_CATEGORY: Record<string, AppraisalCategory> = {
  academics_average_result: "ACADEMICS",
  fdp_stp: "ACADEMICS",
  overall_university_result: "ACADEMICS",
  placement: "ACADEMICS",
  department_university_positions: "ACADEMICS",
  research_publications: "RESEARCH",
  impact_factor: "RESEARCH",
  books_published: "RESEARCH",
  patents: "RESEARCH",
  conference_seminar_workshop: "RESEARCH",
  research_project_consultancy: "RESEARCH",
  research_guidance: "RESEARCH",
  co_curricular_activities: "OTHERS",
  attendance: "OTHERS",
  awards_recognition: "OTHERS",
  fee_recovery: "OTHERS",
  awards_outside_svgoi: "OTHERS",
  // Legacy criterion-key aliases found in older appraisal data.
  scopus_papers: "RESEARCH",
  book_chapter_book_patent: "RESEARCH",
  conference_seminar_symposia: "RESEARCH",
  hod_remarks_score: "OTHERS",
};

export const ALL_CATEGORIES: AppraisalCategory[] = [
  "ACADEMICS",
  "RESEARCH",
  "OTHERS",
];

// Which committee role governs which category.
export const ROLE_TO_CATEGORY: Record<string, AppraisalCategory> = {
  COMMITTEE_ACADEMIC: "ACADEMICS",
  COMMITTEE_RESEARCH: "RESEARCH",
  COMMITTEE_OTHER: "OTHERS",
};

export function categoryForKey(key: string): AppraisalCategory | null {
  return KEY_TO_CATEGORY[key] ?? null;
}

// Maps the catalog's human category label ("Academics"/"Research"/"Others")
// to the DB enum.
export function categoryFromLabel(
  label?: string | null,
): AppraisalCategory | null {
  switch (label) {
    case "Academics":
      return "ACADEMICS";
    case "Research":
      return "RESEARCH";
    case "Others":
      return "OTHERS";
    default:
      return null;
  }
}

export function labelForCategory(category: AppraisalCategory): string {
  switch (category) {
    case "ACADEMICS":
      return "Academics";
    case "RESEARCH":
      return "Research";
    case "OTHERS":
      return "Others";
    default:
      return category;
  }
}

// Returns the single category a caller governs based on their committee role,
// or null if they hold no category-specific committee role.
export function categoryForRoles(
  roles: string[] | undefined,
): AppraisalCategory | null {
  for (const role of roles ?? []) {
    if (ROLE_TO_CATEGORY[role]) return ROLE_TO_CATEGORY[role];
  }
  return null;
}
