import unittest

import numpy as np

from inspect_soundtrack import SAMPLE_RATE, compare_audio, frame_timing


class SoundtrackTest(unittest.TestCase):
    def test_offset_sign_and_aligned_overlap(self):
        ref = np.random.default_rng(3).normal(size=2 * SAMPLE_RATE)
        for shift in (421, -421):
            with self.subTest(shift=shift):
                if shift > 0:
                    export = np.pad(ref[:-shift], (shift, 0))
                else:
                    export = np.pad(ref[-shift:], (0, -shift))
                result = compare_audio(ref, export)
                self.assertEqual(result["export_content_delay_ms"], shift * 1000 / SAMPLE_RATE)
                self.assertEqual(result["aligned_overlap_seconds"], (len(ref) - abs(shift)) / SAMPLE_RATE)
                self.assertEqual(result["aligned_correlation"], 1)

    def test_silent_and_short_passages_fail(self):
        with self.assertRaisesRegex(ValueError, "non-silent"):
            compare_audio(np.zeros(SAMPLE_RATE), np.ones(SAMPLE_RATE))
        with self.assertRaisesRegex(ValueError, "at least one second"):
            compare_audio(np.ones(100), np.ones(100))

    def test_frame_pts_use_moving_video_and_first_audio(self):
        report = {
            "streams": [
                {"index": 0, "codec_type": "video", "disposition": {"attached_pic": 1}},
                {"index": 1, "codec_type": "audio"},
                {"index": 2, "codec_type": "video"},
            ],
            "frames": [
                {"stream_index": 0, "best_effort_timestamp_time": "0.000"},
                {"stream_index": 1, "best_effort_timestamp_time": "0.015"},
                {"stream_index": 2, "best_effort_timestamp_time": "0.100"},
                {"stream_index": 2, "best_effort_timestamp_time": "0.133"},
            ],
        }
        result = frame_timing(report)
        self.assertEqual(result["first_video_minus_audio_ms"], 85)
        self.assertEqual(result["median_video_frame_interval_ms"], 33)
        self.assertEqual(result["video_frame_count_in_probe"], 2)
