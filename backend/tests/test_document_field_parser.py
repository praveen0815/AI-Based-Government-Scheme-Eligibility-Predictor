"""Education-certificate field parser tests. No files or eligibility scoring."""

from __future__ import annotations

import unittest
from datetime import date

from app.services.document_field_parser import coerce_confirmed_education_fields, parse_education_certificate


class EducationCertificateParserTests(unittest.TestCase):
    def test_extracts_documented_education_fields(self) -> None:
        text = (
            "Government Higher Secondary School Tamil Medium marksheet. "
            "The student is studying in first year undergraduate course. "
            "Date of Birth: 01/01/2006"
        )
        values, clarity = parse_education_certificate(text, today=date(2026, 9, 28))
        self.assertEqual(values["age"], 20)
        self.assertEqual(clarity["age"], "extracted")
        self.assertTrue(values["is_student"])
        self.assertEqual(clarity["is_student"], "extracted")
        self.assertTrue(values["first_higher_education_course"])
        self.assertEqual(clarity["first_higher_education_course"], "extracted")
        self.assertEqual(values["school_background"], "government_or_aided_tamil_medium_6_to_12")
        self.assertEqual(clarity["school_background"], "extracted")

    def test_marks_unclear_and_missing_fields(self) -> None:
        values, clarity = parse_education_certificate("School certificate issued by the board.")
        self.assertIsNone(values["age"])
        self.assertEqual(clarity["age"], "missing")
        self.assertIsNone(values["first_higher_education_course"])
        self.assertEqual(clarity["first_higher_education_course"], "missing")
        self.assertEqual(values["school_background"], "other")
        self.assertEqual(clarity["school_background"], "unclear")

    def test_empty_text_is_entirely_missing(self) -> None:
        values, clarity = parse_education_certificate("   ")
        self.assertEqual(set(values), {"age", "is_student", "first_higher_education_course", "school_background"})
        self.assertTrue(all(value is None for value in values.values()))
        self.assertTrue(all(level == "missing" for level in clarity.values()))

    def test_low_ocr_confidence_downgrades_extracted_fields(self) -> None:
        text = "Government school Classes 6 to 12. The student is studying."
        _values, clarity = parse_education_certificate(text, mean_confidence=20)
        self.assertEqual(clarity["is_student"], "unclear")
        self.assertEqual(clarity["school_background"], "unclear")

    def test_confirm_coercion_rejects_unknown_wallet_fields(self) -> None:
        with self.assertRaises(ValueError):
            coerce_confirmed_education_fields({"annual_income": 120000})
        with self.assertRaises(ValueError):
            coerce_confirmed_education_fields({"school_background": "private_only"})
        confirmed = coerce_confirmed_education_fields({"is_student": "yes", "age": "19"})
        self.assertEqual(confirmed, {"is_student": True, "age": 19})
