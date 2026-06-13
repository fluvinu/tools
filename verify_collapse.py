import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://localhost:3000")

        # Hover over the first category to show the dropdown
        await page.hover(".tool-category:first-of-type")
        await page.wait_for_timeout(500)

        # Select a tool (JSON diff)
        await page.click("a[data-tool='json-diff']")

        # Since it navigates, wait for the new page to load
        await page.wait_for_timeout(1000)
        # Verify the layout
        await page.screenshot(path="collapsed.png")

        await browser.close()

asyncio.run(main())
