import os
import requests
import concurrent.futures
import re
import time

# Configuration
STREAMS_DIR = "iptv-master/streams"
OUTPUT_FILE = "link_report.md"
TIMEOUT = 5
MAX_WORKERS = 50

def get_m3u_files(directory):
    m3u_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".m3u"):
                m3u_files.append(os.path.join(root, file))
    return m3u_files

def extract_links(m3u_file):
    links = []
    with open(m3u_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        # Find all lines starting with http or https
        found_links = re.findall(r'https?://[^\s]+', content)
        for link in found_links:
            links.append((m3u_file, link))
    return links

def check_link(file_link_tuple):
    file_path, link = file_link_tuple
    try:
        # Using HEAD request for speed
        response = requests.head(link, timeout=TIMEOUT, allow_redirects=True)
        if response.status_code >= 200 and response.status_code < 400:
            return None # Link is OK
        else:
            return (file_path, link, response.status_code)
    except Exception as e:
        return (file_path, link, str(e))

def main():
    print("Starting IPTV link check...")
    m3u_files = get_m3u_files(STREAMS_DIR)
    all_links = []
    for f in m3u_files:
        all_links.extend(extract_links(f))
    
    print(f"Found {len(all_links)} links in {len(m3u_files)} files.")
    
    # Limiting for demonstration or if too many, but for workflow we can run all
    # To avoid GitHub Action timeout, we might want to check only a subset or optimize
    # For now, let's process all but with a high worker count
    
    failed_links = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(executor.map(check_link, all_links))
        
    for res in results:
        if res:
            failed_links.append(res)
            
    # Generate Report
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("# IPTV Link Check Report\n\n")
        f.write(f"Last Check: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"- Total Links Checked: {len(all_links)}\n")
        f.write(f"- Total Failed Links: {len(failed_links)}\n\n")
        
        if failed_links:
            f.write("## Failed Links Details\n\n")
            f.write("| File | Link | Status/Error |\n")
            f.write("| --- | --- | --- |\n")
            for file_path, link, status in failed_links[:500]: # Limit report size
                rel_path = os.path.relpath(file_path, STREAMS_DIR)
                f.write(f"| {rel_path} | {link} | {status} |\n")
            
            if len(failed_links) > 500:
                f.write(f"\n*Showing first 500 failed links out of {len(failed_links)}*")
        else:
            f.write("✅ All links are working fine!")

    print(f"Check complete. Report saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
