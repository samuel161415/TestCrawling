/**
 * 1) -----------------------------------------------------------------------------------------------------------
 *      Use got-scraping to crawl in sequence the following urls.
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
 * 2) -----------------------------------------------------------------------------------------------------------
 *      Like the first exercise but the urls must be crawled in parallel
 * --------------------------------------------------------------------------------------------------------------
 */

const { gotScraping } = require("got-scraping");
const cheerio = require("cheerio");

async function crawlSequentially(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await gotScraping(url);
      // console.log('response',response.body)

      if (response.statusCode !== 200) {
        throw new Error(`Received status code ${response.statusCode}`);
      }

      const $ = cheerio.load(response.body);

      // Try to parse JSON-LD data which is common in e-commerce sites
      const jsonLd = $('script[type="application/ld+json"]').html();
      let productData = {};
      if (jsonLd) {
        try {
          productData = JSON.parse(jsonLd);
        } catch (e) {
          console.error("Failed to parse JSON-LD:", e);
        }
      }

      // Extract title
      const title =
        productData.name ||
        $("h1.product-title, h1.product-name").text().trim() ||
        $("title").text().split("|")[0].trim();

      // Extract prices
      let fullPrice = 0;
      let discountedPrice = 0;

      if (productData.offers && productData.offers.price) {
        fullPrice =
          parseFloat(productData.offers.highPrice) ||
          parseFloat(productData.offers.price);
        discountedPrice = parseFloat(productData.offers.price) || fullPrice;
      } else {
        // Improved fallback to HTML extraction
        let fullPriceText = "";
        let discountedPriceText = "";

        // First try to get prices using data-testid attributes
        if ($('[data-testid="product-price"]').length) {
          discountedPriceText = $('[data-testid="product-price"]')
            .text()
            .trim();
          fullPriceText = $('[data-testid="product-previous-price"]').length
            ? $('[data-testid="product-previous-price"]').text().trim()
            : discountedPriceText;
        }
        // Fallback to class-based selectors
        else if ($(".price, .product-price").length) {
          const priceText = $(".price, .product-price").text();
          discountedPriceText = priceText;
          fullPriceText = priceText;
        }

        // Clean and parse prices
        discountedPrice =
          parseFloat(
            discountedPriceText.replace(/[^0-9.,]/g, "").replace(",", ".")
          ) || 0;
        fullPrice =
          parseFloat(
            fullPriceText.replace(/[^0-9.,]/g, "").replace(",", ".")
          ) || discountedPrice;
      }

      // Get currency
      const currency =
        (productData.offers && productData.offers.priceCurrency) ||
        $('meta[itemprop="priceCurrency"]').attr("content") ||
        "EUR";

      results.push({
        url,
        fullPrice,
        discountedPrice,
        currency,
        title,
      });
    } catch (error) {
      console.error(`Failed to crawl ${url}: ${error.message}`);
    }
  }

  return results;
}

const urls = [
  "https://www.miinto.it/p-de-ver-s-abito-slip-3059591a-7c04-405c-8015-0936fc8ff9dd",
  "https://www.miinto.it/p-abito-a-spalline-d-jeny-fdac3d17-f571-4b55-8780-97dddf80ef35",
  "https://www.miinto.it/p-abito-bianco-con-stampa-grafica-e-scollo-a-v-profondo-2b03a3d9-fab1-492f-8efa-9151d3322ae7",
];

// Function for parallel crawling
async function crawlInParallel(urls) {
  const requests = urls.map((url) =>
    gotScraping(url)
      .then((response) => {
        if (response.statusCode !== 200) {
          throw new Error(`Received status code ${response.statusCode}`);
        }
        return response;
      })
      .catch((error) => ({ error, url }))
  );

  const responses = await Promise.all(requests);
  const results = [];

  for (const response of responses) {
    if (response.error) {
      console.error(
        `Failed to crawl ${response.url}: ${response.error.message}`
      );
      continue;
    }

    const $ = cheerio.load(response.body);
    const url = response.url;

    // Try to parse JSON-LD data
    const jsonLd = $('script[type="application/ld+json"]').html();
    let productData = {};
    if (jsonLd) {
      try {
        productData = JSON.parse(jsonLd);
      } catch (e) {
        console.error("Failed to parse JSON-LD:", e);
      }
    }

    // Extract title
    const title =
      productData.name ||
      $("h1.product-title, h1.product-name").text().trim() ||
      $("title").text().split("|")[0].trim();

    // Extract prices
    let fullPrice = 0;
    let discountedPrice = 0;

    if (productData.offers && productData.offers.price) {
      fullPrice =
        parseFloat(productData.offers.highPrice) ||
        parseFloat(productData.offers.price);
      discountedPrice = parseFloat(productData.offers.price) || fullPrice;
    } else {
      // Improved fallback to HTML extraction
      let fullPriceText = "";
      let discountedPriceText = "";

      // First try to get prices using data-testid attributes
      if ($('[data-testid="product-price"]').length) {
        discountedPriceText = $('[data-testid="product-price"]').text().trim();
        fullPriceText = $('[data-testid="product-previous-price"]').length
          ? $('[data-testid="product-previous-price"]').text().trim()
          : discountedPriceText;
      }
      // Fallback to class-based selectors
      else if ($(".price, .product-price").length) {
        const priceText = $(".price, .product-price").text();
        discountedPriceText = priceText;
        fullPriceText = priceText;
      }

      // Clean and parse prices
      discountedPrice =
        parseFloat(
          discountedPriceText.replace(/[^0-9.,]/g, "").replace(",", ".")
        ) || 0;
      fullPrice =
        parseFloat(fullPriceText.replace(/[^0-9.,]/g, "").replace(",", ".")) ||
        discountedPrice;
    }

    // Get currency
    const currency =
      (productData.offers && productData.offers.priceCurrency) ||
      $('meta[itemprop="priceCurrency"]').attr("content") ||
      "EUR";

    results.push({
      url,
      fullPrice,
      discountedPrice,
      currency,
      title,
    });
  }

  return results;
}

(async () => {
  console.log("Starting sequential crawling...");
  const sequentialResults = await crawlSequentially(urls);
  console.log("Sequential crawling results:", sequentialResults);

  console.log("\nStarting parallel crawling...");
  const parallelResults = await crawlInParallel(urls);
  console.log("Parallel crawling results:", parallelResults);
})();
