"""Synthesize the stereo engine bed, braking texture and finish cue."""

from math import exp, pi, sin, tanh
from pathlib import Path
from random import Random
from struct import pack
from sys import argv
from wave import open as open_wave

RATE = 48000
DURATION = 8


def ease(time, start, end):
    phase = min(1.0, max(0.0, (time - start) / (end - start)))
    return phase * phase * (3 - 2 * phase)


def tone(time, start, frequency, decay):
    elapsed = time - start
    if elapsed < 0:
        return 0.0
    return sin(2 * pi * frequency * elapsed) * min(1.0, elapsed * 700) * exp(-elapsed / decay)


def synthesize(finish_time):
    pcm = bytearray()
    rng = Random(29017)
    low = teal_phase = amber_phase = 0.0
    for index in range(RATE * DURATION):
        time = index / RATE
        noise = rng.uniform(-1, 1)
        low = .94 * low + .06 * noise
        teal_hz = 124 + 22 * ease(time, 0, 1.4) - 49 * ease(time, 1.39, 2.52) + 38 * ease(time, 3.9, 6.8)
        amber_hz = 111 + 26 * ease(time, 0, 1.6) - 23 * ease(time, 1.74, 2.3) + 49 * ease(time, 3.1, 6.5)
        teal_phase += 2 * pi * teal_hz / RATE
        amber_phase += 2 * pi * amber_hz / RATE
        teal = .12 * (sin(teal_phase) + .43 * sin(2 * teal_phase) + .21 * sin(3 * teal_phase))
        amber = .14 * (sin(amber_phase) + .38 * sin(2 * amber_phase) + .19 * sin(3 * amber_phase))
        scrub = .10 * (noise - low) * (ease(time, 1.36, 1.57) - ease(time, 1.72, 2.2))
        road = .10 * low + .023 * sin(2 * pi * 55 * time)
        finish = .21 * tone(time, finish_time, 676, .15) + .17 * tone(time, finish_time + .14, 1014, .19)
        pan = ease(time, 2.1, 4.6)
        fade = min(1.0, time * 50, (DURATION - time) * 8)
        center = scrub + road + finish
        left = tanh(center + teal * (.94 - .29 * pan) + amber * (.64 + .30 * pan))
        right = tanh(center + teal * (.67 + .30 * pan) + amber * (.95 - .31 * pan))
        pcm.extend(pack('<hh', round(left * fade * 32767), round(right * fade * 32767)))
    with open_wave(str(Path(__file__).with_name('outside-line-foley.wav')), 'wb') as output:
        output.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(pcm)


if __name__ == '__main__':
    synthesize(float(argv[1]))
