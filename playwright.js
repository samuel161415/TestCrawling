/**
 * 1) -----------------------------------------------------------------------------------------------------------
 *      Use playwright navigate to the following urls.
 *      Check response status code (200, 404, 403), proceed only in case of code 200, throw an error in other cases.
 *      Use playwright methods select the country associated with the url.
 *
 *      Using cheerio extract from html:
 *          - fullPrice (it has to be a number)
 *          - discountedPrice (it has to be a number, if it does not exist same as fullPrice)
 *          - currency (written in 3 letters [GBP, USD, EUR...])
 *          - title (product title)
 *
 *      Result example
 *      {
 *          url: ${urlCrawled},
 *          fullPrice: 2000.12,
 *          discountedPrice: 1452.02,
 *          currency: 'GBP',
 *          title: 'Aqualung Computer subacqueo i330R'
 *      }
 * --------------------------------------------------------------------------------------------------------------
 */
const { chromium } = require("playwright");
const cheerio = require("cheerio");

const urls = [
  {
    url: "https://www.selfridges.com/US/en/product/fear-of-god-essentials-camouflage-panels-relaxed-fit-woven-blend-overshirt_R04364969/",
    country: "GB",
  },
  {
    url: "https://www.selfridges.com/ES/en/product/gucci-interlocking-g-print-crewneck-cotton-jersey-t-shirt_R04247338/",
    country: "US",
  },
  {
    url: "https://www.selfridges.com/US/en/product/fear-of-god-essentials-essentials-cotton-jersey-t-shirt_R04318378/",
    country: "IT",
  },
];

const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const priceValue = priceStr.replace(/[^\d.,]/g, "").replace(",", ".");
  return parseFloat(priceValue) || 0;
};

const detectCurrency = (priceStr) => {
  if (!priceStr) return "GBP";
  if (priceStr.includes("£")) return "GBP";
  if (priceStr.includes("$")) return "USD";
  if (priceStr.includes("€")) return "EUR";
  return "GBP";
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    // please change the executablePath to your local Chrome installation path
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ],
  });

  const results = [];

  try {
    for (const { url, country } of urls) {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Set realistic headers
        await page.setExtraHTTPHeaders({
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.google.com/",
        });

        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        if (response.status() !== 200) {
          throw new Error(`HTTP ${response.status()}`);
        }

        // Handle country selection
        try {
          await page.click(
            'button[data-testid="country-selector-toggle-button"]',
            { timeout: 3000 }
          );
          await page.click(
            `button[data-testid="country-selector-${country}"]`,
            { timeout: 3000 }
          );
          await page.waitForLoadState("networkidle");
        } catch (error) {
          console.log(`Country selection not available for ${url}`);
        }

        const html = await page.content();
        const $ = cheerio.load(html);
        // Extract product details from the provided HTML structure
        const titleElement = $(".sc-5ec017c-3.gsrfZb");
        const brandElement = $(".sc-5ec017c-2.fkKSpD");
        const priceElement = $(".sc-eb97dd86-3.iLAkQD");
        const availabilityElement = $(
          ".sc-da30e13f-0.hwQVYQ, .sc-9640ed4e-1.hjtyKW"
        );

        // Construct title from brand + product name
        const brand = brandElement.text().trim();
        const productName = titleElement.text().trim();
        const title = `${brand} ${productName}`.trim();

        // Handle pricing and availability
        let fullPrice = 0;
        let discountedPrice = 0;
        let currency = "GBP";
        const isOutOfStock =
          availabilityElement.text().includes("out of stock") ||
          availabilityElement.text().includes("unavailable");

        const priceText = priceElement.text().trim();
        fullPrice = parsePrice(priceText);
        discountedPrice = fullPrice; // Assuming no discount if not specified
        currency = detectCurrency(priceText);

        const result = {
          url,
          fullPrice,
          discountedPrice,
          currency,
          title,
          available: !isOutOfStock,
        };

        results.push(result);
      } catch (error) {
        console.error(`Error processing ${url}: ${error.message}`);
        results.push({
          url,
          error: error.message,
        });
      } finally {
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\nScraped results:");
  console.log(results);
})();
