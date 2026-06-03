const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('https://barn-manager-eight.vercel.app', { waitUntil: 'load' });
  try {
     await page.waitForSelector('#root > div', { timeout: 10000 });
  } catch(e) {
     console.log('Timeout waiting for #root to populate');
  }
  const html = await page.evaluate(() => document.querySelector('#root').innerHTML);
  console.log('ROOT HTML CONTENT:', html.substring(0, 500));
  await browser.close();
})();
