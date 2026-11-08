"""Compare local audio content and decoded frame timestamps."""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import correlate, correlation_lags

SAMPLE_RATE = 16_000
MAX_SHIFT_MS = 250


def run(*command):
    return subprocess.run(command, capture_output=True, check=True).stdout


def decode_audio(path, seconds):
    pcm = run(
        "ffmpeg", "-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe",
        "-i", str(path.resolve()), "-map", "0:a:0",
        "-t", str(seconds), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "pipe:1",
    )
    return np.frombuffer(pcm, dtype="<f4").astype(np.float64)


def compare_audio(reference, export):
    count = min(len(reference), len(export))
    limit = SAMPLE_RATE * MAX_SHIFT_MS // 1000
    if count < SAMPLE_RATE:
        raise ValueError("Both inputs must contain at least one second of decoded audio.")
    reference, export = reference[:count], export[:count]
    if any(not np.isfinite(x).all() or np.std(x) < 1e-8 for x in (reference, export)):
        raise ValueError("The comparison requires two finite, non-silent audio passages.")
    lags = correlation_lags(count, count)
    within_limit = np.abs(lags) <= limit
    scores = correlate(export - export.mean(), reference - reference.mean(), method="fft")
    shift = int(lags[within_limit][np.argmax(scores[within_limit])])
    export_start, reference_start = max(shift, 0), max(-shift, 0)
    overlap = count - abs(shift)
    a = export[export_start:export_start + overlap]
    b = reference[reference_start:reference_start + overlap]
    if np.std(a) < 1e-8 or np.std(b) < 1e-8:
        raise ValueError("The aligned overlap is silent in at least one input.")
    return {
        "comparison_sample_rate_hz": SAMPLE_RATE,
        "search_limit_ms": MAX_SHIFT_MS,
        "export_content_delay_ms": round(1000 * shift / SAMPLE_RATE, 4),
        "aligned_overlap_seconds": overlap / SAMPLE_RATE,
        "aligned_correlation": round(float(np.corrcoef(a, b)[0, 1]), 6),
    }


def frame_timing(report):
    streams = report["streams"]
    video = next((s["index"] for s in streams if s["codec_type"] == "video"
                  and not s.get("disposition", {}).get("attached_pic")), None)
    audio = next((s["index"] for s in streams if s["codec_type"] == "audio"), None)
    picture, sound = [], []
    for frame in report.get("frames", []):
        stamp = frame.get("best_effort_timestamp_time")
        if stamp in (None, "N/A"):
            continue
        stamp = float(stamp)
        if not np.isfinite(stamp):
            continue
        if frame["stream_index"] == video:
            picture.append(stamp)
        elif frame["stream_index"] == audio:
            sound.append(stamp)
    if len(picture) < 2 or not sound:
        raise ValueError("The export needs timestamped moving-video and audio frames.")
    return {
        "first_video_pts_seconds": picture[0],
        "first_audio_pts_seconds": sound[0],
        "first_video_minus_audio_ms": round(1000 * (picture[0] - sound[0]), 3),
        "median_video_frame_interval_ms": round(float(np.median(np.diff(picture))) * 1000, 3),
        "video_frame_count_in_probe": len(picture),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path, help="Original score with an audio stream")
    parser.add_argument("export", type=Path, help="Finished video with its soundtrack")
    parser.add_argument("--seconds", type=int, default=20, help="Probe the first 1 to 120 seconds (default 20)")
    args = parser.parse_args()
    if not 1 <= args.seconds <= 120:
        parser.error("--seconds must be between 1 and 120.")
    if not args.reference.is_file() or not args.export.is_file():
        parser.error("Both inputs must be local files.")
    try:
        soundtrack = compare_audio(decode_audio(args.reference, args.seconds),
                                   decode_audio(args.export, args.seconds))
        report = json.loads(run(
            "ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe",
            "-read_intervals", f"%+{args.seconds}",
            "-show_streams", "-show_frames", "-show_entries",
            "stream=index,codec_type:stream_disposition=attached_pic:frame=stream_index,best_effort_timestamp_time",
            "-of", "json", str(args.export.resolve()),
        ))
        timing = frame_timing(report)
    except FileNotFoundError:
        parser.error("Install FFmpeg and make ffmpeg and ffprobe available on PATH.")
    except subprocess.CalledProcessError as error:
        parser.error(f"{error.cmd[0]} could not decode or probe the input.")
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps({"audio_content_alignment": soundtrack, "decoded_frame_timing": timing}, indent=2))


if __name__ == "__main__":
    main()
