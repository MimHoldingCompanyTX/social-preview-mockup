#!/usr/bin/env python3
"""
Generate client portal static website from Google Drive folder structure.
Outputs to Design_Website_Live/clientsite/portal/
"""

import os
import re
import subprocess
import json
from datetime import datetime
from pathlib import Path
import sys # Import sys to use sys.stderr

# Paths
WORKSPACE = Path("/Users/clawdallen/.openclaw/workspace")
DESIGN_LIVE = WORKSPACE / "Design_Website_Live"
OUTPUT_DIR = DESIGN_LIVE / "clientsite" / "portal"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Rclone remote (Path format adjusted for better shell compatibility)
REMOTE_BASE = 'shelia_business_drive:"Sheila Gutierrez Designs/client_portal"'

def run_rclone(args):
    """Run rclone command and return lines."""
    # Ensure proper quoting for paths with spaces in arguments
    cmd = ['rclone'] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error running rclone: {e.stderr}", file=sys.stderr)
        return []

def get_client_folders():
    """Return list of client folders sorted by date descending."""
    # Use the correct remote base path for lsf
    lines = run_rclone(['lsf', REMOTE_BASE])
    clients = []
    for line in lines:
        line = line.strip()
        if not line.endswith('/'):
            continue
        name = line.rstrip('/')
        # Parse date from "2026-02-27_Joe_Blow"
        match = re.match(r'(\d{4}-\d{2}-\d{2})_(.+)', name)
        if match:
            date_str, client_name = match.groups()
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                continue # Skip if date format is unexpected
            clients.append({
                'id': name.replace(' ', '-').lower(),
                'date': date,
                'date_str': date_str,
                'name': client_name.replace('_', ' '),
                'folder': name
            })
    # Sort by date descending (newest first)
    clients.sort(key=lambda x: x['date'], reverse=True)
    return clients[:10]  # max 10

def get_phase_folders(client_folder):
    """Return list of phase folders for a client."""
    remote = f'{REMOTE_BASE}/{client_folder}'
    lines = run_rclone(['lsf', remote])
    phases = []
    for line in lines:
        line = line.strip()
        if not line.endswith('/'):
            continue
        name = line.rstrip('/')
        # Parse phase number and title from "01_Initial_Contact"
        match = re.match(r'(\d+)_(.+)', name)
        if match:
            num, title = match.groups()
            try:
                phases.append({
                    'num': int(num),
                    'id': name.replace(' ', '-').lower(),
                    'title': title.replace('_', ' '),
                    'folder': name
                })
            except ValueError:
                continue # Skip if phase number isn't an integer
    # Sort by phase number
    phases.sort(key=lambda x: x['num'])
    return phases

def get_files_in_phase(client_folder, phase_folder):
    """Return list of files in a phase folder."""
    remote = f'{REMOTE_BASE}/{client_folder}/{phase_folder}'
    lines = run_rclone(['lsf', remote])
    files = []
    for line in lines:
        line = line.strip()
        if line.endswith('/'):
            continue  # skip subfolders for now
        files.append(line)
    return files

