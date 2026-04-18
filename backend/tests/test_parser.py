"""Tests for ingestion/parser.py — document parsing functions."""

import os
import tempfile
import pytest

# Ensure backend modules are importable
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ingestion.parser import parse_txt, parse_pdf, parse_docx, parse_file


class TestParseTxt:
    def test_basic_txt(self):
        """Parse a plain text file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("Step 1: Restart the server\nStep 2: Check logs")
            path = f.name
        try:
            result = parse_txt(path)
            assert "Step 1" in result
            assert "Step 2" in result
            assert "Restart the server" in result
        finally:
            os.unlink(path)

    def test_empty_txt(self):
        """Parse an empty text file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            path = f.name
        try:
            result = parse_txt(path)
            assert result == ""
        finally:
            os.unlink(path)

    def test_unicode_txt(self):
        """Parse a text file with unicode characters."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("Error: café résumé naïve — em-dash")
            path = f.name
        try:
            result = parse_txt(path)
            assert "café" in result
            assert "em-dash" in result
        finally:
            os.unlink(path)


class TestParseFile:
    def test_dispatch_txt(self):
        """parse_file dispatches correctly to parse_txt."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("Runbook content here")
            path = f.name
        try:
            result = parse_file(path, "txt")
            assert "Runbook content here" in result
        finally:
            os.unlink(path)

    def test_dispatch_with_dot(self):
        """parse_file handles file_type with leading dot."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("test content")
            path = f.name
        try:
            result = parse_file(path, ".txt")
            assert "test content" in result
        finally:
            os.unlink(path)

    def test_unsupported_format(self):
        """parse_file raises ValueError for unsupported formats."""
        with pytest.raises(ValueError, match="Unsupported file type"):
            parse_file("/fake/path.xyz", "xyz")
