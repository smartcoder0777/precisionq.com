/** Row shape for dashboard contact track table (mapped from `contact_tracks`). */
export type DashboardContactTrackRow = {
  id: string;
  caseNumber: string;
  /** `contact_tracks.type` (numeric code as text). */
  type: string;
  clinic: string;
  date: string;
  reason: string;
  from: string;
  dob: string;
  email: string;
  cel: string;
  language: string;
  subject: string;
  message: string;
  assignedTo: string;
  /** `contact_tracks.besttime` */
  bestTime: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
};
