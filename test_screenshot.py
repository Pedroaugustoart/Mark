from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://mark-nine-alpha.vercel.app")
    page.wait_for_timeout(3000)
    page.screenshot(path="prod_screenshot.png")
    print("Screenshot saved to prod_screenshot.png")
    browser.close()
