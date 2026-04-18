"""Tests for retrieval/reranker.py — sigmoid and reranking logic."""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from retrieval.reranker import sigmoid


class TestSigmoid:
    def test_zero(self):
        assert sigmoid(0) == 0.5

    def test_large_positive(self):
        result = sigmoid(10)
        assert result > 0.99

    def test_large_negative(self):
        result = sigmoid(-10)
        assert result < 0.01

    def test_symmetry(self):
        """sigmoid(x) + sigmoid(-x) should equal 1."""
        for x in [0.5, 1.0, 2.0, 5.0]:
            assert abs(sigmoid(x) + sigmoid(-x) - 1.0) < 1e-10

    def test_monotonic(self):
        """sigmoid should be monotonically increasing."""
        values = [sigmoid(x) for x in range(-5, 6)]
        for i in range(len(values) - 1):
            assert values[i] < values[i + 1]


class TestRerankerConfig:
    def test_empty_candidates(self):
        """rerank() should handle empty candidate list gracefully."""
        from retrieval.reranker import rerank
        result = rerank("test query", [], top_n=3)
        assert result == []
