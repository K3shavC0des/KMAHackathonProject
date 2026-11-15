import unittest
from datetime import date
from risk import mean_for, screen, seven_day_keys


class ScreenTests(unittest.TestCase):
    def test_missing_weather_does_not_become_zero(self):
        self.assertIsNone(mean_for({}, date(2026, 7, 2)))
        self.assertEqual(len(seven_day_keys(date(2026, 7, 2))), 7)

    def test_uncertain_drying_does_not_claim_elevated_risk(self):
        changes = [-.03] * 63 + [.01] * 37
        history = [30 + i / 100 for i in range(30)]
        self.assertEqual(screen(changes, 33, history, .013)[0], 'watch')
        self.assertEqual(screen(changes, 33, history, .2)[0], 'elevated')
        with self.assertRaises(ValueError):
            screen(changes, 33, history[:5], .2)


if __name__ == '__main__':
    unittest.main()
