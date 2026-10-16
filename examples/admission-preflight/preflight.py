"""Local teaching example. No network, credential, purchase or generation call."""
import math


def preflight(availability, policy, size, funding, now, references=False):
    if not isinstance(availability, dict):
        return "WAIT_UNVERIFIED"
    checked = availability.get("checked_at")
    if (type(checked) not in (int, float) or not math.isfinite(checked)
            or checked <= 0 or checked > now + 60 or now - checked > 120):
        return "WAIT_UNVERIFIED"
    status = availability.get("generation_status")
    if status not in ("available", "unavailable"):
        return "WAIT_UNVERIFIED"
    if status == "unavailable":
        return "WAIT_CAPACITY"
    if not isinstance(policy, dict) or policy.get("generation_enabled") is not True:
        return "WAIT_ADMISSION"
    sizes = availability.get("available_sizes")
    if not isinstance(sizes, list) or size not in sizes:
        return "WAIT_FORMAT"
    if references and policy.get("reference_generation_enabled") is not True:
        return "WAIT_REFERENCES"
    if funding == "trial":
        return ("REVIEW_TRIAL_ELIGIBILITY" if policy.get("free_trial_enabled") is True
                else "WAIT_TRIAL_PAUSED")
    if funding == "paid":
        return "REVIEW_PAID_FUNDING"
    return "CHOOSE_FUNDING"
