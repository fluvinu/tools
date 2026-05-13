import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://localhost:3000")

        # Select a tool (JSON diff)
        await page.click("button[data-tool='json-diff']")
        await page.wait_for_timeout(500)
        await page.screenshot(path="collapsed.png")

        # Hover over hover-zone
        await page.hover(".hover-zone")
        await page.wait_for_timeout(500)
        await page.screenshot(path="hovered_zone.png")

        # Hover away
        await page.hover(".site-header")
        await page.wait_for_timeout(500)
        await page.screenshot(path="unhovered_zone.png")

        await browser.close()

asyncio.run(main())
