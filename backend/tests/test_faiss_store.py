"""Tests for retrieval/faiss_store.py — FAISS index operations."""

import os
import sys
import json
import tempfile
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from retrieval import faiss_store


class TestFaissStore:
    """Test FAISS index build, add, save, load, and search."""

    def setup_method(self):
        """Reset global state before each test."""
        faiss_store._index = None
        faiss_store._metadata = []

    def test_get_index_creates_empty(self):
        """get_index() creates an empty index if none exists."""
        idx = faiss_store.get_index()
        assert idx is not None
        assert idx.ntotal == 0

    def test_build_index(self):
        """build_index() creates an index with the right vector count."""
        embeddings = np.random.rand(5, 384).astype(np.float32)
        idx = faiss_store.build_index(embeddings)
        assert idx.ntotal == 5

    def test_add_to_index(self):
        """add_to_index() adds vectors and metadata."""
        embeddings = np.random.rand(3, 384).astype(np.float32)
        metadata = [
            {"chunk_id": "1", "text": "test1", "source": "a.txt"},
            {"chunk_id": "2", "text": "test2", "source": "a.txt"},
            {"chunk_id": "3", "text": "test3", "source": "b.txt"},
        ]
        faiss_store.add_to_index(embeddings, metadata)
        assert faiss_store.get_index().ntotal == 3
        assert len(faiss_store.get_metadata()) == 3

    def test_search_empty_index(self):
        """search() returns empty list on empty index."""
        query = np.random.rand(1, 384).astype(np.float32)
        results = faiss_store.search(query, top_k=5)
        assert results == []

    def test_search_returns_results(self):
        """search() returns results with scores."""
        # Add some vectors
        embeddings = np.random.rand(10, 384).astype(np.float32)
        metadata = [{"chunk_id": str(i), "text": f"chunk {i}", "source": "doc.txt"} for i in range(10)]
        faiss_store.add_to_index(embeddings, metadata)

        # Search with one of the same vectors
        query = embeddings[0:1]
        results = faiss_store.search(query, top_k=3)
        assert len(results) == 3
        assert "score" in results[0]
        # The first result should be very close (low L2 distance)
        assert results[0]["score"] < 0.001

    def test_search_top_k_capped(self):
        """search() doesn't return more results than total vectors."""
        embeddings = np.random.rand(2, 384).astype(np.float32)
        metadata = [{"chunk_id": "1", "text": "a"}, {"chunk_id": "2", "text": "b"}]
        faiss_store.add_to_index(embeddings, metadata)

        query = np.random.rand(1, 384).astype(np.float32)
        results = faiss_store.search(query, top_k=100)
        assert len(results) == 2

    def test_save_and_load(self):
        """save_index() and load_index() round-trip correctly."""
        # Add data
        embeddings = np.random.rand(5, 384).astype(np.float32)
        metadata = [{"chunk_id": str(i), "text": f"chunk {i}"} for i in range(5)]
        faiss_store.add_to_index(embeddings, metadata)

        # Save
        with tempfile.TemporaryDirectory() as tmpdir:
            faiss_store.save_index(tmpdir)
            assert os.path.exists(os.path.join(tmpdir, "index.bin"))
            assert os.path.exists(os.path.join(tmpdir, "metadata.json"))

            # Verify metadata file content
            with open(os.path.join(tmpdir, "metadata.json")) as f:
                saved_meta = json.load(f)
            assert len(saved_meta) == 5

            # Reset and reload
            faiss_store._index = None
            faiss_store._metadata = []
            assert faiss_store.load_index(tmpdir) is True
            assert faiss_store.get_index().ntotal == 5
            assert len(faiss_store.get_metadata()) == 5

    def test_load_nonexistent_returns_false(self):
        """load_index() returns False when path doesn't exist."""
        assert faiss_store.load_index("/nonexistent/path") is False
