"""Tests for ingestion/chunker.py — text chunking strategies."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ingestion.chunker import chunk_text, _is_heading, _split_by_sections, _sliding_window


class TestIsHeading:
    def test_markdown_heading(self):
        assert _is_heading("## Troubleshooting Steps") is True
        assert _is_heading("### Sub-section") is True

    def test_all_caps(self):
        assert _is_heading("NETWORK CONFIGURATION") is True
        assert _is_heading("DNS") is False  # too short (< 4 chars)

    def test_colon_ending(self):
        assert _is_heading("Resolution Steps:") is True

    def test_normal_text(self):
        assert _is_heading("This is just a normal line of text.") is False

    def test_empty_line(self):
        assert _is_heading("") is False
        assert _is_heading("   ") is False


class TestSplitBySections:
    def test_markdown_sections(self):
        text = """## Problem Description
The server is returning 502 errors.

## Resolution Steps
1. Restart Apache
2. Check error logs"""
        sections = _split_by_sections(text)
        assert len(sections) == 2
        assert sections[0][0] == "Problem Description"
        assert sections[1][0] == "Resolution Steps"

    def test_no_headings_single_section(self):
        text = "This is plain text without any headings or sections."
        sections = _split_by_sections(text)
        assert len(sections) == 1
        assert sections[0][0] == "Introduction"


class TestSlidingWindow:
    def test_short_text(self):
        text = " ".join(["word"] * 100)
        chunks = _sliding_window(text, window_words=400, overlap_words=50)
        assert len(chunks) == 1

    def test_long_text_creates_multiple_chunks(self):
        text = " ".join(["word"] * 1000)
        chunks = _sliding_window(text, window_words=400, overlap_words=50)
        assert len(chunks) >= 2

    def test_overlap_exists(self):
        words = [f"w{i}" for i in range(800)]
        text = " ".join(words)
        chunks = _sliding_window(text, window_words=400, overlap_words=50)
        # First chunk ends at word 400, second starts at word 350
        # So w350..w399 should appear in both chunks
        assert "w350" in chunks[0]
        assert "w350" in chunks[1]


class TestChunkText:
    def test_section_aware_chunking(self):
        text = """## Error Description
Apache is returning 502 bad gateway.

## Root Cause
Backend server is not responding.

## Fix Steps
1. Restart the backend
2. Check connectivity"""

        chunks = chunk_text(text, "apache_502.txt", "server")
        assert len(chunks) == 3
        for chunk in chunks:
            assert chunk["source"] == "apache_502.txt"
            assert chunk["category"] == "server"
            assert "chunk_id" in chunk
            assert "text" in chunk
            assert "section" in chunk

    def test_sliding_window_fallback(self):
        text = "Just a plain document without any headings. " * 100
        chunks = chunk_text(text, "plain.txt", "other")
        assert len(chunks) >= 1
        for chunk in chunks:
            assert chunk["section"] == "Full Document"
            assert chunk["source"] == "plain.txt"

    def test_chunk_metadata_complete(self):
        text = "## Test\nSome content here."
        chunks = chunk_text(text, "test.txt", "network")
        assert len(chunks) >= 1
        chunk = chunks[0]
        required_keys = {"chunk_id", "text", "source", "section", "category"}
        assert required_keys.issubset(chunk.keys())
