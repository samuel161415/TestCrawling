# Web Scraper Implementation

**Date:** July 23, 2025

This project is a web scraper built to extract product data from e‑commerce sites.  
Below is a detailed overview of the implementation.

---

## 🚀 Tools Used
- **Playwright / Puppeteer** – Browser automation and navigation
- **Cheerio** – Parsing and extracting data from HTML (product title, price, currency)

---

## 📦 Data Extraction & Cleanup
The scraper extracts and normalizes the following fields:

- **Title** – From `<h1>` or product-name elements  
- **Price** – Converted to a float (e.g. `£1,200.99` → `1200.99`)  
- **Currency** – Normalized to 3‑letter codes (`GBP`, `USD`, `EUR`)  
- **Discounted Price** – Falls back to full price if no discount exists  
- **Stock Availability** – `inStock` boolean added in `playwright.js`

---

## ⚡ Challenge: Anti‑Scraping Measures
Some sites implement anti‑scraping techniques. To handle these:

- **Modified Browser Headers**  
  - Set a realistic `User-Agent` (e.g. Chrome 91) and `Referer` to mimic human browsing
- **Stealth Mode in `chromium.launch()`**
  ```js
  args: [
    "--disable-blink-features=AutomationControlled", // Hides automation traces
    "--user-agent=Mozilla/5.0..." // Disguises as a real browser
  ]
