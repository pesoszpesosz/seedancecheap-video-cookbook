import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("preflight_example", Path(__file__).with_name("preflight.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreflightCases(unittest.TestCase):
    def test_public_status_decisions(self):
        available = {"generation_status": "available", "checked_at": 2000, "available_sizes": ["1280x720"]}
        policy = {"generation_enabled": True, "free_trial_enabled": False, "reference_generation_enabled": False}
        cases = [
            (available, policy, "1280x720", "paid", False, "REVIEW_PAID_FUNDING"),
            (available, {**policy, "free_trial_enabled": True}, "1280x720", "trial", False, "REVIEW_TRIAL_ELIGIBILITY"),
            (available, policy, "1280x720", "trial", False, "WAIT_TRIAL_PAUSED"),
            ({**available, "generation_status": "unavailable"}, policy, "1280x720", "paid", False, "WAIT_CAPACITY"),
            ({**available, "generation_status": "unknown"}, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            ({**available, "checked_at": 1879}, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            ({**available, "checked_at": 2061}, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            ({**available, "checked_at": True}, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            ({**available, "checked_at": float("nan")}, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            ({**available, "available_sizes": None}, policy, "1280x720", "paid", False, "WAIT_FORMAT"),
            (available, policy, "720x1280", "paid", False, "WAIT_FORMAT"),
            (available, {**policy, "generation_enabled": False}, "1280x720", "paid", False, "WAIT_ADMISSION"),
            (available, {**policy, "generation_enabled": "true"}, "1280x720", "paid", False, "WAIT_ADMISSION"),
            (available, policy, "1280x720", "paid", True, "WAIT_REFERENCES"),
            (available, {**policy, "reference_generation_enabled": True}, "1280x720", "paid", True, "REVIEW_PAID_FUNDING"),
            (available, policy, "1280x720", "", False, "CHOOSE_FUNDING"),
            (None, policy, "1280x720", "paid", False, "WAIT_UNVERIFIED"),
            (available, None, "1280x720", "paid", False, "WAIT_ADMISSION"),
            ({**available, "checked_at": 1880}, policy, "1280x720", "paid", False, "REVIEW_PAID_FUNDING"),
            ({**available, "checked_at": 2060}, policy, "1280x720", "paid", False, "REVIEW_PAID_FUNDING"),
        ]
        for observation, settings, size, funding, references, expected in cases:
            with self.subTest(expected=expected, observation=observation):
                self.assertEqual(module.preflight(observation, settings, size, funding, 2000, references), expected)
        self.assertEqual(len(cases), 20)


if __name__ == "__main__":
    unittest.main()
