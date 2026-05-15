import re
import os

with open("index.html", "r") as f:
    html = f.read()

panels = re.findall(r'<article class="tool-panel[^>]*id="([^"]+)"[^>]*data-tool-panel>.*?</article>', html, re.DOTALL)

for tool_id in panels:
    panel_match = re.search(rf'(<article class="tool-panel[^>]*id="{tool_id}"[^>]*data-tool-panel>.*?</article>)', html, re.DOTALL)
    if panel_match:
        with open(f"src/tools/{tool_id}.html", "w") as f:
            f.write(panel_match.group(1))
        print(f"Extracted {tool_id}.html")
