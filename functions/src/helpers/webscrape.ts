import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { UprightBassListing } from '../interfaces/UprightBassListing';

let objList: UprightBassListing[] = [];

async function scrapeData(toScrape: { talkBass?: boolean, scrapeBassChatData?: boolean, scrapeReverbData?: boolean }) {

  if (toScrape.talkBass === true) { // scrape TalkBass data
    console.log("scraping talkbass data...");
    await scrapeTalkBassData();
  }

  if (toScrape.scrapeBassChatData === true) { // scrape BassChat data
    console.log("scraping basschat data...");
    await scrapeBassChatData();
  }

  console.log("browser closed");
  return objList;
};

async function scrapeTalkBassData() {
  puppeteer.use(StealthPlugin());

  // webscrape.ts (called during GET requests):
  let browser: any;

  async function initializeBrowser() {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-accelerated-2d-canvas', '--disable-gpu'],
    });
  }

  await initializeBrowser();
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  await page.goto('https://www.talkbass.com/forums/for-sale-double-basses.144/?prefix_id=1', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  let numPages = await page.$$eval(".pageNav-page", (elements: any) => {
    const matchingElement = elements.find((el: HTMLElement) => el.classList.length === 1);
    return matchingElement ? matchingElement.textContent : null;
  });
  console.log("retrieved numPages:", numPages);
  numPages = parseInt(numPages);
  console.log("parseInt'd number of pages obtained to be: ", numPages);

  let talkBassObjs: UprightBassListing[] = [];

  for (let i = 1; i <= 1; i++) { // TODO: change numPages to numPages for production.
    await page.goto(`https://www.talkbass.com/forums/for-sale-double-basses.144/page-${i}?prefix_id=1`);
    console.log("now at page:", page.url());
    const pageContent = await page.content();
    console.log(pageContent.slice(0, 60));
    await page.waitForSelector('.block-container');
    const bassListings = await page.$$(`.structItem.structItem--ad`);

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

      obj.title = await thread.$eval('.structItem-title a[data-tp-primary="on"]', (el: HTMLElement) => el.textContent?.trim());
      console.log("title:", obj.title);

      const relativeListingLink = await thread.$eval('.structItem-title a[data-tp-primary="on"]', (el: HTMLElement) => el.getAttribute('href'));
      obj.listingLink = "https://www.talkbass.com" + relativeListingLink.trim();

      console.log("listingLink:", obj.listingLink);

      obj.saleStatus = "Available";

      if (obj.title) {
        obj.year = searchTextForYearHelper(obj.title);
      }
      talkBassObjs.push(obj)
    }
  }

  for (let obj of talkBassObjs) {
    await page.goto(obj.listingLink);
    console.log("listing page we're at:", page.url());

    const uncleanPrice = await page.$eval('.casHeader-price', (el: HTMLElement) => el.textContent?.trim() || "");
    console.log("uncleanPrice:", uncleanPrice);

    obj.price = cleanPriceHelper(uncleanPrice);
    obj.location = await page.$eval('.adBody-fields.adBody-fields--header dd', (el: HTMLElement) => el.textContent?.trim() || "");
    obj.imgLink = await page.$eval('.js-adImage', (el: { src: any; }) => el.src || "");

    console.log("obj:", obj);
  }

  console.log("\n\n\n ***** Reached end of scrapeTalkBassData function *****");

  await browser.close();
};

async function scrapeBassChatData() {
  // webscrape.ts (called during GET requests):
  let browser: any;

  async function initializeBrowser() {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
    });
  }

  await initializeBrowser();
  const page = await browser.newPage();
  await page.goto('https://www.basschat.co.uk/forum/76-eubs-double-basses-for-sale/');

  const pageJumpCSSPath = ".ipsPagination_pageJump > a";
  await page.waitForSelector(pageJumpCSSPath);
  const pageOfPageText = await page.$(pageJumpCSSPath).then((el: any) => el?.evaluate((el: any) => el.textContent));
  const numPagesRegex = /\d+\s*(?=[^\d]*$)/;
  const numPages = parseInt(pageOfPageText.match(numPagesRegex));

  console.log("number of pages obtained to be: ", numPages);

  const itemCSSPath = ".ipsClear.ipsDataList.cForumTopicTable.cTopicList > .ipsDataItem.ipsDataItem_responsivePhoto";
  const listingPage = await browser.newPage();

  for (let pageNum = 1; pageNum <= 1; pageNum++) { // TODO: change to numPages for production
    const listingsPageLink = `https://www.basschat.co.uk/forum/76-eubs-double-basses-for-sale/page/${pageNum}/`;
    await page.goto(listingsPageLink);
    await page.waitForSelector(itemCSSPath);
    const bassListings = await page.$$(itemCSSPath);

    console.log(`num bass listings found in page ${pageNum} = ${bassListings.length}`);

    let threadNum = 0;
    for (let thread of bassListings) {
      threadNum += 1;
      if ((threadNum == 1 && pageNum == 1) || (threadNum == 2 && pageNum == 1)) {
        // We're at the sticky threads which we want to skip (terms of conditions, advice for buyers and sellers)
        console.log("@@@@@@ INSIDE A STICKY THREAD, SKIPPING @@@@@@");
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
        continue;
      }

      const uncleanTitle = await titleElement.evaluate((el: { textContent: any; }) => el.textContent);

      if (!uncleanTitle) {
        continue;
      }

      obj.title = uncleanTitle.replace(/[\t\n]/g, '').trim();

      if (!obj.title) {
        continue;
      }

      if (!availableFromTextBool(obj.title)) {
        continue;
      }

      obj.year = searchTextForYearHelper(obj.title);
      obj.saleStatus = "Available";
      obj.listingLink = await titleElement.evaluate((el: { href: any; }) => el.href);

      await listingPage.goto(obj.listingLink);

      // Now inside the listing's page itself.

      console.log("listingPage we're at:", listingPage.url());

      const containerText = await listingPage.$eval('.ipsType_pageTitle.ipsContained_container', (el: HTMLElement) => el.innerHTML);
      console.log("container:", containerText);

      const containerArray = containerText.split("<br>", 3);
      console.log("containerArray:", containerArray);

      const price = cleanPriceHelper(containerArray[1].trim());
      const location = containerArray[2].trim();

      console.log("price:", price);
      console.log("location:", location);

      obj.price = price;
      obj.location = location;

      // console.log("now finding image CSS path");
      const imageCSSPath = ".ipsImage.ipsImage_thumbnailed";

      // console.log("now grabbing image link...");
      obj.imgLink = await listingPage.$eval(imageCSSPath, (el: { src: any; }) => el.src);

      // console.log("pushing object to objList...");
      objList.push(obj)
    }
  }

  await listingPage.close();
  await browser.close();
};

function cleanPriceHelper(price: string | number) {
  price = String(price);

  // remove currency symbols
  price = price.replace(/[\$£]/g, '');

  // remove decimal and tenths + hundredths place
  price = price.replace(/\.\d+/, '');

  // remove commas
  price = price.replace(/,/g, '');

  // k -> 000
  price = price.replace(/k/g, '000');

  price = parseInt(price);

  // check if NaN (hopefully not :) )
  if (isNaN(price)) {
    price = 0;
  }

  return price;
}

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