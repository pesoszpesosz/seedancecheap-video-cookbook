# Drop-Off

An eight-second animation by SeedanceCheap. The parcel reaches a stop, the floor opens and the camera follows the fall into a padded tray. The landing sound comes before the acceptance chime.

- Open `drop-off.html` with `scene.js` beside it. The canvas is 1080 × 1920. Call `window.__seek(seconds)` in the browser console to inspect an exact moment.
- Run `python sound.py` to synthesize the 48 kHz stereo WAV. The sound script uses the same collision, landing and chime timings as the animation.
- For an MP4, capture frames 0 through 239 at `frame / 30` seconds. Encode the images as H.264 with AAC stereo. The public master applies gain and a limiter to the synthesized WAV.

[Watch the short and see the three beats](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/drop-off.html?from=github).
