import urllib.request
import json

try:
    res = urllib.request.urlopen("http://localhost:8000/api/stories/").read()
    data = json.loads(res)
    if data:
        for item in data:
            print(f"Slug: {item.get('slug')}, total_chapters: {item.get('total_chapters')}, chapter_count: {item.get('chapter_count')}")
    else:
        print("API returned empty list")
except Exception as e:
    print("Error calling API:", e)
