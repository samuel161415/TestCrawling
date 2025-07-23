/**
 * 1) -----------------------------------------------------------------------------------------------------------
 *      Analyze browser Network Tab to find apis of the following urls.
 *      Tips: extract the productId from the url string.
 *      Use gotScraping to make a request to those apis.
 *
 *      Parse the json and extract:
 *          - fullPrice (it has to be a number)
 *          - discountedPrice (it has to be a number, if it does not exist same as fullPrice)
 *          - currency (written in 3 letters [GBP, USD, EUR...])
 *          - title (product title)
 *
 *      Result example
 *      {
 *          url: ${urlCrawled},
 *          apiUrl: ${apiUrl},
 *          fullPrice: 2000.12,
 *          discountedPrice: 1452.02,
 *          currency: 'GBP',
 *          title: 'Aqualung Computer subacqueo i330R'
 *      }
 * --------------------------------------------------------------------------------------------------------------
 */
const { gotScraping } = require("got-scraping");

const urls = [
  "https://www.stoneisland.com/en-it/collection/polos-and-t-shirts/slim-fit-short-sleeve-polo-shirt-2sc17-stretch-organic-cotton-pique-81152SC17A0029.html",
  "https://www.stoneisland.com/en-it/collection/polos-and-t-shirts/short-sleeve-polo-shirt-22r39-50-2-organic-cotton-pique-811522R39V0097.html",
];

(async () => {
  const results = [];

  for (const url of urls) {
    try {
      // Extract product ID from URL (last part before .html)
      const productId = url.split("/").pop().replace(".html", "");

      // Construct API URL based on network analysis
      const apiUrl = `https://www.stoneisland.com/api/products/${productId}`;

      // Make API request
      const response = await gotScraping({
        url: apiUrl,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (response.statusCode !== 200) {
        throw new Error(`API returned status code ${response.statusCode}`);
      }

      const productData = JSON.parse(response.body);

      // Extract prices - structure may vary based on API response
      let fullPrice = productData.price?.value || 0;
      let discountedPrice = productData.discountedPrice?.value || fullPrice;

      // Convert to numbers if they're strings
      fullPrice =
        typeof fullPrice === "string"
          ? parseFloat(fullPrice.replace(/[^\d.,]/g, "").replace(",", "."))
          : fullPrice;
      discountedPrice =
        typeof discountedPrice === "string"
          ? parseFloat(
              discountedPrice.replace(/[^\d.,]/g, "").replace(",", ".")
            )
          : discountedPrice;

      // Extract currency (default to EUR)
      const currency = productData.price?.currency || "EUR";

      results.push({
        url,
        apiUrl,
        fullPrice,
        discountedPrice,
        currency,
        title: productData.name || productData.title || "Unknown Product",
      });
    } catch (error) {
      console.error(`Failed to process ${url}: ${error.message}`);
      results.push({
        url,
        error: error.message,
      });
    }
  }

  console.log("API crawling results:", results);
})();
