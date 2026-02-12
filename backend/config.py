"""
Clinician configuration - swappable for other specialties.
"""
from pydantic import BaseModel


class ClinicianConfig(BaseModel):
    """Configurable clinician identity for the avatar."""
    name: str = "Dr Ash Tewari"
    title: str = "Urologic Surgeon"
    avatar_image_url: str = "/drtewari.png"


# Singleton - swap this for other clinicians
CLINICIAN = ClinicianConfig()
