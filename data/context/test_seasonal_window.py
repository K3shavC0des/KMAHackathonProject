import unittest
from datetime import date

from seasonal_window import seasonal_distance_days


class SeasonalWindowTests(unittest.TestCase):
    def test_leap_day_against_nonleap_current_year(self):
        self.assertEqual(seasonal_distance_days(date(2020, 2, 29), date(2026, 3, 1)), 1)

    def test_window_wraps_across_new_year(self):
        self.assertEqual(seasonal_distance_days(date(2020, 12, 31), date(2026, 1, 2)), 2)

    def test_dates_outside_window_are_rejected(self):
        self.assertGreater(seasonal_distance_days(date(2020, 1, 1), date(2026, 7, 2)), 15)


if __name__ == '__main__':
    unittest.main()
