import array
import math
from pathlib import Path
import random
import sys
import wave

destination = Path(sys.argv[1])
sample_rate = 48000
tau = 2 * math.pi
noise = random.Random(310)
samples = array.array("h")

def ring(t, start, frequency, decay, amplitude):
    age = t - start
    if age < 0:
        return 0
    return amplitude * math.exp(-decay * age) * math.sin(tau * frequency * age)

def gate(t, start, end, rise=.12, fall=.09):
    return max(0, min(1, (t-start)/rise, (end-t)/fall))

for index in range(8 * sample_rate):
    t = index / sample_rate
    hiss = noise.uniform(-1, 1)
    room = .017 * math.sin(tau * 48 * t) + .012 * math.sin(tau * 67 * t)
    drop = gate(t, .52, 3.46)
    wind = hiss * (.014 + .07 * max(0, (t-.52)/2.94)) * drop
    motor = .052 * math.sin(tau * (84 * t + 10.5*t*t)) * gate(t, 2.59, 3.18)
    snap = ring(t, .52, 267, 34, .20) + ring(t, .52, 1200, 50, .15)
    impact = sum(ring(t, 3.46, f, d, a) for f, d, a in
                 [(67, 12, .38), (151, 14, .17), (418, 17, .13), (1084, 26, .09)])
    ratchet = ring(t, 4.42, 386, 37, .11) + ring(t, 4.48, 715, 45, .055)
    resolved = ring(t, 5.38, 129, 2.4, .058) + ring(t, 5.38, 193.5, 3.1, .04)
    left = room + wind*.86 + motor*.78 + snap + impact + ratchet*.70 + resolved
    right = room + wind*1.13 + motor*1.1 + snap*.87 + impact*.92 + ratchet + resolved*.91
    for value in (left, right):
        samples.append(int(max(-1, min(1, value)) * 32767))
with wave.open(str(destination), "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(sample_rate)
    output.writeframes(samples.tobytes())
