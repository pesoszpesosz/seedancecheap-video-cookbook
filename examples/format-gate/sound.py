"""Original deterministic roller, stop and acceptance sounds."""
from math import exp, pi, sin, tanh
from pathlib import Path
from random import Random
from struct import pack
from wave import open as wave_open

RATE = 48000
DURATION = 8
rng = Random(20261110)
pcm = bytearray()
smoothed = 0.0

def impulse(time, start, decay):
    age = time - start
    if age < 0:
        return 0.0
    return min(1.0, age * 1200) * exp(-age / decay)

def tone(time, start, decay, frequency):
    return impulse(time, start, decay) * sin(2 * pi * frequency * (time - start))

def moving(time, start, end):
    return max(0.0, min(1.0, (time - start) * 18, (end - time) * 15))

for index in range(RATE * DURATION):
    t = index / RATE
    noise = rng.uniform(-1, 1)
    smoothed = smoothed * .89 + noise * .11
    roll = max(moving(t, -.12, .46), moving(t, 2.64, 3.15), moving(t, 3.25, 6.10))
    hum = .021 * sin(2 * pi * 57 * t) + .018 * sin(2 * pi * 98 * t) + .042 * smoothed
    rollers = roll * (.071 * sin(2 * pi * (134 * t + 3.9 * t * t)) + .24 * smoothed)
    jam = .62 * tone(t, .46, .13, 104) + .35 * tone(t, .46, .052, 463)
    jam += .24 * noise * impulse(t, .46, .031) + .09 * tone(t, .54, .08, 704)
    reset = .21 * tone(t, 2.70, .070, 153) + .14 * noise * impulse(t, 2.70, .027)
    pass_latch = .20 * tone(t, 5.05, .08, 164) + .14 * noise * impulse(t, 5.05, .025)
    chime = .12 * tone(t, 5.14, .24, 662) + .09 * tone(t, 5.27, .24, 881)
    fade = min(1.0, max(0.0, (DURATION - t) * 3.8))
    mix = hum + rollers + jam + reset + pass_latch + chime
    left = tanh(mix * 1.08) * fade
    right = tanh((mix + .035 * roll * smoothed - .035 * jam) * 1.08) * fade
    pcm.extend(pack('<hh', round(left * 32767), round(right * 32767)))

with wave_open(str(Path(__file__).with_name('original-foley.wav')), 'wb') as output:
    output.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
    output.writeframes(pcm)
