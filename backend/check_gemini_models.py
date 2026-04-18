"""
Check which Gemini models are available with the current API key
and automatically update gemini_client.py to use the best one.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY", "")
if not api_key or api_key == "PASTE_YOUR_NEW_KEY_HERE":
    print("[ERROR] GEMINI_API_KEY not set in .env — paste your new key first!")
    sys.exit(1)

genai.configure(api_key=api_key)

print("Fetching available models from Gemini API...\n")

# Priority order — best/fastest models first
PREFERRED = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-pro",
]

available = []
try:
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods:
            available.append(m.name.replace("models/", ""))
except Exception as e:
    print(f"[ERROR] Could not list models: {e}")
    sys.exit(1)

print(f"{'Model':<35} {'Supports generateContent'}")
print("-" * 55)
for m in sorted(available):
    star = " <-- PREFERRED" if m in PREFERRED else ""
    print(f"  {m:<33}{star}")

# Pick the best available preferred model
best = None
for p in PREFERRED:
    if p in available:
        best = p
        break

if not best and available:
    best = available[0]

print(f"\n  Best model to use: {best}")

if best:
    # Auto-update gemini_client.py
    client_path = os.path.join(os.path.dirname(__file__), "core", "gemini_client.py")
    with open(client_path, "r") as f:
        content = f.read()

    import re
    updated = re.sub(
        r'_model = genai\.GenerativeModel\(".*?"\)',
        f'_model = genai.GenerativeModel("{best}")',
        content
    )

    if updated != content:
        with open(client_path, "w") as f:
            f.write(updated)
        print(f"  [OK] gemini_client.py updated to use: {best}")
        print("  Restart the backend for changes to take effect.")
    else:
        print(f"  [OK] gemini_client.py already uses: {best}")

    # Quick test
    print(f"\n  Testing generation with {best}...")
    try:
        m = genai.GenerativeModel(best)
        r = m.generate_content("Say: API key is working")
        print(f"  [OK] Test response: {r.text.strip()[:80]}")
    except Exception as e:
        print(f"  [ERROR] Generation test failed: {e}")
