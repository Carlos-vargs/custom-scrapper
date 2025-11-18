"use strict";

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { runSoianet } = require("../src/scrapers/soianet");
const browserFetcher = puppeteer.createBrowserFetcher();
const revisionInfo = browserFetcher.revisionInfo("chrome");
const executablePath = revisionInfo.executablePath;

const url = process.argv[2] || process.env.TARGET_URL || "https://example.com";
const headless = process.env.HEADLESS !== "false";
const outScreenshot =
  process.env.OUT || `data/processed/screenshot-${Date.now()}.png`;
const outHtml = process.env.HTML_OUT || "data/processed/page.html";
const waitUntil = process.env.WAIT_UNTIL || "networkidle2";
const timeout = Number(process.env.TIMEOUT || 60000);

(async () => {
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    process.env.USER_AGENT ||
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) PuppeteerScraper/1.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil, timeout });

  // Modo especial para SOIANET si se proporcionan variables requeridas
  if (
    process.env.SCRAPER === "soianet" ||
    (process.env.PATENTE && process.env.DOCUMENTO && process.env.ADUANATEXTO)
  ) {
    await browser.close(); // cerraremos este browser y abrimos uno nuevo dentro de runSoianet para simplicidad
    const browser2 = await puppeteer.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
    });
    await runSoianet(browser2, {
      url,
      patente: process.env.PATENTE,
      documento: process.env.DOCUMENTO,
      aduanaTexto: process.env.ADUANATEXTO,
      anio: process.env.ANIO,
      waitUntil,
      timeout,
      outDir: "data/processed",
    });
    await browser2.close();
  } else {
    fs.mkdirSync(
      path.dirname(process.env.SAVE_HTML === "1" ? outHtml : outScreenshot),
      { recursive: true }
    );
    if (process.env.SAVE_HTML === "1") {
      const html = await page.content();
      fs.writeFileSync(outHtml, html);
      console.log(`HTML saved -> ${outHtml}`);
    } else {
      await page.screenshot({ path: outScreenshot, fullPage: true });
      console.log(`Screenshot saved -> ${outScreenshot}`);
    }
  }

  await browser.close();
})().catch((err) => {
  console.error("Scrape failed:", err.message);
  process.exit(1);
});

/*
Usage:
  node scripts/run.js https://example.com
  TARGET_URL=https://example.com npm start
Env:
  HEADLESS=false SAVE_HTML=1 OUT=path/to/file.png HTML_OUT=path/to/file.html WAIT_UNTIL=networkidle2 TIMEOUT=60000 USER_AGENT=...
*/
