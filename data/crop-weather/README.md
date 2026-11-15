# Crop and weather context

The map provides this view for Nagapattinam, Ludhiana, Ahmedabad, and Nairobi.
It combines observed NISAR SME2 moisture changes with NASA POWER weather at
city scale. Open **How this reading is combined** in the map for each city's
measured inputs.

## How the city signal is calculated

Three independent cues are counted:

- **NISAR drying:** at least half of the matched cells fell by 2 or more
  percentage points in surface moisture.
- **Unusual heat:** the seven-day mean daily high reached or exceeded the 90th
  percentile of matching weeks from 1991–2020.
- **Low rain:** seven-day rainfall fell below the 1991–2020 median for the
  same calendar week.

The city summary reports how many of these three cues coincide. NASA POWER
weather contributes only to this city-level context; it is not assigned to map
blocks. Block colors use NISAR moisture changes alone. Humidity is shown as
weather context but is not in the signal because a matched humidity baseline is
not included. Locally sourced crop choices identify possible crops or seasons;
they do not verify what is planted and do not affect the signal.

This is a transparent screening rule, not a calibrated crop-risk model. The
SME2 estimates describe surface moisture, not root-zone water or plant stress.
Crop presence and growth stage are unknown. Per-date NISAR uncertainty was
checked only for Nagapattinam. No S-band product is used.

## Sources

- [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- [NISAR SME2 guide](https://nisar-docs.asf.alaska.edu/sme2/)
- [Observed NISAR city coverage and provenance](../observed/CITIES.md)
- Local crop sources are linked from the crop selector for each city.

Regenerate city reports from the project root with:

```powershell
python data/crop-weather/build_city_reports.py
```
