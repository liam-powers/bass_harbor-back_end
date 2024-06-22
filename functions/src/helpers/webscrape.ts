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

async function scrapeData(toScrape: { talkBass?: boolean, scrapeBassChatData?: boolean }) {
  await initializeBrowser();
  if (toScrape.talkBass === true) { // scrape TalkBass data
    console.log("scraping talkbass data...");
    await scrapeTalkBassData();
  }

  if (toScrape.scrapeBassChatData === true) { // scrape BassChat data
    console.log("scraping basschat data...");
    await scrapeBassChatData();
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

  for (let i = 1; i <= 2; i++) { // TODO: change numPages to 2 for testing.
    await page.goto(`https://www.talkbass.com/forums/for-sale-double-basses.144/page-${i}?prefix_id=1`);
    await page.waitForSelector('.discussionListItems .discussionListItem.visible.prefix1', { timeout: 2000 });
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
  let numPages = await page.$eval("#elPagination_3fcf29aff7d7fd8443bcbfa987fae6df_511348068_jump", (el: { textContent: any; }) => el.textContent);
  const numPagesRegex = /\d+\s*(?=[^\d]*$)/;
  numPages = parseInt(numPages.match(numPagesRegex));

  console.log("number of pages obtained to be: ", numPages);

  for (let i = 1; i <= numPages; i++) {
    await page.goto(`https://www.basschat.co.uk/forum/76-eubs-double-basses-for-sale/page/${i}/`);
    const bassListings = await page.$$(`#elTable_bd0f2e36c2f880b844ef65db849f2f62 > li:nth-child(2) > div.ipsDataItem_main`);
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

      /*
      obj.notForSale = await thread.$eval("h4 > span:nth-child(1) > i")
        .then(() => { })
        .catch(() => { console.log("Identified an object still for sale.") });
      */

      obj.title = await thread.$eval("h4 > span > span", (el: { textContent: any; }) => el.textContent);
      obj.listingLink = await thread.$eval('h4 > span > a', (el: { href: any; }) => el.href);
      // const imgRef = await thread.$eval('div.listBlock.posterAvatar > span > a > img', el => el.style.getPropertyValue('background-image'))
      // obj.imgLink = 'https://www.talkbass.com/' + imgRef.slice(5, (imgRef.length - 2));

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
};

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

module.exports = scrapeData;