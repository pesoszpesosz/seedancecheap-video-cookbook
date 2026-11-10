import unittest

from check_request import check_request


class SavedRequestCases(unittest.TestCase):
    def test_recipe_and_format_are_bound_to_the_same_observation(self):
        model = "veo31-text-8s-720"
        request = {"model": model, "ratio": "9:16", "size": "720x1280"}
        observation = {
            "generation_status": "available",
            "checked_at": 2000,
            "available_sizes": ["1280x720", "720x1280"],
            "available_formats": [
                {"ratio": "9:16", "size": "720x1280"},
                {"ratio": "16:9", "size": "1280x720"},
            ],
        }

        cases = [
            (request, {model: observation}, "REVIEW_FUNDING"),
            ({**request, "ratio": "16:9"}, {model: observation}, "WAIT_FORMAT"),
            (request, {"veo-3.1": observation}, "WAIT_UNVERIFIED"),
            (request, {model: {**observation, "available_formats": None}}, "WAIT_FORMAT"),
            (request, {model: {**observation, "checked_at": 1879}}, "WAIT_UNVERIFIED"),
            (request, {model: {**observation, "generation_status": "unavailable"}}, "WAIT_CAPACITY"),
            (request, None, "WAIT_UNVERIFIED"),
            ({**request, "size": True}, {model: observation}, "INVALID_REQUEST"),
        ]
        for payload, models, expected in cases:
            with self.subTest(expected=expected, payload=payload):
                self.assertEqual(check_request(payload, {"models": models}, 2000), expected)
