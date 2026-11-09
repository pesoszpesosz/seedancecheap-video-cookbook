"""Rebuild the two 3-second audio passes from the Cookbook J-cut example.

Run with Python 3 and FFmpeg on PATH:
    python examples/j-cut/replay.py green-means-go-original.mp4 night-run-original.mp4 ./j-cut-output

The WAVs are audio comparisons before the final video's mastering and end card.
Their output picture cut is fixed at 1.500 s in either pass.
"""

import argparse
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import wave

SAMPLE_RATE = 48_000
PASS_FRAMES = 144_000
CUT_FRAME = 72_000
LEAD_FRAMES = 14_400


def trim(stream, start, stop, label):
    return (
        f"[{stream}:a:0]aresample={SAMPLE_RATE},"
        f"aformat=sample_rates={SAMPLE_RATE}:channel_layouts=stereo,"
        f"atrim=start_sample={start}:end_sample={stop},asetpts=PTS-STARTPTS[{label}];"
    )


def render_audio(green, night, output, lead):
    graph = trim(0, 12_000, 84_000, "first") + trim(1, 48_000 - lead, 120_000, "second")
    if lead:
        graph += f"[first][second]acrossfade=ns={lead}:c1=tri:c2=tri[out]"
    else:
        graph += "[first][second]concat=n=2:v=0:a=1[out]"
    subprocess.run(
        [
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
            "-i", str(green), "-i", str(night),
            "-filter_complex", graph, "-map", "[out]",
            "-c:a", "pcm_s16le", str(output),
        ],
        check=True,
    )


def samples(file):
    with wave.open(str(file), "rb") as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getnframes()) != (
            2, 2, SAMPLE_RATE, PASS_FRAMES
        ):
            raise ValueError(f"{file.name} must contain 3 seconds of 48 kHz stereo PCM.")
        return audio.readframes(PASS_FRAMES)


def replay(green, night, directory):
    directory.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".j-cut-", dir=directory) as stage:
        temporary = Path(stage)
        names = ("hard-cut.wav", "j-cut.wav")
        render_audio(green, night, temporary / names[0], 0)
        render_audio(green, night, temporary / names[1], LEAD_FRAMES)
        baseline, prelap = (samples(temporary / name) for name in names)
        # Two signed 16-bit samples per stereo frame.
        overlap_start = (CUT_FRAME - LEAD_FRAMES) * 4
        overlap_end = CUT_FRAME * 4
        if baseline[:overlap_start] != prelap[:overlap_start] or baseline[overlap_end:] != prelap[overlap_end:]:
            raise ValueError("Audio differs outside the intended 300 ms overlap.")
        if baseline[overlap_start:overlap_end] == prelap[overlap_start:overlap_end]:
            raise ValueError("Audio passes match throughout. Check the source audio tracks.")
        # Validate both destinations before promoting either generated file.
        for name in names:
            final = directory / name
            if final.exists() and samples(final) != samples(temporary / name):
                raise FileExistsError(f"{final} contains a different edit. Choose another output directory.")
        for name in names:
            final = directory / name
            if not final.exists():
                os.replace(temporary / name, final)
    print("Verified two 3-second WAVs. Only the 300 ms overlap differs.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("green_means_go", type=Path, help="Original Green Means Go MP4")
    parser.add_argument("night_run", type=Path, help="Original Night Run MP4")
    parser.add_argument("output_directory", type=Path)
    args = parser.parse_args()
    replay(args.green_means_go, args.night_run, args.output_directory)
