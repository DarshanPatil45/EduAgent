def sm2_update(ease: float, interval: int, repetitions: int, quality: int) -> dict:
    """Standard SM-2 algorithm: quality is a 0-5 self-rating of recall (below 3 = forgotten)."""
    quality = max(0, min(5, quality))
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease = max(1.3, ease)

    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease)
        repetitions += 1

    return {"ease": round(ease, 2), "interval": interval, "repetitions": repetitions}