# Outside Line

Watch the [complete eight-second short and shot breakdown](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/outside-line.html?from=github). This is an original code-rendered animation and synthesized stereo sound by the SeedanceCheap team with Codex.

Serve this directory locally and open `outside-line.html` in a modern browser. After `window.__simReady` becomes true, call `window.__seek(4.45)` in the browser console to inspect the pass. Rendering samples the same function at `frameIndex / 30` for 240 frames. `window.__raceGeometry` exposes the local spacing and finish checks. The animation uses fixed camera and motion cues with no external assets.

Run `python sound.py 6.133333333333334` to synthesize the 48 kHz stereo source. The argument places the first chime on the sampled finish cue. The released MP4 uses the same source with a 2.8 dB gain adjustment before AAC encoding.
