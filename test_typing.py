from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000')

        # Click the typing test tab
        page.click('a[data-tool="typing-test"]')

        # Verify panel is active
        assert page.is_visible('#typing-test')

        # Verify we see the stats
        assert page.is_visible('#typingTime')
        assert page.is_visible('#typingWpm')

        # Get some initial stats
        initial_time = page.inner_text('#typingTime')

        # Start typing by interacting with input
        page.type('#typingInput', 'The quick')
        page.wait_for_timeout(1500) # Wait for timer to start and tick down

        # Time should have decreased
        new_time = page.inner_text('#typingTime')
        assert int(new_time) < int(initial_time)

        # Test full screen button
        # (It might not work fully in headless but we can ensure the button is clickable)
        page.click('#fullscreenTyping')

        # Restart test
        page.click('#restartTyping')

        # Test keyboard shortcut (Escape)
        page.keyboard.press('Escape')

        print("Playwright UI test passed!")
        browser.close()

if __name__ == '__main__':
    run()