def generate_index_html(clients):
    """Generate main client listing page."""
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Client Portal · Sheila Gutierrez Designs</title>
  <link rel="stylesheet" href="../../styles.css" />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {{
        --primary: #2c3e50;
        --accent: #d4af37;
        --light: #f9f9f9;
        --dark: #333;
        --gray: #6c757d;
        --light-gray: #f8f9fa;
    }}
    body {{
        font-family: 'Lato', sans-serif;
        color: var(--dark);
        background: var(--light);
        line-height: 1.6;
        margin: 0;
    }}
    .container {{
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }}
    header {{
        background: white;
        padding: 1rem 0;
        border-bottom: 1px solid #eee;
        position: sticky;
        top: 0;
        z-index: 100;
    }}
    .header-content {{
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    .logo {{
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--primary);
        text-decoration: none;
    }}
    .nav-controls {{
        display: flex;
        align-items: center;
        gap: 1rem;
    }}
    .hero {{
        background: linear-gradient(rgba(44, 62, 80, 0.85), rgba(44, 62, 80, 0.9)), url('../../after1.jpg');
        background-size: cover;
        background-position: center;
        color: white;
        padding: 4rem 1rem;
        text-align: center;
        margin-bottom: 3rem;
    }}
    .hero h1 {{
        font-family: 'Playfair Display', serif;
        font-size: 3rem;
        margin-bottom: 0.5rem;
    }}
    .hero p {{
        font-size: 1.2rem;
        opacity: 0.9;
        max-width: 600px;
        margin: 0 auto;
    }}
    .clients-section {{
        padding: 2rem 0;
    }}
    .section-title {{
        font-family: 'Playfair Display', serif;
        font-size: 2rem;
        color: var(--primary);
        margin-bottom: 2rem;
        text-align: center;
    }}
    .clients-grid {{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
    }}
    .client-card {{
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        text-decoration: none;
        color: inherit;
        display: block;
    }}
    .client-card:hover {{
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.1);
    }}
    .client-image {{
        height: 180px;
        background: var(--light-gray);
        background-image: url('../../SheilaP0.jpg');
        background-size: cover;
        background-position: center;
        position: relative;
    }}
    .client-badge {{
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--accent);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
    }}
    .client-content {{
        padding: 1.5rem;
    }}
    .client-name {{
        font-family: 'Playfair Display', serif;
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--primary);
    }}
    .client-date {{
        color: var(--gray);
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }}
    .client-phases {{
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
    }}
    .phase-tag {{
        background: var(--light-gray);
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8rem;
        color: var(--gray);
    }}
    .empty-state {{
        text-align: center;
        padding: 4rem 2rem;
        color: var(--gray);
    }}
    footer {{
        background: var(--primary);
        color: white;
        text-align: center;
        padding: 2rem;
        margin-top: 4rem;
    }}
    @media (max-width: 768px) {{
        .clients-grid {{
            grid-template-columns: 1fr;
        }}
        .hero h1 {{
            font-size: 2.2rem;
        }}
    }}
  </style>
</head>
<body>
  <header>
    <div class="container header-content">
      <a href="../../index.html" class="logo">Sheila Gutierrez Designs</a>
      <div class="nav-controls">
        <a href="../../index.html">Public Site</a>
        <button class="lang-button" onclick="alert('ES/EN toggle placeholder')">EN</button>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <h1>Client Portal</h1>
        <p>Private workspace for client engagements. Select a client to view project phases, upload files, and generate deliverables.</p>
      </div>
    </section>

    <section class="clients-section container">
      <h2 class="section-title">Active Clients</h2>
'''
    if clients:
        html += '<div class="clients-grid">\n'
        for client in clients:
            phases = get_phase_folders(client['folder'])
            html += f'''
      <a href="{client['id']}/index.html" class="client-card">
        <div class="client-image">
          <div class="client-badge">Active</div>
        </div>
        <div class="client-content">
          <h3 class="client-name">{client['name']}</h3>
          <div class="client-date">Started {client['date_str']}</div>
          <p>Client engagement with {len(phases)} phases completed.</p>
          <div class="client-phases">
'''
            for phase in phases[:4]:  # show first 4 phases as tags
                html += f'<span class="phase-tag">{phase["num"]:02d}</span>\n'
            if len(phases) > 4:
                html += f'<span class="phase-tag">+{len(phases)-4}</span>\n'
            html += '''
          </div>
        </div>
      </a>
'''
        html += '</div>\n'
    else:
        html += '''
      <div class="empty-state">
        <h3>No clients yet</h3>
        <p>When client folders are added to Google Drive, they will appear here.</p>
      </div>
'''
    html += '''
    </section>
  </main>

  <footer>
    <div class="container">
      <p>© 2026 Sheila Gutierrez Designs. This portal is private and confidential.</p>
      <p><small>Automatically generated from Google Drive structure.</small></p>
    </div>
  </footer>
