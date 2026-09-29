"""Readiness checks for the IEEE manuscript.

The paper must quote existing Phase 4/5 numbers and must not invent
government-accuracy claims. It does not retrain models or call APIs.
"""

from __future__ import annotations

import unittest

from app.paths import baseline_results_path, project_root


class IeeePaperReadinessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.paper_path = project_root() / "docs" / "ieee_paper.md"
        cls.paper = cls.paper_path.read_text(encoding="utf-8")
        cls.baseline = baseline_results_path().read_text(encoding="utf-8")

    def test_manuscript_exists(self) -> None:
        self.assertTrue(self.paper_path.is_file())
        self.assertGreater(len(self.paper), 4000)

    def test_ieee_section_headings(self) -> None:
        required = (
            "## Abstract",
            "**Keywords:**",
            "## I. Introduction",
            "## II. Background and Related Constraints",
            "## III. Problem Formulation",
            "## IV. Dataset",
            "## V. Methodology",
            "## VI. System Architecture",
            "## VII. Experimental Results",
            "## VIII. Limitations and Ethical Scope",
            "## IX. Conclusion",
            "## References",
        )
        for heading in required:
            with self.subTest(heading=heading):
                self.assertIn(heading, self.paper)

    def test_quoted_overall_metrics_match_baseline_results(self) -> None:
        for token in (
            "0.7368",
            "0.2856",
            "0.7729",
            "0.4171",
            "0.7524",
            "0.8338",
            "0.3255",
            "0.9992",
            "0.9932",
            "0.9966",
            "0.9995",
            "1.0000",
            "ba91158194b4060be01894306d72ae25b96e4abeebbdf4ff61e93ffd059d30d0",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.baseline)
                self.assertIn(token, self.paper)

    def test_quoted_dataset_and_split_counts(self) -> None:
        for token in (
            "5000",
            "30000",
            "3653",
            "26347",
            "12.18%",
            "4000",
            "24000",
            "1000",
            "6000",
            "20260814",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.paper)

    def test_quoted_rule_agreement_counts(self) -> None:
        for token in ("1579", "1413", "166"):
            with self.subTest(token=token):
                self.assertIn(token, self.paper)

    def test_hybrid_rule_remains_reference(self) -> None:
        self.assertIn("documented rule", self.paper.lower())
        self.assertIn("reference", self.paper.lower())
        self.assertIn("decision tree", self.paper.lower())

    def test_states_synthetic_rule_agreement_not_government_accuracy(self) -> None:
        lowered = self.paper.lower()
        self.assertIn("synthetic", lowered)
        self.assertIn("rule-derived", lowered)
        self.assertIn("not government accuracy", lowered)
        self.assertIn("does not claim government accuracy", lowered)

    def test_core_scheme_ids_are_the_existing_six(self) -> None:
        for scheme_id in (
            "TN-SW-001",
            "TN-SW-002",
            "TN-SW-004",
            "TN-SW-006",
            "TN-REV-001",
            "TN-REV-002",
        ):
            with self.subTest(scheme_id=scheme_id):
                self.assertIn(scheme_id, self.paper)


if __name__ == "__main__":
    unittest.main()
