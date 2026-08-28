import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://uiverse.io/KSAplay/mean-dolphin-87', { waitUntil: 'networkidle0' });
  
  const el = await page.\\#shadow-root-div-ready;
  if (el) {
    await el.screenshot({ path: 'C:/Users/pedro/.gemini/antigravity/brain/6aa1dd6f-90a3-4b77-9c82-35fd3cb6a328/uiverse_card.png' });
    console.log("Screenshot saved!");
  } else {
    console.log("Element not found");
  }
  
  await browser.close();
})();
