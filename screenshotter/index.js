const config = require('./config');
const path = require('path');
const http = require('http');
const https = require('https');
const { promises: fs } = require('fs');
const fsExtra = require('fs-extra');
const puppeteer = require('puppeteer');
const { CronJob } = require('cron');
const gm = require('gm');

// keep state of current battery level and whether the device is charging
const batteryStore = {};

let browser;

const startBrowser = async () => {
  console.log('Starting browser...');

  browser = await puppeteer.launch({
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      `--lang=${config.language}`,
      config.ignoreCertificateErrors && '--ignore-certificate-errors'
    ].filter((x) => x),
    headless: config.debug !== true
  });

  // console.log(`Visiting '${config.baseUrl}' to login...`);
  // let page = await browser.newPage();
  // await page.goto(config.baseUrl, {
  //   timeout: config.renderingTimeout
  // });

  // const hassTokens = {
  //   hassUrl: config.baseUrl,
  //   access_token: config.accessToken,
  //   token_type: 'Bearer'
  // };

  // console.log('Adding authentication entry to browser\'s local storage...');
  // await page.evaluate(
  //   (hassTokens, selectedLanguage) => {
  //     localStorage.setItem('hassTokens', hassTokens);
  //     localStorage.setItem('selectedLanguage', selectedLanguage);
  //   },
  //   JSON.stringify(hassTokens),
  //   JSON.stringify(config.language)
  // );

  // page.close();
};


async function renderUrlToImageAsync({
  url,
  width = 800,
  selector
}) {
  // async function renderUrlToImageAsync(browser, pageConfig, url, path) {
  let page;
  try {
    page = await browser.newPage();
    // await page.emulateMediaFeatures([
    //   {
    //     name: 'prefers-color-scheme',
    //     value: 'light'
    //   }
    // ]);
  
    let size = {
      width,
      height: 1000
      // width: Number(pageConfig.renderingScreenSize.width),
      // height: Number(pageConfig.renderingScreenSize.height)
    };
  
    // if (pageConfig.rotation % 180 > 0) {
    //   size = {
    //     width: size.height,
    //     height: size.width
    //   };
    // }
  
    await page.setViewport(size);
    // const startTime = new Date().valueOf();
    // await page.goto('https://www.google.com/', {
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'load', 'networkidle0'],
      timeout: 5000
      // timeout: config.renderingTimeout
    });
  
    // const navigateTimespan = new Date().valueOf() - startTime;
    // await page.waitForSelector('home-assistant', {
    //   timeout: Math.max(config.renderingTimeout - navigateTimespan, 1000)
    // });
  
    // await page.addStyleTag({
    //   content: `
    //     body {
    //       width: calc(${size.width}px / ${pageConfig.scaling});
    //       height: calc(${size.height}px / ${pageConfig.scaling});
    //       transform-origin: 0 0;
    //       transform: scale(${pageConfig.scaling});
    //       overflow: hidden;
    //     }`
    // });
  
    // if (pageConfig.renderingDelay > 0) {
    //   await page.waitForTimeout(pageConfig.renderingDelay);
    // }

    let target = page;

    if (selector) {
      await page.waitForSelector(selector);          // дожидаемся загрузки селектора
      const element = await page.$(selector);        // объявляем переменную с ElementHandle
      target = element;
    }
    
    const data = await target.screenshot({
      // path: 'output/cover.png',
      // path,
      type: 'jpeg',
      fullPage: true,
      // clip: {
      //   x: 0,
      //   y: 0,
      //   ...size
      // }
    });

    return data;
  } catch (e) {
    console.error('Failed to render', e);
  } finally {
    // if (config.debug === false) {
    await page.close();
    // }
  }
}

