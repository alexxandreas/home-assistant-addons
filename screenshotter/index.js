const puppeteer = require('puppeteer');
const Router = require('@koa/router');
const Koa = require('koa');

let browser;

const startBrowser = async () => {
  console.log('Starting browser...');

  browser = await puppeteer.launch({
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--lang=en',
      '--ignore-certificate-errors'
    ],
    headless: true
  });

  console.log('Browser runing');
};


async function renderUrlToImageAsync({
  url,
  width,
  selector,
  renderingTimeout,
  renderingDelay
}) {
  let page;
  try {
    page = await browser.newPage();

    let size = {
      width,
      height: 1000
    };
  
    await page.setViewport(size);
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'load', 'networkidle0'],
      timeout: renderingTimeout
    }).catch(() => {}); // если не дождались - не падаем, продолжаем рендерить
  
    if (renderingDelay > 0) {
      await page.waitForTimeout(renderingDelay);
    }

    let data;

    const options = {
      type: 'jpeg',
    };

    if (selector) {
      await page.waitForSelector(selector, {
        timeout: 30000
      }); // дожидаемся загрузки селектора
      const element = await page.$(selector);        // объявляем переменную с ElementHandle
      data = await element.screenshot(element, options);
    } else {
      data = await page.screenshot({
        ...options,
        fullPage: true,
      });
    }
  
    return data;
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
      width:  parseInt(ctx.query.width) || 1000,
      renderingTimeout: parseInt(ctx.query.renderingTimeout) || 10000,
      renderingDelay: parseInt(ctx.query.renderingDelay) || 0
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
      ctx.body = error;
     

      ctx.app.emit('error', error, ctx);
    }
  });

  server.use(router.routes());

  server.listen(port);

  console.log(`Server listening on ${port} port`);

  return server;
};


const main = async () => {
  await startBrowser();
  
  createHttpServer();
};


main();
