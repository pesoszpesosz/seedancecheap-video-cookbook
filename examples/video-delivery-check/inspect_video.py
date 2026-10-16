"""Summarize a local ffprobe JSON report. No network or media mutation."""
import json
import math
import sys
from pathlib import Path


def positive_number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) and number > 0 else None


def summarize(report):
    streams = report.get('streams', [])
    videos = [s for s in streams if s.get('codec_type') == 'video'
              and not s.get('disposition', {}).get('attached_pic')]
    if not videos:
        raise ValueError('No moving-video stream found')
    video = videos[0]
    width = positive_number(video.get('width'))
    height = positive_number(video.get('height'))
    if width is None or height is None:
        raise ValueError('Video dimensions are missing or invalid')
    duration = positive_number(report.get('format', {}).get('duration'))
    if duration is None:
        duration = positive_number(video.get('duration'))
    rotations = [s['rotation'] for s in video.get('side_data_list', [])
                 if 'rotation' in s]
    return {
        'selected_video_stream': video.get('index'),
        'moving_video_streams': len(videos),
        'encoded_pixels': [int(width), int(height)],
        'rotation_metadata': rotations,
        'sample_aspect_ratio': video.get('sample_aspect_ratio', 'unknown'),
        'declared_average_frame_rate': video.get('avg_frame_rate', 'unknown'),
        'container_or_video_duration_seconds': duration,
        'audio_stream_count': sum(s.get('codec_type') == 'audio' for s in streams),
        'native_generation_resolution_proven': False,
        'creative_quality_reviewed': False,
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python inspect_video.py probe.json')
    try:
        data = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
        print(json.dumps(summarize(data), indent=2, allow_nan=False))
    except (OSError, ValueError, TypeError, AttributeError) as error:
        raise SystemExit('Cannot inspect report: ' + str(error))
