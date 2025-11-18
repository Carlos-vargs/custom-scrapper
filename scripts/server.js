"use strict";
const express = require("express");
const puppeteer = require("puppeteer");
const { runSoianet } = require("../src/scrapers/soianet");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/scrape/soianet", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const url = req.query.url || process.env.TARGET_URL;
    const patente = req.query.patente || process.env.PATENTE;
    const documento = req.query.documento || process.env.DOCUMENTO;
    const aduanaTexto =
      req.query.aduanaTexto ||
      req.query.aduanatexto ||
      process.env.ADUANA_TEXTO ||
      process.env.ADUANATEXTO;
    const anio = req.query.anio || process.env.ANIO;

    if (!url) return res.status(400).json({ error: "Missing url" });
    if (!patente || !documento || !aduanaTexto || !anio) {
      return res.status(400).json({
        error: "Missing params: patente, documento, aduanaTexto, anio",
      });
    }

    const headless =
      (req.query.headless ?? process.env.HEADLESS ?? "true") !== "false";
    const waitUntil =
      req.query.waitUntil || process.env.WAIT_UNTIL || "networkidle2";
    const timeout = Number(req.query.timeout || process.env.TIMEOUT || 60000);

    const browser = await puppeteer.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const data = await runSoianet(browser, {
      url,
      patente,
      documento,
      aduanaTexto,
      anio,
      waitUntil,
      timeout,
      outDir: "data/processed",
    });
    await browser.close();

    return res.json({
      meta: {
        url,
        patente,
        documento,
        aduanaTexto,
        anio,
        count: data.length,
        ts: new Date().toISOString(),
      },
      data,
    });
  } catch (err) {
    console.error("HTTP scrape error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper HTTP server listening on http://0.0.0.0:${PORT}`);
});
