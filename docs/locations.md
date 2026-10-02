# Bangladesh location dataset review

Source: https://github.com/nuhil/bangladesh-geocode
Pinned commit: `5622f68bd07a98e076edcf8100bf0db6a75b9854`
Upstream last commit: 2023-03-17T22:25:08Z
Imported counts: {'divisions': 8, 'districts': 64, 'upazilas': 494, 'unions': 4540}

MIT license retained at `data/LICENSE`. Attribution: Nuhil Bangladesh GeoCode contributors. Upstream describes bangladesh.gov.bd, Wikipedia and Google Maps as its sources. This is source provenance, not an independent accuracy guarantee.

The snapshot predates current deployment by more than three years. It has 8 divisions and 64 districts but 494 upazilas; newly created upazilas, administrative changes and municipal wards are not verified. The English name Chattagram and other legacy spellings are preserved from upstream to avoid undocumented guessing. Names are not treated as unique identifiers. All imported parent references and IDs are validated, and English names must be nonempty. Bangla names are retained when present.

Urban metropolitan thana, city corporation wards, municipal wards and areas are not reliably represented. Upazila is never relabeled as thana. Government National Portal (https://bangladesh.gov.bd/) and individual city corporation gazettes should be used for a future independently reviewed supplement with explicit reuse permission. No additional administrative rows have been invented or copied from unlicensed sources. Current nationwide completeness is not claimed.

Private fallback text works when the locality or child area is unavailable under a known parent. Search can narrow to that parent without pretending the free text is an administrative record. To add vetted urban records, extend the location import with source-namespaced stable IDs, THANA/WARD/AREA types, bilingual names and versioned source attribution, preserving hierarchy validation.
