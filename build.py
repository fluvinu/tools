import re
import os
import shutil

# Read original index.html just to extract the baseline sidebar once for generation
with open("index.html", "r") as f:
    original_html = f.read()

# Extract sidebar
sidebar_match = re.search(r'<div class="top-nav-menu">(.*?)</div>\s*<a class="github-link"', original_html, re.DOTALL)
sidebar = sidebar_match.group(1).strip() if sidebar_match else ""

# Modify sidebar: replace <button> tabs with <a> links pointing to /{tool_id}/
def replace_button_with_link(match):
    classes = match.group(1).replace('active', '').strip() # Remove active class by default
    tool_id = match.group(2)
    text = match.group(3)
    if classes == "tool-tab":
        classes = ""
    else:
        classes = classes.replace("tool-tab", "").strip()
    return f'<a class="tool-tab {classes}" href="/{tool_id}/" data-tool="{tool_id}">{text}</a>'.replace('  ', ' ').replace('class="tool-tab "', 'class="tool-tab"')

sidebar = re.sub(r'<button class="([^"]*)" data-tool="([^"]+)">([^<]+)</button>', replace_button_with_link, sidebar)

# Read template
with open("template.html", "r") as f:
    template = f.read()

# Read all tools from src/tools/
tools_dir = "src/tools"
tool_files = [f for f in os.listdir(tools_dir) if f.endswith(".html")]

print(f"Found {len(tool_files)} panels in src/tools to process.")

# Create main landing page (index.html)
landing_page = template.replace('{{ title }}', 'Toolbox Hub - Free Browser Tools in One')
landing_page = landing_page.replace('{{ description }}', 'A fast all-in-one browser toolkit with developer, calculator, image, and PDF utilities.')
landing_page = landing_page.replace('{{ sidebar }}', sidebar)

landing_placeholder = """
            <article class="tool-panel active">
              <div class="panel-header"><h3>Welcome to Toolbox Hub</h3><p>Select a tool from the top menu to get started.</p></div>
            </article>
"""
landing_page = landing_page.replace('{{ tool_panel }}', landing_placeholder)

with open("index.html.new", "w") as f:
    f.write(landing_page)

# Create each tool page
for tool_file in tool_files:
    tool_id = tool_file.replace(".html", "")

    with open(os.path.join(tools_dir, tool_file), "r") as f:
        panel_html = f.read()

    # Ensure it is active
    panel_html = panel_html.replace('class="tool-panel"', 'class="tool-panel active"')

    # Extract title and description
    title_match = re.search(r'<h3>(.*?)</h3>', panel_html)
    desc_match = re.search(r'<p>(.*?)</p>', panel_html)

    title = title_match.group(1) if title_match else f"{tool_id} Tool"
    description = desc_match.group(1) if desc_match else f"Free online {title.lower()} tool."

    # Customize sidebar for this specific page (set active class)
    page_sidebar = sidebar.replace(f'class="tool-tab" href="/{tool_id}/"', f'class="tool-tab active" href="/{tool_id}/"')

    page_html = template.replace('{{ title }}', f'{title} - Toolbox Hub')
    page_html = page_html.replace('{{ description }}', description)
    page_html = page_html.replace('{{ sidebar }}', page_sidebar)
    page_html = page_html.replace('{{ tool_panel }}', panel_html)

    # Create directory and file
    os.makedirs(tool_id, exist_ok=True)
    with open(os.path.join(tool_id, "index.html"), "w") as f:
        f.write(page_html)

    print(f"Created /{tool_id}/index.html")

# Replace index.html
shutil.move("index.html.new", "index.html")
print("Updated main index.html")
