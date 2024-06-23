import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { UprightBassListing } from '../interfaces/UprightBassListing';

puppeteer.use(StealthPlugin());

// webscrape.ts (called during GET requests):
let browser: any;

async function initializeBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

let objList: UprightBassListing[] = [];

async function scrapeData(toScrape: { talkBass?: boolean, scrapeBassChatData?: boolean, scrapeReverbData?: boolean }) {
  await initializeBrowser();
  if (toScrape.talkBass === true) { // scrape TalkBass data
    console.log("scraping talkbass data...");
    await scrapeTalkBassData();
  }

  if (toScrape.scrapeBassChatData === true) { // scrape BassChat data
    console.log("scraping basschat data...");
    await scrapeBassChatData();
  }

  if (toScrape.scrapeReverbData === true) { // scrape Reverb data
    console.log("scraping reverb data...");
    await scrapeReverbData();
  }

  await browser.close();
  console.log("browser closed");
  return objList;
};

async function scrapeTalkBassData() {
  const page = await browser.newPage();
  //TODO: Get higher quality pictures from source

  await page.goto('https://www.talkbass.com/forums/for-sale-double-basses.144/?prefix_id=1');
  let numPages = await page.$eval("#content > div > div > div.mainContainer > div > div:nth-child(6) > div.PageNav > nav > a:nth-child(5)", (el: { textContent: any; }) => el.textContent)
  numPages = parseInt(numPages);
  console.log("number of pages obtained to be: ", numPages);

  for (let i = 1; i <= numPages; i++) { // TODO: change numPages to 2 for testing.
    await page.goto(`https://www.talkbass.com/forums/for-sale-double-basses.144/page-${i}?prefix_id=1`);
    await page.waitForSelector('.discussionListItems .discussionListItem.visible.prefix1');
    const bassListings = await page.$$(`.discussionListItems .discussionListItem.visible.prefix1`);

    console.log(`num bass listings found in page ${i} = ${bassListings.length}`);

    for (let thread of bassListings) {
      let obj: UprightBassListing = {
        imgLink: "",
        price: 0,
        title: "",
        year: 0,
        location: "",
        saleStatus: "",
        listingLink: ""
      };

      obj.title = await thread.$eval('.PreviewTooltip', (el: { textContent: any; }) => el.textContent);
      const imgRef = await thread.$eval('div.listBlock.posterAvatar > span > a > img', (el: { style: { getPropertyValue: (arg0: string) => any; }; }) => el.style.getPropertyValue('background-image'))
      obj.imgLink = 'https://www.talkbass.com/' + imgRef.slice(5, (imgRef.length - 2));
      obj.listingLink = await thread.$eval('div.listBlock.posterAvatar > span > a', (el: { href: any; }) => el.href);

      try {
        obj.location = await thread.$eval('div > div > div.pairsInline > dl:nth-child(3) > dd', (el: { innerText: any; }) => el.innerText)
      }
      catch (error) {
        obj.location = "location not found";
      }

      obj.saleStatus = await thread.$eval('div > h3 > a.prefixLink > span', (el: { innerText: any; }) => el.innerText);

      try {
        let price = await thread.$eval('div > div > div.pairsInline > dl:nth-child(1) > dd > big > span', (el: { innerText: any; }) => el.innerText);
        obj.price = cleanPriceHelper(price);
      }
      catch (error) {
        obj.price = 0;
      }

      if (obj.title) {
        obj.year = searchTextForYearHelper(obj.title);
      }

      objList.push(obj)
    }
  }

  console.log("\n\n\n ***** Reached end of scrapeTalkBassData function *****");

  return;
};

