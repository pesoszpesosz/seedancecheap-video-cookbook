# Inspect a delivered video locally

This example accompanies [our complete inspection guide](https://seedancecheap.wordpress.com/2026/10/16/check-an-ai-videos-resolution-duration-and-audio-before-you-use-it/). Published by the SeedanceCheap team, an independent studio; prepared with Codex.

The Python script reads an already-created local ffprobe JSON report. It makes no network requests, uploads, generation calls or changes to your video. It needs only Python's standard library. The separate probe command requires an existing ffprobe installation.

## Try the synthetic report

From this directory, run:

```sh
python inspect_video.py probe-example.json
```

The invented report describes one 1280 × 720 video stream, a 30.08-second container and one audio stream. It is a demonstration fixture, not generated footage or a delivery benchmark. Use `python3` if that is your interpreter's command name.

## Inspect your own local file

```sh
ffprobe -v error -show_streams -show_format -of json -o probe.json "delivered.mp4"
python inspect_video.py probe.json
```

Keep quotes around a path containing spaces. The full probe report can include a filename or other metadata, so keep it local and review it before sharing.

The summary selects the first moving-video stream and excludes attached cover art. It also reports how many moving-video streams were found. For a multi-stream file, inspect the intended picture stream separately. Missing or nonfinite duration becomes `null`; missing video dimensions cause an explicit error.

Encoded dimensions describe the export. Rotation and non-square pixels can affect the displayed orientation and shape. An audio-stream count does not establish audible or synchronized sound. A 1080 export can have been upscaled from a smaller source. This script does not prove native generation resolution or creative quality.

The exact script passed ten synthetic cases during the guide's review and read an existing public 720 × 1280, 30.08-second sample with one audio stream. No new video was generated. Watch and listen to your complete result before accepting a shot.

[Official ffprobe documentation](https://ffmpeg.org/ffprobe.html) · [Free usable-footage budget worksheet](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/) · [SeedanceCheap](https://seedancecheap.com/?utm_source=github&utm_medium=code_example&utm_campaign=delivery_metadata_oct16)
