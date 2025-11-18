"use strict";
const fs = require("fs");
const path = require("path");

async function scrapeSoianet(page, { patente, documento, aduanaTexto, anio }) {
  console.log("[scrapeSoianet] Recibido:", {
    patente,
    documento,
    aduanaTexto,
    anio,
  });
  if (!patente || !documento || !aduanaTexto || !anio) {
    throw new Error("Faltan datos: patente, documento, aduanaTexto, anio");
  }

  // Esperar inputs
  await page.waitForSelector("#txtPatente", { timeout: 30000 });
  await page.waitForSelector("#txtDocumento", { timeout: 30000 });
  await page.waitForSelector("#cmbAduanas", { timeout: 30000 });
  await page.waitForSelector("#cmbAnios", { timeout: 30000 }).catch(() => {}); // por si tarda

  // Rellenar patente y documento
  await page.evaluate(() => {
    const p = document.querySelector("#txtPatente");
    const d = document.querySelector("#txtDocumento");
    if (p) p.value = "";
    if (d) d.value = "";
  });
  await page.type("#txtPatente", String(patente));
  await page.type("#txtDocumento", String(documento));

  // Seleccionar aduana por texto (case-insensitive)
  const aduanaValue = await page.evaluate((text) => {
    const sel = document.querySelector("#cmbAduanas");
    if (!sel) return null;
    const opt = Array.from(sel.options).find(
      (o) => o.textContent.trim().toLowerCase() === text.trim().toLowerCase()
    );
    return opt ? opt.value : null;
  }, aduanaTexto);
  if (!aduanaValue)
    throw new Error("Aduana no encontrada para texto: " + aduanaTexto);
  await page.select("#cmbAduanas", aduanaValue);

  // Seleccionar año
  const anioValue = await page.evaluate((anioIn) => {
    const sel = document.querySelector("#cmbAnios");
    if (!sel) return null;
    const opt = Array.from(sel.options).find(
      (o) => o.textContent.trim() === String(anioIn)
    );
    return opt ? opt.value : null;
  }, anio);
  if (anioValue) {
    await page.select("#cmbAnios", anioValue);
  }

  // Click en botón Buscar (heurística)
  const clicked = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll("input[type=submit], button")
    );
    const btn = candidates.find((b) =>
      /buscar/i.test(b.value || b.textContent)
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (!clicked) console.warn("Botón Buscar no encontrado por heurística");

  // Esperar tabla de resultados
  await page.waitForSelector("#grdPedimentos", { timeout: 60000 });

  // Extraer datos
  const rows = await page.evaluate(() => {
    const table = document.querySelector("#grdPedimentos");
    if (!table) return [];
    const trs = Array.from(table.querySelectorAll("tr"));
    if (trs.length < 2) return [];
    const headerCells = Array.from(trs[0].querySelectorAll("td,th")).map((c) =>
      c.textContent.trim()
    );
    const dataRows = trs.slice(1).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td")).map(
        (c) => c.textContent.trim() || null
      );
      const obj = {};
      headerCells.forEach((h, i) => {
        obj[h || "col" + i] = cells[i] ?? null;
      });
      return obj;
    });
    return dataRows.filter((r) => Object.values(r).some((v) => v));
  });

  return rows;
}

async function runSoianet(browser, params) {
  console.log("[runSoianet] Parámetros recibidos:", params);
  const page = await browser.newPage();
  await page.setUserAgent(
    params.userAgent ||
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) SoianetScraper/1.0 Safari/537.36"
  );
  await page.goto(params.url, {
    waitUntil: params.waitUntil || "networkidle2",
    timeout: params.timeout || 60000,
  });
  console.log("[runSoianet] Llamando a scrapeSoianet...");
  const data = await scrapeSoianet(page, params);
  const outDir = params.outDir || "data/processed";
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `pedimentos-${Date.now()}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        meta: {
          url: params.url,
          patente: params.patente,
          documento: params.documento,
          aduanaTexto: params.aduanaTexto,
          anio: params.anio,
          count: data.length,
        },
        data,
      },
      null,
      2
    )
  );
  console.log("Datos guardados -> " + outFile);
  return data;
}

module.exports = { scrapeSoianet, runSoianet };
