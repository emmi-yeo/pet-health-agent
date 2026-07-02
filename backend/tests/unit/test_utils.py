"""
UNIT TESTS — backend utility functions

Tests parse_json_response in complete isolation — no DB, no agents.
"""

import sys
import os
import json
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from main import parse_json_response


class TestParseJsonResponse:
    """Unit tests for the JSON response parser used by all agents."""

    def test_parses_clean_json(self):
        raw = '{"key": "value", "number": 42}'
        result = parse_json_response(raw)
        assert result == {"key": "value", "number": 42}

    def test_strips_markdown_code_fence(self):
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = parse_json_response(raw)
        assert result["key"] == "value"

    def test_strips_code_fence_without_language(self):
        raw = "```\n{\"key\": \"value\"}\n```"
        result = parse_json_response(raw)
        assert result["key"] == "value"

    def test_handles_whitespace_around_json(self):
        raw = '  \n  {"key": "value"}  \n  '
        result = parse_json_response(raw)
        assert result["key"] == "value"

    def test_parses_array_values(self):
        raw = '{"symptoms": ["scratching", "lethargy"], "flagged": true}'
        result = parse_json_response(raw)
        assert result["symptoms"] == ["scratching", "lethargy"]
        assert result["flagged"] is True

    def test_parses_nested_objects(self):
        raw = '{"pet": {"name": "Bella", "species": "dog"}}'
        result = parse_json_response(raw)
        assert result["pet"]["name"] == "Bella"

    def test_raises_on_invalid_json(self):
        with pytest.raises(json.JSONDecodeError):
            parse_json_response("this is not json")

    def test_raises_on_empty_string(self):
        with pytest.raises((json.JSONDecodeError, ValueError)):
            parse_json_response("")

    def test_parses_intake_agent_response_shape(self):
        """Simulates a real intake agent JSON response."""
        raw = json.dumps({
            "extracted_symptoms": ["ear scratching", "appetite loss"],
            "extracted_behaviors": ["skipped dinner"],
            "extracted_mood": "lethargic",
            "initial_flag": True,
            "initial_flag_reason": "Multiple symptoms present"
        })
        result = parse_json_response(raw)
        assert "extracted_symptoms" in result
        assert "extracted_mood" in result
        assert result["initial_flag"] is True

    def test_parses_analysis_agent_response_shape(self):
        """Simulates a real analysis agent JSON response."""
        raw = json.dumps({
            "patterns_detected": ["ear scratching 3x in 7 days"],
            "flagged": True,
            "flag_reason": "Recurring ear issue",
            "severity": "medium"
        })
        result = parse_json_response(raw)
        assert result["severity"] == "medium"
        assert len(result["patterns_detected"]) == 1
