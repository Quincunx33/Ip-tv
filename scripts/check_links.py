#!/usr/bin/env python3
import os
import json
import ssl
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Paths
STATIC_API_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'static-api')
FIFA_JSON_PATH = os.path.join(STATIC_API_DIR, 'fifa.json')
SPORTS_JSON_PATH = os.path.join(STATIC_API_DIR, 'sports.json')
DEAD_CHANNELS_PATH = os.path.join(STATIC_API_DIR, 'dead-channels.json')

# Create an unverified SSL context to bypass SSL certificate issues which are common with stream links
SSL_CONTEXT = ssl._create_unverified_context()

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def check_single_url(name, url):
    """
    Checks if a URL is reachable.
    First tries a HEAD request, fallbacks to GET if HEAD is rejected.
    """
    if not url or not (url.startswith('http://') or url.startswith('https://')):
        return name, url, False, "Invalid URL format"

    # Try HEAD request first for efficiency
    try:
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": USER_AGENT},
            method="HEAD"
        )
        with urllib.request.urlopen(req, timeout=5, context=SSL_CONTEXT) as response:
            status = response.getcode()
            if status in [200, 206, 301, 302]:
                return name, url, True, f"HEAD {status}"
    except Exception as e:
        # Fallback to GET request with limited bytes if HEAD failed/was forbidden
        try:
            req = urllib.request.Request(
                url, 
                headers={"User-Agent": USER_AGENT, "Range": "bytes=0-1024"},
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=5, context=SSL_CONTEXT) as response:
                status = response.getcode()
                if status in [200, 206, 301, 302]:
                    return name, url, True, f"GET {status}"
                return name, url, False, f"HTTP {status}"
        except urllib.error.HTTPError as he:
            return name, url, False, f"HTTP Error {he.code}"
        except urllib.error.URLError as ue:
            return name, url, False, f"URL Error: {ue.reason}"
        except Exception as ex:
            return name, url, False, str(ex)

def main():
    print("Starting IPTV Playlist Link Checker...")
    
    # 1. Load URLs to check
    urls_to_check = []
    seen_urls = set()

    for path in [FIFA_JSON_PATH, SPORTS_JSON_PATH]:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    channels = json.load(f)
                    if isinstance(channels, list):
                        for item in channels:
                            name = item.get('name')
                            url = item.get('url')
                            if url and url not in seen_urls:
                                urls_to_check.append((name, url))
                                seen_urls.add(url)
            except Exception as e:
                print(f"Error reading {path}: {e}")

    total_urls = len(urls_to_check)
    print(f"Loaded {total_urls} unique stream URLs to check.")

    if total_urls == 0:
        print("No URLs to check. Exiting.")
        return

    # 2. Check URLs in parallel
    dead_urls = []
    alive_count = 0
    dead_count = 0
    
    # Use max 30 threads to be friendly to resources and fast
    max_workers = min(30, total_urls)
    
    print(f"Running checks with {max_workers} worker threads...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(check_single_url, name, url): (name, url) for name, url in urls_to_check}
        
        for i, future in enumerate(as_completed(futures), 1):
            name, url = futures[future]
            try:
                ch_name, ch_url, is_alive, message = future.result()
                if is_alive:
                    alive_count += 1
                else:
                    dead_count += 1
                    dead_urls.append(ch_url)
                    print(f"[{i}/{total_urls}] ❌ OFFLINE: {ch_name} | URL: {ch_url} | Info: {message}")
            except Exception as e:
                dead_count += 1
                dead_urls.append(url)
                print(f"[{i}/{total_urls}] ❌ ERROR: {name} | URL: {url} | Exception: {e}")

    # 3. Report summaries
    print("\n" + "="*50)
    print("CHECK SUMMARY:")
    print(f"Total Stream URLs Checked: {total_urls}")
    print(f"✅ Active Streams: {alive_count} ({alive_count/total_urls*100:.1f}%)")
    print(f"❌ Dead/Offline Streams: {dead_count} ({dead_count/total_urls*100:.1f}%)")
    print("="*50 + "\n")

    # 4. Save results
    os.makedirs(STATIC_API_DIR, exist_ok=True)
    with open(DEAD_CHANNELS_PATH, 'w', encoding='utf-8') as f:
        json.dump(dead_urls, f, indent=2)
    
    print(f"Successfully wrote {len(dead_urls)} dead stream URLs to {DEAD_CHANNELS_PATH}")

if __name__ == '__main__':
    main()
