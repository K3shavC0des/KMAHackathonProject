import unittest

from build_city_reports import combine_city_signals


class CityFusionTests(unittest.TestCase):
    def test_counts_drying_heat_and_low_rain(self):
        weather = {'percentile': 0.9, 'seven_day_rain_mm': 4, 'baseline_rain_median_mm': 5}
        result = combine_city_signals(0.5, weather)
        self.assertEqual(result['count'], 3)
        self.assertTrue(all(result['signals'].values()))

    def test_rain_equal_to_baseline_is_not_a_shortfall(self):
        weather = {'percentile': 0.89, 'seven_day_rain_mm': 5, 'baseline_rain_median_mm': 5}
        result = combine_city_signals(0.49, weather)
        self.assertEqual(result['count'], 0)
        self.assertFalse(any(result['signals'].values()))


if __name__ == '__main__':
    unittest.main()
