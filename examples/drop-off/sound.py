"""Synthesize the original eight-second stereo sound for Drop-Off."""

from math import exp, pi, sin, tanh
from pathlib import Path
from random import Random
from struct import pack
from wave import open as wave_open

RATE = 48000
DURATION = 8


def envelope(time, start, decay):
    age = time - start
    return min(1.0, age * 1000) * exp(-age / decay) if age >= 0 else 0


def strike(time, start, decay, frequency):
    return envelope(time, start, decay) * sin(2 * pi * frequency * (time - start))


def moving(time, start, end):
    return max(0.0, min(1.0, (time - start) * 22, (end - time) * 12))


def synthesize():
    rng = Random(101104)
    pcm = bytearray()
    smooth_noise = 0.0

    for index in range(RATE * DURATION):
        time = index / RATE
        noise = rng.uniform(-1, 1)
        smooth_noise = .87 * smooth_noise + .13 * noise

        room = .023 * sin(2 * pi * 59 * time) + .012 * sin(2 * pi * 107 * time)
        room += .09 * smooth_noise
        scrape = moving(time, -.04, .58) + .64 * moving(time, .62, 1.39)
        scrape *= .28 * smooth_noise + .071 * sin(2 * pi * (145 * time + 7 * time ** 2))
        stop = .48 * strike(time, .58, .105, 123) + .22 * strike(time, .58, .053, 487)
        stop += .15 * noise * envelope(time, .58, .025)

        door = moving(time, 2.34, 2.77) * (.13 * sin(2 * pi * 156 * time) + .19 * smooth_noise)
        door += .22 * strike(time, 2.37, .053, 251) + .17 * strike(time, 2.73, .045, 357)
        landing = .41 * strike(time, 3.42, .12, 77) + .10 * noise * envelope(time, 3.42, .042)
        landing += .105 * strike(time, 3.51, .075, 111)

        signal = .155 * strike(time, 4.38, .17, 659) + .125 * strike(time, 4.52, .20, 988)
        belt = moving(time, 5.02, 7.5) * (.06 * sin(2 * pi * 109 * time) + .14 * smooth_noise)
        fade = min(1.0, (DURATION - time) * 3)
        center = room + stop + door + landing + signal
        left = .78 * tanh(center + scrape * 1.12 + belt * .86) * fade
        right = .78 * tanh(center * .97 + scrape * .88 + belt * 1.14) * fade
        pcm.extend(pack('<hh', round(left * 32767), round(right * 32767)))

    output_path = Path(__file__).with_name('original-foley.wav')
    with wave_open(str(output_path), 'wb') as output:
        output.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(pcm)


if __name__ == '__main__':
    synthesize()