const createHttpServer = () => {
  const httpServer = http.createServer(async (request, response) => {
    // Parse the request
    const requesrUrl = new URL(request.url, `http://${request.headers.host}`);
    // Check the page number
    // const pageNumberStr = url.pathname;
    // console.log('getting:');
    // console.dir(url);
    // console.log('query:');
    // console.dir(url.qerry);
    const url = requesrUrl.searchParams.get('url');
    const selector = requesrUrl.searchParams.get('selector') || undefined;
    const width = parseInt(requesrUrl.searchParams.get('width')) || 1000;
    
    const params = {
      url,
      selector,
      width
    };
    console.log('query:');
    console.dir(params);

    // and get the battery level, if any
    // (see https://github.com/sibbl/hass-lovelace-kindle-screensaver/README.md for patch to generate it on Kindle)
    // const batteryLevel = parseInt(url.searchParams.get('batteryLevel'));
    // const isCharging = url.searchParams.get('isCharging');
    // const pageNumber =
    //   pageNumberStr === '/' ? 1 : parseInt(pageNumberStr.substr(1));
    // if (
    //   isFinite(pageNumber) === false ||
    //   pageNumber > config.pages.length ||
    //   pageNumber < 1
    // ) {
    //   console.log(`Invalid request: ${request.url} for page ${pageNumber}`);
    //   response.writeHead(400);
    //   response.end('Invalid request');
    //   return;
    // }
    try {
      // Log when the page was accessed
      // const n = new Date();
      // console.log(`${n.toISOString()}: Image ${pageNumber} was accessed`);

      // const pageIndex = pageNumber - 1;
      // const configPage = config.pages[pageIndex];

      // const data = await fs.readFile(configPage.outputPath);
      // const stat = await fs.stat(configPage.outputPath);

      const data = await renderUrlToImageAsync(params);

      // const lastModifiedTime = new Date(stat.mtime).toUTCString();

      response.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': Buffer.byteLength(data),
        // 'Last-Modified': lastModifiedTime
      });
      response.end(data);
      // response.end('hello');

      // let pageBatteryStore = batteryStore[pageIndex];
      // if (!pageBatteryStore) {
      //   pageBatteryStore = batteryStore[pageIndex] = {
      //     batteryLevel: null,
      //     isCharging: false
      //   };
      // }
      // if (!isNaN(batteryLevel) && batteryLevel >= 0 && batteryLevel <= 100) {
      //   if (batteryLevel !== pageBatteryStore.batteryLevel) {
      //     pageBatteryStore.batteryLevel = batteryLevel;
      //     console.log(
      //       `New battery level: ${batteryLevel} for page ${pageNumber}`
      //     );
      //   }

      //   if (
      //     (isCharging === 'Yes' || isCharging === '1') &&
      //     pageBatteryStore.isCharging !== true) {
      //     pageBatteryStore.isCharging = true;
      //     console.log(`Battery started charging for page ${pageNumber}`);
      //   } else if (
      //     (isCharging === 'No' || isCharging === '0') &&
      //     pageBatteryStore.isCharging !== false
      //   ) {
      //     console.log(`Battery stopped charging for page ${pageNumber}`);
      //     pageBatteryStore.isCharging = false;
      //   }
      // }
    } catch (e) {
      console.error(e);
      response.writeHead(404);
      response.end('Image not found');
    }
  });

  const port = 80;
  httpServer.listen(port, () => {
    console.log(`Server is running at ${port}`);
  });
};


const main = async () => {
  await startBrowser();
  

  // if (config.debug) {
  //   console.log(
  //     'Debug mode active, will only render once in non-headless model and keep page open'
  //   );
  //   renderAndConvertAsync(browser);
  // } else {
  // console.log('Starting first render...');
  // renderAndConvertAsync(browser);
  // console.log('Starting rendering cronjob...');
  // new CronJob({
  //   cronTime: config.cronJob,
  //   onTick: () => renderAndConvertAsync(browser),
  //   start: true
  // });
  // }

  createHttpServer();
};


main();
// (async function run() {
//   console.log('run');
//   await main();
// })();
