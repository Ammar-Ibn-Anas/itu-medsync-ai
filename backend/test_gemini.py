import os
from dotenv import load_dotenv
from google import genai

# Load the key from your .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing API Key: {api_key[:10]}... (rest hidden)")

# Initialize the NEW official client
client = genai.Client(api_key=api_key)

print("\n--- 1. LISTING AVAILABLE MODELS ---")
try:
    for m in client.models.list():
        # Only print models that have 'embed' or 'flash' in the name to keep it clean
        if 'embed' in m.name.lower() or 'flash' in m.name.lower():
            print(f"Found Model: {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

print("\n--- 2. TESTING EMBEDDING (text-embedding-004) ---")
try:
    res = client.models.embed_content(
        model="text-embedding-004", 
        contents="This is a test medical document."
    )
    print(f"SUCCESS! Generated vector of size: {len(res.embeddings[0].values)}")
except Exception as e:
    print(f"FAILED with text-embedding-004: {e}")
    
    print("\n--- 3. TESTING FALLBACK (embedding-001) ---")
    try:
        res = client.models.embed_content(
            model="embedding-001", 
            contents="This is a test medical document."
        )
        print(f"SUCCESS with fallback! Vector size: {len(res.embeddings[0].values)}")
    except Exception as e2:
        print(f"FAILED with fallback too: {e2}")