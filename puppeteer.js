/**
 * 1) -----------------------------------------------------------------------------------------------------------
 *      Use puppeteer navigate to the following urls.
 *      Check response status code (200, 404, 403), proceed only in case of code 200, throw an error in other cases.
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
 *          currency: 'EUR',
 *          title: 'Abito Bianco con Stampa Grafica e Scollo a V Profondo'
 *      }
 * --------------------------------------------------------------------------------------------------------------
 *
 * 2) -----------------------------------------------------------------------------------------------------------
 *      Extract product options (from the select form) and log them
 *      Select/click on the second option (if the second one doesn't exist, select/click the first)
 *
 *      Log options example:
 *      [
 *          {
 *              value: 'Blu - L/XL',
 *              optionValue: '266,1033', // Attribute "value" of option element
 *          }
 *      ]
 * --------------------------------------------------------------------------------------------------------------
 */
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const urls = [
  "https://www.outdoorsrlshop.it/catalogo/1883-trekker-rip.html",
  "https://www.outdoorsrlshop.it/catalogo/2928-arco-man-t-shirt.html",
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const url of urls) {
    try {
      // Navigate to the URL and wait for network to be idle
      const response = await page.goto(url, { waitUntil: "networkidle2" });

      // Check status code
      const status = response.status();
      if (status !== 200) {
        throw new Error(`Received status code ${status}`);
      }

      // Get HTML content
      const html = await page.content();

      // Use cheerio to parse HTML
      const $ = cheerio.load(html);

      // Extract product details
      const title = $("h1").text().trim();

      // Extract prices - improved selector
      let priceText =
        $(".prezzo .upyPrezzoFinale").text().trim() ||
        $(".price-final").text().trim();

      // Clean and convert price
      const cleanPrice = (price) => {
        const num = parseFloat(price.replace(/[^\d,]/g, "").replace(",", "."));
        return isNaN(num) ? 0 : num;
      };

      let fullPrice = cleanPrice(priceText);
      let discountedPrice = fullPrice;

      // Check for discounted price
      const discountText =
        $(".prezzo .special-price").text().trim() ||
        $(".price-special").text().trim();
      if (discountText) {
        discountedPrice = cleanPrice(discountText);
      }

      // Extract currency (default to EUR)
      const currency = priceText.match(/[€£$]/)
        ? priceText.includes("€")
          ? "EUR"
          : priceText.includes("£")
          ? "GBP"
          : "USD"
        : "EUR";

      console.log("Product details:", {
        url,
        fullPrice,
        discountedPrice,
        currency,
        title,
      });

      // Extract product options
      const options = [];
      $("select option").each((i, el) => {
        const optionText = $(el).text().trim();
        const optionValue = $(el).attr("value");

        // Skip the default "Choose an option" if it exists
        if (optionValue && !optionText.match(/scegli|choose/i)) {
          options.push({
            value: optionText,
            optionValue: optionValue,
          });
        }
      });

      console.log("Product options:", options);

      // Select an option if any exist
      if (options.length > 0) {
        const optionToSelect = options.length >= 2 ? options[1] : options[0];
        await page.select("select", optionToSelect.optionValue);
        console.log(`Selected option: ${optionToSelect.value}`);

        // Wait for any potential updates (using waitForTimeout polyfill)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to process ${url}: ${error.message}`);
    }
  }

  await browser.close();
})();
