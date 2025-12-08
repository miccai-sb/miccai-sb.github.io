#!/usr/bin/env python3
"""
Extract tutorial data from materials.html and generate tutorials.json

This script parses the existing materials.html file and extracts all tutorial
entries into a structured JSON format for the rebuilt MEC Library.
"""

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

# Keyword patterns for extraction
KEYWORD_PATTERNS = {
    # Methods
    'segmentation': r'\b(segment(ation|ing)?|segmented)\b',
    'registration': r'\b(registr(ation|ing)?)\b',
    'classification': r'\b(classif(y|ication|ier))\b',
    'detection': r'\b(detect(ion|ing|or)?)\b',
    'tracking': r'\b(track(ing)?)\b',
    'reconstruction': r'\b(reconstruct(ion|ing)?)\b',
    'deep learning': r'\b(deep\s*learn(ing)?|neural\s*network|CNN|DNN)\b',
    'machine learning': r'\b(machine\s*learn(ing)?|ML)\b',
    'U-Net': r'\b(U-?Net|UNet)\b',
    'transformer': r'\b(transformer|attention)\b',
    'GAN': r'\b(GAN|generative\s*adversarial)\b',
    'diffusion': r'\b(diffusion|denoising)\b',
    'autoencoder': r'\b(autoencoder|VAE)\b',
    'CNN': r'\b(CNN|convolutional)\b',

    # Modalities
    'MRI': r'\b(MRI|magnetic\s*resonance)\b',
    'CT': r'\b(CT|computed\s*tomography)\b',
    'X-ray': r'\b(X-?ray|radiograph)\b',
    'ultrasound': r'\b(ultrasound|US|echo)\b',
    'PET': r'\b(PET|positron\s*emission)\b',
    'microscopy': r'\b(microscop(y|ic))\b',
    'histopathology': r'\b(histopatholog(y|ical)|pathology)\b',

    # Tasks
    'diagnosis': r'\b(diagnos(is|tic|e))\b',
    'prognosis': r'\b(prognos(is|tic))\b',
    'surgery': r'\b(surg(ery|ical)|intraoperative)\b',
    'treatment': r'\b(treatment|therapy)\b',
    'analysis': r'\b(analy(sis|ze|zing))\b',
    'visualization': r'\b(visualiz(ation|e|ing)|rendering)\b',

    # Organs/Anatomy
    'brain': r'\b(brain|cerebral|neural)\b',
    'cardiac': r'\b(cardiac|heart)\b',
    'lung': r'\b(lung|pulmonary)\b',
    'liver': r'\b(liver|hepatic)\b',
    'kidney': r'\b(kidney|renal)\b',
    'prostate': r'\b(prostate)\b',
    'breast': r'\b(breast|mammography)\b',

    # Other
    'dataset': r'\b(dataset|data\s*set)\b',
    'benchmark': r'\b(benchmark)\b',
    'tutorial': r'\b(tutorial|guide|introduction)\b',
    'python': r'\b(python|py)\b',
    'PyTorch': r'\b(PyTorch|torch)\b',
    'TensorFlow': r'\b(TensorFlow|keras)\b',
    '3D': r'\b(3D|three-?dimensional|volumetric)\b',
    '2D': r'\b(2D|two-?dimensional)\b',
}

def extract_keywords(text):
    """Extract keywords from text using pattern matching"""
    keywords = []
    text_lower = text.lower()

    for keyword, pattern in KEYWORD_PATTERNS.items():
        if re.search(pattern, text_lower, re.IGNORECASE):
            keywords.append(keyword)

    # Remove duplicates and sort
    return sorted(list(set(keywords)))

def extract_group_number(class_str):
    """Extract group number from class string like 'randomordercontent group10'"""
    match = re.search(r'group(\d+)', class_str)
    return int(match.group(1)) if match else None

