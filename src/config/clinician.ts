/**
 * Clinician config - swappable for other specialties.
 * Fetched from backend /api/config.
 */
export interface ClinicianConfig {
  clinician_name: string;
  clinician_title: string;
  avatar_image_url: string;
}
