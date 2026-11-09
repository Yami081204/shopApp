# Vietnam address and postal-code data

`vietnam-address-data.json` is the Vietnamese-only simplified dataset from
[vietnamese-provinces-database v5.2.0](https://github.com/thanglequoc/vietnamese-provinces-database/tree/v5.2.0),
pinned to that release so checkout does not depend on a third-party API at runtime.
The source contains 34 provinces and 3,321 commune-level units with five-digit
postal codes. The checkout uses the current province and ward hierarchy; it
does not infer legacy district boundaries.

The dataset is community-maintained reference data and is not affiliated with
the Vietnamese government. Verify a postal code with the
[National Postal Code portal](https://mabuuchinh.vn/) when exact delivery
address validation is required. The included `LICENSE` file applies to the
upstream dataset.
