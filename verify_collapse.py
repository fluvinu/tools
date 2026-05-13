import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://localhost:3000")

        # Select a tool (JSON diff)
        await page.click("button[data-tool='json-diff']")

        # Move mouse away to let it collapse
        await page.hover("h2#tools-title")
        await page.wait_for_timeout(500)
        await page.screenshot(path="collapsed.png")

        # Hover over hover-zone
        await page.hover(".hover-zone", position={"x": 10, "y": 100})
        await page.wait_for_timeout(500)
        await page.screenshot(path="hovered_zone.png")

        # Hover away
        await page.hover("h2#tools-title")
        await page.wait_for_timeout(500)
        await page.screenshot(path="unhovered_zone.png")

        await browser.close()

asyncio.run(main())
