import puppeteer from 'puppeteer';
import Router from '@koa/router';
import Koa from 'koa';
import {serializeError} from 'serialize-error';

let browser;
let browserInactivityTimer;

// Время бездействия браузера перед закрытием (в миллисекундах)
const BROWSER_INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 минут

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));


const startBrowser = async () => {
  // Если браузер уже запущен, не запускаем повторно
  if (browser && browser.connected) {
    console.log('Browser already running');
    return;
  }

  console.log('Starting browser...');

  browser = await puppeteer.launch({
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--lang=en',
      '--ignore-certificate-errors',
      // Добавить эти параметры для снижения нагрузки:
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-extensions',
      '--disable-sync',
      '--disable-default-apps'
    ],
    headless: true,

    // debug
    // headless: false,
    // slowMo: 250,
  });

  console.log('Browser running');
};

// Функция для обеспечения работы браузера
const ensureBrowserRunning = async (timeout) => {
  if (!browser || !browser.connected) {
    await startBrowser();
  }
  resetBrowserInactivityTimer(timeout);
};

// Функция для сброса таймера бездействия браузера
const resetBrowserInactivityTimer = (timeout) => {
  // Очищаем предыдущий таймер
  if (browserInactivityTimer) {
    clearTimeout(browserInactivityTimer);
  }

  // Устанавливаем новый таймер
  browserInactivityTimer = setTimeout(async () => {
    await stopBrowserIfInactive();
  }, BROWSER_INACTIVITY_TIMEOUT + timeout);
};

// Функция для закрытия браузера при бездействии
const stopBrowserIfInactive = async () => {
  if (browser && browser.connected) {
    console.log('Closing inactive browser...');
    await browser.close();
    browser = null;
    console.log('Browser closed due to inactivity');
  }
};


async function renderUrlToImageAsync({
  url,
  width,
  height,
  selector,
  renderingTimeout,
  renderingDelay
}) {
  const fullTimeout = renderingDelay + renderingTimeout + (selector ? 30000 : 0);
  // Убеждаемся, что браузер запущен и сбрасываем таймер бездействия
  await ensureBrowserRunning(fullTimeout);
  
  let page;
  try {
    page = await browser.newPage();

    let size = {
      width,
      height
    };
  
    await page.setViewport(size);
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'load', 'networkidle0'],
      timeout: renderingTimeout
    }).catch(() => {}); // если не дождались - не падаем, продолжаем рендерить
  
    if (renderingDelay > 0) {
      await sleep(renderingDelay);
    }

    let data;

    const options = {
      type: 'jpeg',
      captureBeyondViewport: false
    };

    if (selector) {
      await page.waitForSelector(selector, {
        timeout: 30000
      }); // дожидаемся загрузки селектора
      const element = await page.$(selector);        // объявляем переменную с ElementHandle
      data = await element.screenshot(options);
      // data = await element.screenshot(element, options);
    } else {
      data = await page.screenshot({
        ...options,
        fullPage: true,
      });
    }
  
    return Buffer.from(data, 'base64');
    // return data;
  } finally {
    await page.close();
  }
}

const createHttpServer = () => {
  
  const port = 80;

  const server = new Koa();

  const router = new Router({ prefix: '/' });

  router.get('/', async (ctx) => {
    const params = {
      url: ctx.query.url,
      selector: ctx.query.selector,
      width: parseInt(ctx.query.width) || 1000,
      height: parseInt(ctx.query.height) || 1000,
      renderingTimeout: parseInt(ctx.query.renderingTimeout) || 10000,
      renderingDelay: parseInt(ctx.query.renderingDelay) || 1000
    };

    console.log('Rendering...', JSON.stringify(params));

    try {
      const data = await renderUrlToImageAsync(params);

      ctx.set('Content-Type', 'image/jpeg');
      ctx.body = data;

      console.log('Successfully rendered');
    } catch (error) {
      console.error(error);
      ctx.status = 500;
      ctx.body = serializeError(error);

      ctx.app.emit('error', error, ctx);
    }
  });

  server.use(router.routes());

  server.listen(port);

  console.log(`Server listening on ${port} port`);

  return server;
};


const main = async () => {
  // Браузер теперь запускается только при необходимости
  console.log('Server starting... Browser will start on first request');
  
  createHttpServer();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    if (browserInactivityTimer) {
      clearTimeout(browserInactivityTimer);
    }
    if (browser && browser.connected) {
      await browser.close();
    }
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (browserInactivityTimer) {
      clearTimeout(browserInactivityTimer);
    }
    if (browser && browser.connected) {
      await browser.close();
    }
    process.exit(0);
  });
};


main();