def parse_tutorial_div(div, current_year):
    """Parse a single tutorial div and extract data"""
    html_content = str(div)
    text_content = div.get_text(separator=' ', strip=True)

    # Extract status (winner/finalist)
    status = None
    if 'Winner!' in html_content:
        status = 'winner'
    elif 'Finalist!' in html_content:
        status = 'finalist'

    # Extract URL
    url = None
    a_tag = div.find('a', href=True)
    if a_tag:
        url = a_tag['href']

    # Extract thumbnail
    thumbnail = None
    img_tag = div.find('img')
    if img_tag and img_tag.get('src'):
        thumbnail = img_tag['src']

    # Extract group number
    group_num = extract_group_number(div.get('class', [''])[0] if div.get('class') else '')

    # Parse text content (format: [Winner!] Title <br /> Author(s))
    # Remove HTML tags for parsing
    clean_text = re.sub(r'<[^>]+>', ' ', html_content)
    clean_text = re.sub(r'&nbsp;', ' ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # Remove status markers
    clean_text = re.sub(r'(Winner!|Finalist!)', '', clean_text, flags=re.IGNORECASE).strip()

    # Split by common delimiters
    parts = [p.strip() for p in re.split(r'<br\s*/?>|\n', html_content) if p.strip()]
    parts = [re.sub(r'<[^>]+>', '', p).strip() for p in parts]
    parts = [p for p in parts if p and p not in ['Winner!', 'Finalist!', ' ', '']]

    # First meaningful part is title, last is author(s)
    title = parts[0] if parts else "Untitled"
    # Remove Winner!/Finalist! from title if present
    title = re.sub(r'^(Winner!?|Finalist!?)\s*', '', title, flags=re.IGNORECASE).strip()

    authors_str = parts[-1] if len(parts) > 1 else "Unknown"

    # Parse authors (split by commas or 'and')
    authors = [a.strip() for a in re.split(r',|\band\b', authors_str) if a.strip()]

    # Generate keywords
    keywords = extract_keywords(title + ' ' + authors_str)

    return {
        'year': current_year,
        'title': title,
        'authors': authors,
        'url': url or '',
        'thumbnail': thumbnail or '',
        'status': status,
        'keywords': keywords,
        'yearGroup': group_num
    }

def parse_list_item(li, current_year):
    """Parse a single list item (2020/2019 format) and extract data"""
    html_content = str(li)
    text_content = li.get_text(separator=' ', strip=True)

    # Extract status (winner/finalist)
    status = None
    if '1st Place!' in html_content or '2nd Place!' in html_content or '3rd Place!' in html_content:
        status = 'winner'
    elif 'Finalist' in html_content:
        status = 'finalist'

    # Extract URL from first <a> tag
    url = None
    a_tag = li.find('a', href=True)
    if a_tag:
        url = a_tag['href']
        # Get title from link text
        title = a_tag.get_text(strip=True)
    else:
        title = "Untitled"

    # Extract authors (after <br> tag or after last link)
    authors_str = ""
    br_tag = li.find('br')
    if br_tag:
        # Get text after <br>
        for sibling in br_tag.next_siblings:
            if isinstance(sibling, str):
                authors_str += sibling

    # Clean up authors
    authors_str = re.sub(r'^\s*-\s*', '', authors_str.strip())
    authors = [a.strip() for a in re.split(r',|\\band\\b', authors_str) if a.strip()]
    if not authors or authors == ['']:
        authors = ["Unknown"]

    # Generate keywords from title
    keywords = extract_keywords(title + ' ' + authors_str)

    return {
        'year': current_year,
        'title': title,
        'authors': authors,
        'url': url or '',
        'thumbnail': '',  # No images for 2020/2019
        'status': status,
        'keywords': keywords,
        'yearGroup': None
    }

def extract_tutorials(html_path):
    """Extract all tutorials from materials.html"""
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    tutorials = []
    current_year = None
    tutorial_id = 1

    # Find all year headers and tutorial divs
    content_div = soup.find('div', id='page-content')
    if not content_div:
        print("Warning: Could not find #page-content div")
        return tutorials

    for element in content_div.children:
        # Check for year header
        if element.name == 'h1':
            year_text = element.get_text()
            # Extract year from headers like "MICCAI Educational Challenge 2025 Materials"
            year_match = re.search(r'20\d{2}', year_text)
            if year_match:
                current_year = int(year_match.group())
                print(f"Found year section: {current_year}")

        # Check for tutorial div (2021-2025 format)
        elif element.name == 'div' and element.get('class'):
            classes = ' '.join(element.get('class', []))
            if 'randomordercontent' in classes:
                if current_year:
                    try:
                        tutorial = parse_tutorial_div(element, current_year)
                        tutorial['id'] = f"{current_year}-{tutorial_id:03d}"
                        tutorials.append(tutorial)
                        tutorial_id += 1
                        print(f"  Extracted: {tutorial['title'][:50]}...")
                    except Exception as e:
                        print(f"  Error extracting tutorial: {e}")
                        print(f"  Content: {element.get_text()[:100]}...")

        # Check for list (2020/2019 format)
        elif element.name == 'ul' and current_year:
            for li in element.find_all('li', recursive=False):
                try:
                    tutorial = parse_list_item(li, current_year)
                    tutorial['id'] = f"{current_year}-{tutorial_id:03d}"
                    tutorials.append(tutorial)
                    tutorial_id += 1
                    print(f"  Extracted: {tutorial['title'][:50]}...")
                except Exception as e:
                    print(f"  Error extracting list tutorial: {e}")
                    print(f"  Content: {li.get_text()[:100]}...")

    return tutorials

def main():
    """Main execution function"""
    # Paths
    base_dir = Path(__file__).parent.parent
    html_path = base_dir / 'materials.html'
    data_dir = base_dir / 'data'
    output_path = data_dir / 'tutorials.json'

    print(f"Extracting tutorials from: {html_path}")
    print(f"Output will be saved to: {output_path}")
    print("-" * 60)

    # Create data directory if it doesn't exist
    data_dir.mkdir(exist_ok=True)

    # Extract tutorials
    tutorials = extract_tutorials(html_path)

    print("-" * 60)
    print(f"Total tutorials extracted: {len(tutorials)}")

    # Count by year
    by_year = {}
    by_status = {'winner': 0, 'finalist': 0, 'regular': 0}

    for t in tutorials:
        by_year[t['year']] = by_year.get(t['year'], 0) + 1
        if t['status']:
            by_status[t['status']] += 1
        else:
            by_status['regular'] += 1

    print("\nBreakdown by year:")
    for year in sorted(by_year.keys(), reverse=True):
        print(f"  {year}: {by_year[year]} tutorials")

    print("\nBreakdown by status:")
    print(f"  Winners: {by_status['winner']}")
    print(f"  Finalists: {by_status['finalist']}")
    print(f"  Regular: {by_status['regular']}")

    # Create output JSON
    output_data = {
        'version': '1.0',
        'lastUpdated': datetime.now().isoformat(),
        'tutorials': tutorials
    }

    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSuccessfully saved to: {output_path}")
    print("\nNext steps:")
    print("1. Review the generated JSON file")
    print("2. Manually refine keywords if needed")
    print("3. Verify thumbnails and URLs are correct")

if __name__ == '__main__':
    main()
