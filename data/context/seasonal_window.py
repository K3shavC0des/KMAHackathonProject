"""Calendar-day distance for a recurring seasonal window."""

from datetime import date


def seasonal_distance_days(a: date, b: date) -> int:
    """Return the shortest calendar distance, including across New Year.

    A leap-year anchor keeps February 29 representable for every source year.
    """
    anchor_a = a.replace(year=2000)
    anchor_b = b.replace(year=2000)
    distance = abs((anchor_a - anchor_b).days)
    return min(distance, 366 - distance)
