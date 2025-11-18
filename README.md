# Custom Scrapper (Puppeteer)

Scraper en Node.js usando Puppeteer con estructura modular para añadir scrapers. Incluye un scraper para SOIANET (SAT) que completa filtros, ejecuta la búsqueda y exporta resultados a JSON.

## Requisitos
- Node.js 18+ y npm.
- Dependencias del sistema para Chromium (Linux): libnss3, libxss1, libasound2, libatk-bridge2.0-0, libgtk-3-0, libdrm2, libgbm1, fonts-liberation (o fuentes Noto). Si tienes problemas en headless, prueba HEADLESS=false.

## Instalación
```bash
npm install
```

## Estructura del proyecto
```
custom-scrapper/
├─ src/
│  ├─ config/
│  ├─ browser/
│  ├─ scrapers/
│  │  └─ soianet.js        # Lógica del scraper SOIANET
│  ├─ parsers/
│  ├─ extractors/
│  ├─ pipelines/
│  ├─ storage/
│  └─ utils/
├─ scripts/
│  └─ run.js               # Punto de entrada (CLI)
├─ data/
│  ├─ raw/
│  └─ processed/           # Salidas JSON/archivos
├─ logs/
├─ tests/
├─ .gitignore
├─ package.json
└─ README.md
```

## .gitignore
Se ignoran node_modules, archivos .env, logs, artefactos de build, y salidas de datos (data/raw y data/processed) para evitar subir datos sensibles o voluminosos.

## Ejecución rápida
- Modo genérico (captura HTML o screenshot de una URL):
```bash
TARGET_URL="https://example.com" npm start
# Guarda screenshot por defecto. Para HTML:
SAVE_HTML=1 TARGET_URL="https://example.com" npm start
```
- Variables útiles del modo genérico:
  - HEADLESS=true|false (por defecto true)
  - WAIT_UNTIL=load|domcontentloaded|networkidle2 (por defecto networkidle2)
  - TIMEOUT=60000 (ms)
  - USER_AGENT=...
  - OUT=path/a.png, HTML_OUT=path/a.html

## Scraper SOIANET (SAT)
Página: https://aplicacionesc.mat.sat.gob.mx/SOIANET/oia_consultarap_cep.aspx

Completa:
- Input id=txtPatente
- Input id=txtDocumento
- Select id=cmbAduanas (selección por texto visible; se mapea texto→value de opción)
- Select id=cmbAnios
- Click en "Buscar" (heurística por texto del botón)
- Espera la tabla id=grdPedimentos y exporta filas a JSON.

### Ejecutar
```bash
TARGET_URL="https://aplicacionesc.mat.sat.gob.mx/SOIANET/oia_consultarap_cep.aspx" \
PATENTE=3711 DOCUMENTO=5004755 ADUANA_TEXTO="ACAPULCO, GRO." ANIO=2025 \
SCRAPER=soianet npm start
# Opcional para ver navegador:
HEADLESS=false TARGET_URL=... PATENTE=... DOCUMENTO=... ADUANA_TEXTO=... ANIO=... SCRAPER=soianet npm start
```

### Parámetros (env)
- TARGET_URL: URL de la página de consulta (requerida para ejecutar).
- SCRAPER=soianet: activa el modo SOIANET.
- PATENTE: número de patente (requerido).
- DOCUMENTO: número de documento (requerido).
- ADUANA_TEXTO: texto visible de la aduana a seleccionar (requerido; case-insensitive).
- ANIO: año a seleccionar en el combo de años (requerido actualmente).
- WAIT_UNTIL, TIMEOUT, HEADLESS, USER_AGENT: avanzados/opcionales.

### Salida
- Archivo JSON en data/processed/pedimentos-<timestamp>.json
- Estructura aproximada:
```json
{
  "meta": {
    "url": "https://.../oia_consultarap_cep.aspx",
    "patente": "3711",
    "documento": "5004755",
    "aduanaTexto": "ACAPULCO, GRO.",
    "anio": "2025",
    "count": 3
  },
  "data": [
    {
      "DOCUMENTO": "5004755",
      "PATENTE": "3711",
      "ESTADO": "DESADUANADO",
      "FECHA": "17/11/2025 12:56:31",
      "BANCO": "",
      "SECUENCIA": "2",
      "NUMERO DE OPERACION": "311476019",
      "FACTURA": "1",
      "INFORMACIÓN DEL PAGO": "NO PAGADO"
    }
  ]
}
```
Nota: Los encabezados se toman del primer renglón de la tabla; pueden variar.

## Personalización / Desarrollo
- Código principal del scraper: src/scrapers/soianet.js
  - Mapeo de aduanas: se busca opción cuyo texto visible coincida (case-insensitive) con ADUANA_TEXTO y se usa su value.
  - Select del año: se busca por texto visible igual a ANIO.
  - Botón "Buscar": se detecta por valor/texto que contenga "buscar" (ajusta si cambia el texto o es un control distinto).
- Punto de entrada CLI: scripts/run.js
  - Si SCRAPER=soianet o se definen PATENTE, DOCUMENTO y ADUANA_TEXTO, se usa runSoianet.

## Solución de problemas
- Timeout o elementos no encontrados: aumenta TIMEOUT, usa HEADLESS=false, verifica que la URL sea la de la página de consulta.
- 403/antibots: cambia USER_AGENT, añade espera, usa proxies (http(s)-proxy-agent/socks-proxy-agent), o puppeteer-extra-plugin-stealth.
- Dependencias del sistema en Linux: instala librerías y fuentes de Chromium (ver Requisitos).
- Tabla vacía: revisa filtros (patente/documento/año/aduana) y que existan resultados.

## API HTTP

Arranca el servidor:
```bash
npm run serve
# o con puerto custom
PORT=3001 npm run serve
```

Endpoint:
- GET /scrape/soianet
- Query params:
  - url: URL completa de la página de consulta (requerido)
  - patente, documento, aduanaTexto (o aduanatexto), anio (requeridos)
  - headless=true|false (opcional, default true)
  - waitUntil, timeout (opcionales)

Ejemplo:
```bash
curl "http://localhost:3000/scrape/soianet?url=https://aplicacionesc.mat.sat.gob.mx/SOIANET/oia_consultarap_cep.aspx&patente=3711&documento=5004755&aduanaTexto=NOGALES,%20SON.&anio=2025&headless=false"
```

Respuesta: JSON con { meta, data } y además se guarda archivo en data/processed/.

## Notas
- data/raw y data/processed están en .gitignore para evitar subir datos sensibles/voluminosos.
- Este proyecto es educativo; respeta términos de uso del sitio y límites legales.

---
Última actualización: 2025-11-18T01:17:29.139Z
