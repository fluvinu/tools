import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://localhost:3000")

        # Select a tool (JSON diff)
        await page.click("a[data-tool='json-diff']")

        # Since it navigates, wait for the new page to load
        await page.wait_for_timeout(1000)
        # Verify it auto-collapses
        await page.screenshot(path="collapsed.png")

        # Click the toggle sidebar button to show sidebar
        await page.click("#toggleSidebarBtn")
        await page.wait_for_timeout(500)
        await page.screenshot(path="hovered_zone.png") # keeping the original filename for the test output

        # Click the toggle sidebar button again to hide sidebar
        await page.click("#toggleSidebarBtn")
        await page.wait_for_timeout(500)
        await page.screenshot(path="unhovered_zone.png")

        await browser.close()

asyncio.run(main())
