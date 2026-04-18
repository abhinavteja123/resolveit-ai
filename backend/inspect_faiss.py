"""
ResolveIT AI — FAISS Database Inspector
Run this anytime to inspect what's in the FAISS vector store.
Usage: python inspect_faiss.py
"""

import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from core.config import FAISS_INDEX_PATH
from retrieval import faiss_store

print("=" * 65)
print("  ResolveIT AI — FAISS Database Inspector")
print("=" * 65)

# Load the index
loaded = faiss_store.load_index(FAISS_INDEX_PATH)

if not loaded:
    print(f"\n  [!] No FAISS index found at '{FAISS_INDEX_PATH}'")
    print("      Upload runbooks via the Admin panel first.\n")
    sys.exit(0)

idx   = faiss_store.get_index()
meta  = faiss_store.get_metadata()

print(f"\n  Index path   : {os.path.abspath(FAISS_INDEX_PATH)}")
print(f"  Total vectors: {idx.ntotal}")
print(f"  Dimensions   : {idx.d}")
print(f"  Metadata rows: {len(meta)}")

# ── Source breakdown ──────────────────────────────────────────────────
print("\n  --- Indexed Runbooks ---")
from collections import Counter
sources   = Counter(c.get("source", "unknown") for c in meta)
cats      = Counter(c.get("category", "other")  for c in meta)

print(f"  {'Runbook':<45} {'Chunks':>6}")
print("  " + "-" * 52)
for src, count in sorted(sources.items()):
    print(f"  {src:<45} {count:>6}")

print(f"\n  --- Category Breakdown ---")
for cat, count in sorted(cats.items()):
    bar = "#" * (count * 2)
    print(f"  {cat:<15} {count:>3} chunks  {bar}")

# ── Section breakdown ─────────────────────────────────────────────────
print("\n  --- Sections Indexed ---")
sections = Counter(c.get("section", "N/A") for c in meta)
for sec, count in sorted(sections.items(), key=lambda x: -x[1])[:15]:
    print(f"  [{count:>2}x] {sec}")

# ── Live search test ──────────────────────────────────────────────────
print("\n  --- Live Search Test ---")
from retrieval.embedder import embed_query
from retrieval.reranker import rerank

test_queries = [
    "Apache server returning 502 bad gateway",
    "DNS resolution failing on internal servers",
    "Application running out of memory Java heap",
]

for query in test_queries:
    vec = embed_query(query)
    results = faiss_store.search(vec, top_k=3)
    top = rerank(query, results, top_n=1)
    if top:
        c = top[0]
        print(f"\n  Q: \"{query}\"")
        print(f"     -> {c['source']} | Section: {c['section']}")
        print(f"        Confidence: {c['rerank_score']:.4f} ({round(c['rerank_score']*100)}%)")
    else:
        print(f"\n  Q: \"{query}\" -> No results")

print("\n" + "=" * 65)
print("  Inspection complete.")
print("=" * 65 + "\n")
