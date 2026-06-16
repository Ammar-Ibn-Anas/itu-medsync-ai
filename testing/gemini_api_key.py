#!/usr/bin/env python3
"""
FINAL GEMINI API TEST - Using Highest Limit Models
Tests gemini-3.1-flash-lite (500 RPD) and gemini-embedding-001 (1,000 RPD)
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ google-genai not installed. Run: pip install google-genai")
    sys.exit(1)

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_api():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env")
        return

    print_section("1. API KEY VALIDATION")
    print(f"✅ API Key found: {api_key[:15]}...{api_key[-5:]}")
    
    client = genai.Client(api_key=api_key)
    print("✅ Client initialized")

    # --- TEST 1: TEXT GENERATION (Using 3.1 Flash Lite - 500 RPD) ---
    print_section("2. TEXT GENERATION TEST")
    print("Model: gemini-3.1-flash-lite")
    print("Limit: 500 requests/day, 15 RPM")
    
    text_model = "gemini-3.1-flash-lite"
    text_works = False
    
    try:
        response = client.models.generate_content(
            model=text_model,
            contents="Say 'MedSync AI is ready!' in exactly those words.",
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json"
            )
        )
        print(f"✅ Text generation SUCCESS")
        print(f"   Response: {response.text}")
        text_works = True
    except Exception as e:
        print(f"❌ Text generation FAILED: {e}")
        
        # Fallback to 2.5 Flash Lite
        print("\n   Trying fallback: gemini-2.5-flash-lite")
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents="Say 'MedSync AI is ready!' in exactly those words."
            )
            print(f"✅ Fallback SUCCESS")
            print(f"   Response: {response.text}")
            text_works = True
            text_model = "gemini-2.5-flash-lite"
        except Exception as e2:
            print(f"❌ Fallback also failed: {e2}")

    # --- TEST 2: EMBEDDINGS (768 dimensions) ---
    print_section("3. EMBEDDING TEST")
    print("Model: models/gemini-embedding-001")
    print("Limit: 1,000 requests/day, 100 RPM")
    
    embed_model = "models/gemini-embedding-001"
    embed_works = False
    
    try:
        # FORCE 768 dimensions to match Supabase schema
        response = client.models.embed_content(
            model=embed_model,
            contents="This is a test for vector embeddings in MedSync AI.",
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        
        if hasattr(response, 'embeddings') and response.embeddings:
            embedding = response.embeddings[0].values
            dims = len(embedding)
            print(f"✅ Embedding generation SUCCESS")
            print(f"   Vector dimensions: {dims}")
            print(f"   First 5 values: {embedding[:5]}")
            
            if dims == 768:
                print(f"   ✅ PERFECT! 768 dimensions match Supabase schema")
                embed_works = True
            else:
                print(f"   ❌ WRONG! Expected 768, got {dims}")
        else:
            print(f"❌ No embedding data returned")
            
    except Exception as e:
        print(f"❌ Embedding FAILED: {e}")

    # --- FINAL VERDICT ---
    print_section("FINAL VERDICT")
    
    if text_works and embed_works:
        print("🎉 BOTH MODELS WORK - READY FOR PRODUCTION")
        print("\n✅ You can use Gemini API for your project!")
        print(f"\n📋 USE THESE MODELS IN YOUR BACKEND:")
        print(f"  • Text Generation: {text_model}")
        print(f"    - Limit: 500 requests/day")
        print(f"    - Enough for ~50 document uploads/day")
        print(f"\n  • Embeddings: {embed_model}")
        print(f"    - Limit: 1,000 requests/day")
        print(f"    - Output: 768 dimensions")
        print(f"\n💡 You have PLENTY of quota for your evaluation!")
        print("="*60)
        return True
    else:
        print("⚠️ ONE OR MORE TESTS FAILED")
        print("   Stick with Ollama for now.")
        return False

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)