</body>
</html>'''
    
    out_path = OUTPUT_DIR / 'index.html'
    out_path.write_text(html)
    print(f"Generated {out_path}")

def generate_client_html(client, phases):
    """Generate client detail page with phases."""
    client_dir = OUTPUT_DIR / client['id']
    client_dir.mkdir(exist_ok=True)
    
    # Get file counts for each phase
    phase_data = []
    for phase in phases:
        files = get_files_in_phase(client['folder'], phase['folder'])
        phase_data.append({
            **phase,
            'file_count': len(files),
            'files': files[:5]  # first 5 files
        })
    
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>{client['name']} · Client Portal</title>
  <link rel="stylesheet" href="../../styles.css" />
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {{
        --primary: #2c3e50;
        --accent: #d4af37;
        --light: #f9f9f9;
        --dark: #333;
        --gray: #6c757d;
        --light-gray: #f8f9fa;
        --success: #28a745;
        --warning: #ffc107;
        --info: #17a2b8;
    }}
    body {{
        font-family: 'Lato', sans-serif;
        color: var(--dark);
        background: var(--light);
        line-height: 1.6;
        margin: 0;
    }}
    .container {{
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }}
    header {{
        background: white;
        padding: 1rem 0;
        border-bottom: 1px solid #eee;
        position: sticky;
        top: 0;
        z-index: 100;
    }}
    .header-content {{
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    .logo {{
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--primary);
        text-decoration: none;
    }}
    .nav-controls {{
        display: flex;
        align-items: center;
        gap: 1rem;
    }}
    .back-link {{
        color: var(--primary);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }}
    .client-header {{
        background: linear-gradient(rgba(44, 62, 80, 0.9), rgba(44, 62, 80, 0.95)), url('../../before1.jpg');
        background-size: cover;
        background-position: center;
        color: white;
        padding: 3rem 1rem;
        margin-bottom: 3rem;
        border-radius: 0 0 12px 12px;
    }}
    .client-header h1 {{
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
    }}
    .client-meta {{
        display: flex;
        gap: 2rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }}
    .meta-item {{
        background: rgba(255,255,255,0.1);
        padding: 0.5rem 1rem;
        border-radius: 6px;
    }}
    .phases-section {{
        padding: 2rem 0;
    }}
    .section-title {{
        font-family: 'Playfair Display', serif;
        font-size: 2rem;
        color: var(--primary);
        margin-bottom: 2rem;
    }}
    .phases-timeline {{
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }}
    .phase-card {{
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
        border-left: 4px solid var(--accent);
    }}
    .phase-card:hover {{
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        transform: translateX(5px);
    }}
    .phase-header {{
        padding: 1.5rem;
        border-bottom: 1px solid var(--light-gray);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }}
    .phase-title {{
        font-family: 'Playfair Display', serif;
        font-size: 1.3rem;
        color: var(--primary);
        margin: 0;
    }}
    .phase-number {{
        background: var(--accent);
        color: white;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.1rem;
    }}
    .phase-content {{
        padding: 1.5rem;
    }}
    .phase-status {{
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 700;
        margin-bottom: 1rem;
    }}
    .status-active {{ background: #d4edda; color: #155724; }}
    .status-pending {{ background: #fff3cd; color: #856404; }}
    .status-complete {{ background: #d1ecf1; color: #0c5460; }}
    .files-list {{
        list-style: none;
        padding: 0;
        margin: 1rem 0 0 0;
    }}
    .files-list li {{
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--light-gray);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    .files-list li:last-child {{
        border-bottom: none;
    }}
    .file-icon {{
        color: var(--gray);
        margin-right: 0.5rem;
    }}
    .phase-actions {{
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }}
    .btn {{
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        border: none;
        font-family: 'Lato', sans-serif;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }}
    .btn-primary {{
        background: var(--accent);
        color: white;
    }}
    .btn-primary:hover {{
        background: #b09a31;
        color: white;
    }}
    .btn-secondary {{
        background: var(--light-gray);
        color: var(--dark);
    }}
    .btn-secondary:hover {{
        background: #e9ecef;
    }}
    footer {{
        background: var(--primary);
        color: white;
        text-align: center;
        padding: 2rem;
        margin-top: 4rem;
    }}
    @media (max-width: 768px) {{
        .client-header h1 {{
            font-size: 2rem;
        }}
        .phase-header {{
            flex-direction: column;
            align-items: flex-start;
        }}
        .phase-actions {{
            flex-direction: column;
        }}
        .btn {{
            width: 100%;
            justify-content: center;
        }}
    }}
  </style>
</head>
<body>
  <header>
    <div class="container header-content">
      <a href="../../index.html" class="logo">Sheila Gutierrez Designs</a>
      <div class="nav-controls">
        <a href="../../index.html">Public Site</a>
        <button class="lang-button" onclick="alert('ES/EN toggle placeholder')">EN</button>
      </div>
    </div>
  </header>

  <main class="container">
    <a href="../index.html" class="back-link">← Back to all clients</a>
    
    <section class="client-header">
      <h1>{client['name']}</h1>
      <p>Client engagement started {client['date_str']}</p>
      <div class="client-meta">
        <div class="meta-item">{len(phase_data)} project phases</div>
        <div class="meta-item">Active</div>
        <div class="meta-item">Design in progress</div>
      </div>
    </section>

    <section class="phases-section">
      <h2 class="section-title">Project Phases</h2>
      <div class="phases-timeline">
'''
    for phase in phase_data:
        # Determine status based on file count
        if phase['file_count'] == 0:
            status = 'pending'
            status_text = 'Not started'
        elif phase['file_count'] < 3:
            status = 'active'
            status_text = 'In progress'
        else:
            status = 'complete'
            status_text = 'Complete'
        
        html += f'''
        <div class="phase-card">
          <div class="phase-header">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="phase-number">{phase['num']:02d}</div>
              <h3 class="phase-title">{phase['title']}</h3>
            </div>
            <div class="phase-status status-{status}">{status_text}</div>
          </div>
          <div class="phase-content">
            <p>This phase contains <strong>{phase['file_count']} files</strong> in Google Drive.</p>
'''
        if phase['files']:
            html += '''
            <ul class="files-list">
'''
            for file in phase['files']:
                icon = '📄' if any(file.lower().endswith(ext) for ext in ['.md', '.txt', '.pdf']) else '🖼️' if any(file.lower().endswith(ext) for ext in ['.jpg', '.png', '.jpeg']) else '📁'
                html += f'<li><span>{icon} {file}</span> <small>Google Drive</small></li>\n'
            html += '</ul>\n'
            if phase['file_count'] > 5:
                html += f'<p><small>+ {phase["file_count"] - 5} more files</small></p>\n'
        
        # Add action buttons based on phase
        html += '<div class="phase-actions">\n'
        if phase['num'] == 3:  # Initial Visit
            html += '<button class="btn btn-primary" onclick="alert(\\'Run Initial Visit Notes automation\\')">🔄 Generate Visit Notes</button>\n'
        elif phase['num'] == 4:  # Moodboard
            html += '<button class="btn btn-primary" onclick="alert(\\'Generate Moodboard specification\\')">🎨 Create Moodboard Spec</button>\n'
        elif phase['num'] == 5:  # Shopping
            html += '<button class="btn btn-primary" onclick="alert(\\'Generate shopping list\\')">🛒 Create Shopping List</button>\n'
        html += f'''<a class="btn btn-secondary" href="#" onclick="alert('Open Google Drive folder: {phase['folder']}')">📂 Open in Drive</a>
        <a class="btn btn-secondary" href="#" onclick="alert('Upload files to this phase')">📤 Upload Files</a>
      </div>
'''
        html += '''
          </div>
        </div>
'''
    
    html += '''
      </div>
    </section>
  </main>

  <footer>
    <div class="container">
      <p>© 2026 Sheila Gutierrez Designs. Client: {client['name']} · This portal is private and confidential.</p>
      <p><small>Automatically synced with Google Drive. Last updated: ''' + datetime.now().strftime("%Y-%m-%d %H:%M") + '''</small></p>
    </div>
  </footer>
</body>
</html>'''
    
    out_path = client_dir / 'index.html'
    out_path.write_text(html)
    print(f"Generated {out_path}")

def main():
    print("Generating client portal website...")
    clients = get_client_folders()
    print(f"Found {len(clients)} clients: {[c['name'] for c in clients]}")
    
    generate_index_html(clients)
    
    for client in clients:
        phases = get_phase_folders(client['folder'])
        print(f"  Client {client['name']}: {len(phases)} phases")
        generate_client_html(client, phases)
    
    print(f"\\nPortal generated at: {OUTPUT_DIR}")
    print(f"Open in browser: file://{OUTPUT_DIR / 'index.html'}")

if __name__ == '__main__':
    main()