async function scrapeBassChatData() {
  const page = await browser.newPage();
  await page.goto('https://www.basschat.co.uk/forum/76-eubs-double-basses-for-sale/');

  /*
  await page.waitForSelector('.discussionListItems .discussionListItem.visible.prefix1');
  const bassListings = await page.$$(`.discussionListItems .discussionListItem.visible.prefix1`);
*/
  const pageJumpCSSPath = ".ipsPagination_pageJump > a";
  await page.waitForSelector(pageJumpCSSPath);
  const pageOfPageText = await page.$(pageJumpCSSPath).then((el: any) => el?.evaluate((el: any) => el.textContent));
  const numPagesRegex = /\d+\s*(?=[^\d]*$)/;
  const numPages = parseInt(pageOfPageText.match(numPagesRegex));

  console.log("number of pages obtained to be: ", numPages);

  const itemCSSPath = ".ipsClear.ipsDataList.cForumTopicTable.cTopicList > .ipsDataItem.ipsDataItem_responsivePhoto";

  for (let pageNum = 1; pageNum <= 2; pageNum++) {
    await page.goto(`https://www.basschat.co.uk/forum/76-eubs-double-basses-for-sale/page/${pageNum}/`);
    await page.waitForSelector(itemCSSPath);
    const bassListings = await page.$$(itemCSSPath);

    console.log(`num bass listings found in page ${pageNum} = ${bassListings.length}`);

    let threadNum = 0;
    for (let thread of bassListings) {
      threadNum += 1;
      if ((threadNum == 1 && pageNum == 1) || (threadNum == 2 && pageNum == 1)) {
        // We're at the sticky threads which we want to skip (terms of conditions, advice for buyers and sellers)
        continue;
      }

      let obj: UprightBassListing = {
        imgLink: "",
        price: 0,
        title: "",
        year: 0,
        location: "",
        saleStatus: "",
        listingLink: ""
      };

      const relativeTitleCSSPath = '.ipsDataItem_main > .ipsDataItem_title.ipsContained_container > span > a';
      await thread.waitForSelector(relativeTitleCSSPath);
      const titleElement = await thread.$(relativeTitleCSSPath);

      if (!titleElement) {
        console.log("@@@@@@@@ titleElement not found inside scrapeBassChatData! @@@@@@@@");
        continue;
      }

      obj.title = await titleElement.evaluate((el: { textContent: any; }) => el.textContent);

      if (!obj.title) {
        console.log("bass listing title not found!");
        continue;
      }
      
      if (!availableFromTextBool(obj.title)) {
        console.log("bass listing is not available, skipping...");
        continue;
      }

      obj.year = searchTextForYearHelper(obj.title);
      obj.saleStatus = "Available";
      obj.listingLink = await titleElement.evaluate((el: { href: any; }) => el.href);

      try {
        await page.goto(obj.listingLink);
        console.log("went into object listing!");
      }
      catch (error) {
        console.log("Error going into object listing: ", error);
        continue;
      }
      
      // TODO: maybe set a timeout here?

      const listingInfoCSSSelector = ".ipsType_pageTitle.ipsContained_container > br";
      console.log("waiting for listingInfoCSSSelector...");
      await page.waitForSelector(listingInfoCSSSelector);
      
      console.log("found listingInfoCSSSelector! now selecting price and location...");
      const priceThenLocation = await page.$$(listingInfoCSSSelector);
      
      console.log("found priceThenLocation! now evaluating... ");
      obj.price = cleanPriceHelper(await priceThenLocation[0].evaluate((el: { textContent: any; }) => el.textContent));
      obj.location = (await priceThenLocation[1].evaluate((el: { textContent: any; }) => el.textContent)) + ", United Kingdom";

      console.log("price and location:", obj.price, obj.location);

      console.log("now finding image CSS path");
      const imageCSSPath = ".ipsImage.ipsImage_thumbnailed";
      await page.waitForSelector(imageCSSPath);

      console.log("now grabbing image link...");
      obj.imgLink = await thread.$eval(imageCSSPath, (el: { src: any; }) => el.src);

      console.log("pushing object to objList...");
      objList.push(obj)
    }
  }
};

async function scrapeReverbData() {
  // https://reverb.com/marketplace?category=upright-bass&product_type=band-and-orchestra
  return null;
}

function cleanPriceHelper(price: string | number) {
  price = String(price).replace(/\$/g, '').replace(/\.\d+/, '').replace(/\./, '').replace(/k/g, '000');
  price = parseInt(price);
  if (isNaN(price)) {
    price = 0;
  }
  return price;
};

function searchTextForYearHelper(text: string) {
  let yearRegex = /\d+/g; // regex to find instance of a numeric value for year in object title div
  let matches = text.match(yearRegex);

  if (matches) {
    for (let numStr of matches) {
      let num = parseInt(numStr);
      if ((num > 1500) && (num <= 2025)) { // TODO: fetch current year from host here
        //console.log("Year detected!", num)
        return num;
      }
    }
  }

  return 0;
};

function availableFromTextBool(text: string) {
  let soldRegex = /\*SOLD\*/g;
  let soldMatches = text.match(soldRegex);

  let withdrawnRegex = /\*WITHDRAWN\*/g;
  let withdrawnMatches = text.match(withdrawnRegex);

  if (soldMatches || withdrawnMatches) {
    return false;
  }

  return true;
}

module.exports = scrapeData;