"""
FHIR Client - Healthcare data integration.
"""
import requests
import logging
from typing import Dict, List, Any, Optional
from ..core.config import settings

logger = logging.getLogger(__name__)


class FHIRClient:
    """
    Client for FHIR-compliant healthcare APIs.
    Based on Projects/Healthcare/SMILE CDR server docs using auth.py patterns.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None
    ):
        self.base_url = base_url or settings.fhir_base_url
        self.username = username or settings.fhir_username
        self.password = password or settings.fhir_password
        self.session = requests.Session()
        self.session.auth = (self.username, self.password)
        self.session.verify = False  # For dev environments with self-signed certs

    def test_connection(self) -> bool:
        """Test FHIR server connection."""
        try:
            response = self.session.get(f"{self.base_url}/metadata")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"FHIR connection test failed: {e}")
            return False

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get a patient resource by ID."""
        try:
            response = self.session.get(
                f"{self.base_url}/Patient/{patient_id}"
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching patient {patient_id}: {e}")
            return None

    def search_patients(
        self,
        name: Optional[str] = None,
        identifier: Optional[str] = None,
        birthdate: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for patients using FHIR search parameters.

        Args:
            name: Patient name (partial match)
            identifier: Patient identifier (e.g., MRN)
            birthdate: Birth date (YYYY-MM-DD format)

        Returns:
            List of patient resource dicts
        """
        try:
            params = {}
            if name:
                params["name"] = name
            if identifier:
                params["identifier"] = identifier
            if birthdate:
                params["birthdate"] = birthdate

            response = self.session.get(
                f"{self.base_url}/Patient",
                params=params
            )
            response.raise_for_status()

            bundle = response.json()
            if bundle.get("resourceType") == "Bundle":
                return [
                    entry["resource"]
                    for entry in bundle.get("entry", [])
                    if entry.get("resource")
                ]
            return []

        except Exception as e:
            logger.error(f"Patient search failed: {e}")
            return []

    def create_resource(
        self,
        resource_type: str,
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create a FHIR resource."""
        try:
            response = self.session.post(
                f"{self.base_url}/{resource_type}",
                json=data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error creating {resource_type}: {e}")
            return None

    def update_resource(
        self,
        resource_type: str,
        resource_id: str,
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an existing FHIR resource."""
        try:
            response = self.session.put(
                f"{self.base_url}/{resource_type}/{resource_id}",
                json=data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error updating {resource_type}/{resource_id}: {e}")
            return None

    def execute_operation(
        self,
        resource_type: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Optional[Any]:
        """Execute a FHIR operation on a resource type."""
        try:
            url = f"{self.base_url}/{resource_type}/${operation}"
            response = self.session.post(
                url,
                json=params or {}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error executing ${operation} on {resource_type}: {e}")
            return None


class FHIRMapper:
    """
    Maps healthcare data to FHIR resources.
    """

    @staticmethod
    def patient_from_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert dict to FHIR Patient resource."""
        patient = {
            "resourceType": "Patient",
            "identifier": [],
            "name": [],
            "telecom": [],
            "address": []
        }

        # Map identifier
        if "id" in data:
            patient["id"] = data["id"]

        if "mrn" in data:
            patient["identifier"].append({
                "system": "http://hospital.example.org/mrn",
                "value": data["mrn"]
            })

        # Map name
        if "name" in data or "first_name" in data or "last_name" in data:
            name = {
                "use": "official",
                "family": data.get("last_name", data.get("name", "")),
                "given": [
                    data.get("first_name", ""),
                    data.get("middle_name", "")
                ]
            }
            patient["name"].append(name)

        # Map telecom
        if "email" in data:
            patient["telecom"].append({
                "system": "email",
                "value": data["email"],
                "use": "home"
            })

        if "phone" in data:
            patient["telecom"].append({
                "system": "phone",
                "value": data["phone"],
                "use": "mobile"
            })

        # Map address
        if "address" in data:
            patient["address"].append({
                "use": "home",
                "line": [data["address"].get("street", "")],
                "city": data["address"].get("city", ""),
                "state": data["address"].get("state", ""),
                "postalCode": data["address"].get("zip", ""),
                "country": data["address"].get("country", "USA")
            })

        return patient
