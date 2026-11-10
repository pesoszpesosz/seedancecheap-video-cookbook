# The Format Gate

This eight-second SeedanceCheap animation shows why a portrait request needs a ratio and a size from the same catalog row. The wide card hits the gate at 0.46 seconds. After it backs out, the portrait card clears the opening and the latch clicks at 5.05 seconds.

- Open `format-gate.html` in a desktop browser with `scene.js` beside it. Use `window.__seek(seconds)` in the browser console to inspect any frame from 0 to 8 seconds. The 1080 × 1920 canvas renders the same scene at the same time on each call.
- Run `python sound.py` to make the eight-second, 48 kHz stereo WAV beside the script. The rollers, jam, reset and acceptance sounds are synthesized from scratch.
- To render an edit, capture the canvas at times `frame / 30` for frames 0 through 239. Encode those frames with the stereo WAV as an H.264/AAC MP4. The published master uses loudness-normalized foley.

The animation illustrates the check. Use the live catalog for the supported values and current availability. [Watch the demo and download the free Postman preflight](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/api-request.html#format-gate).
