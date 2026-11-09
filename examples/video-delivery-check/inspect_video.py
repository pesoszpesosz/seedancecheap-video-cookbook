"""Inspect local delivery metadata or verify a downloaded MP4 through full decode."""
import argparse
import hashlib
import json
import math
import re
import subprocess
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



def inspect_mp4(path):
    path = path.resolve(strict=True)
    if not path.is_file():
        raise ValueError('Choose a regular local MP4 file')
    before = path.stat()
    input_options = ['-protocol_whitelist', 'file,pipe', '-f', 'mov']
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', *input_options, '-show_streams', '-show_format',
         '-of', 'json', str(path)],
        capture_output=True, check=True,
    )
    result = summarize(json.loads(probe.stdout))
    subprocess.run(
        ['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-err_detect', 'explode',
         *input_options, '-i', str(path), '-map', '0:V', '-map', '0:a?', '-f', 'null', '-'],
        capture_output=True, check=True,
    )
    digest = hashlib.sha256()
    with path.open('rb') as media:
        for block in iter(lambda: media.read(1024 * 1024), b''):
            digest.update(block)
    after = path.stat()
    if (before.st_size, before.st_mtime_ns, before.st_ino) != (
        after.st_size, after.st_mtime_ns, after.st_ino
    ):
        raise ValueError('File changed during inspection. Wait for the download to finish.')
    return {**result, 'bytes': after.st_size, 'sha256': digest.hexdigest(), 'full_decode': True}


def pixels(value):
    if not re.fullmatch(r'[1-9][0-9]*x[1-9][0-9]*', value.lower()):
        raise argparse.ArgumentTypeError('Use WIDTHxHEIGHT, for example 720x1280')
    return [int(side) for side in value.lower().split('x')]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='ffprobe JSON, or a local MP4 with --decode')
    parser.add_argument('--decode', action='store_true', help='Probe and decode the local MP4')
    parser.add_argument('--expect-pixels', type=pixels, help='Check encoded WIDTHxHEIGHT')
    args = parser.parse_args()
    try:
        result = (
            inspect_mp4(args.input) if args.decode
            else summarize(json.loads(args.input.read_text(encoding='utf-8-sig')))
        )
        if args.expect_pixels is not None:
            result['expected_encoded_pixels'] = args.expect_pixels
            result['encoded_pixels_match'] = result['encoded_pixels'] == args.expect_pixels
        print(json.dumps(result, indent=2, allow_nan=False))
        if result.get('encoded_pixels_match') is False:
            raise SystemExit(2)
    except subprocess.CalledProcessError as error:
        reason = error.stderr.decode('utf-8', errors='replace').strip()
        raise SystemExit(f'{error.cmd[0]} could not verify the file. {reason}')
    except (OSError, ValueError, TypeError, AttributeError) as error:
        raise SystemExit('Cannot inspect input: ' + str(error))
