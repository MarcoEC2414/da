/**
 * Prueba de conexión real a la AWS Price List API (GetProducts / DescribeServices / GetAttributeValues).
 * Script independiente de la app. Lee credenciales de backend/.env vía `node --env-file`.
 *
 * Uso (desde la raíz del repo):
 *   node --env-file=backend/.env backend/scripts/probarAws.mjs
 *
 * Jamás imprime credenciales: se redactan antes de cualquier salida.
 */
import { PricingClient, DescribeServicesCommand, GetAttributeValuesCommand, GetProductsCommand } from '@aws-sdk/client-pricing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGION = 'us-east-1';
const SERVICE_CODE = 'AmazonEC2';

/* ------------------------------------------------------------------ */
/* Redacción de secretos                                               */
/* ------------------------------------------------------------------ */
const SECRETS = [process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY].filter(Boolean);

function redact(text) {
  let s = String(text ?? '');
  s = s.replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED]');
  for (const secret of SECRETS) {
    if (secret) s = s.split(secret).join('[REDACTED]');
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
async function run(opName, fn) {
  const t0 = Date.now();
  try {
    const res = await fn();
    const ms = Date.now() - t0;
    return { opName, status: 'ok', ms, requestId: res?.$metadata?.requestId ?? null, result: res };
  } catch (err) {
    const ms = Date.now() - t0;
    return { opName, status: 'error', ms, error: err };
  }
}

function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function errorCode(err) {
  const raw = err?.name ?? err?.code ?? 'Error';
  return String(raw).replace(/Error$/, '');
}

function explainError(err) {
  const code = errorCode(err).toLowerCase();
  if (code.includes('invalidclienttokenid')) {
    return 'Causa probable: las credenciales de acceso son inválidas o fueron rotadas (AWS_ACCESS_KEY_ID no reconocido).';
  }
  if (code.includes('signaturedoesnotmatch') || code.includes('unrecognizedclient')) {
    return 'Causa probable: el AWS_SECRET_ACCESS_KEY no corresponde al AWS_ACCESS_KEY_ID provisto.';
  }
  if (code.includes('expiredtoken')) {
    return 'Causa probable: las credenciales están caducadas.';
  }
  if (code.includes('accessdenied')) {
    return 'Causa probable: falta permiso. Revisa que la política PreciosSoloLectura-CloudCalc esté adjunta al usuario IAM y que sus tres acciones estén bien escritas: pricing:DescribeServices, pricing:GetAttributeValues, pricing:GetProducts.';
  }
  if (code.includes('validationexception') || code.includes('invalidparameter')) {
    return `Causa probable: parámetros o filtros no válidos: ${redact(err?.message ?? '')}`;
  }
  if (code === 'econnreset' || code === 'enetunreach' || code === 'timeouterror' || code.includes('econn')) {
    return 'Causa probable: error de red. La Pricing API solo existe en us-east-1 y ap-south-1; verifica la región del endpoint y la conexión a internet.';
  }
  return `Causa probable: ${redact(err?.message ?? code)}`;
}

function printResult(r) {
  console.log(`operación: ${r.opName}`);
  console.log(`estado: ${r.status}`);
  console.log(`duración: ${r.ms} ms`);
  if (r.status === 'ok') {
    console.log(`requestId: ${r.requestId ?? 'n/d'}`);
  } else {
    console.log(`requestId: ${r.error?.$metadata?.requestId ?? 'n/d'}`);
    console.log(`código: ${redact(errorCode(r.error))}`);
    console.log(explainError(r.error));
  }
  console.log('');
}

/* ------------------------------------------------------------------ */
/* Llamada 1: DescribeServices (paginado)                              */
/* ------------------------------------------------------------------ */
async function describeAllServices(client, pageCap = 10) {
  const services = [];
  let nextToken;
  let pages = 0;
  let lastRequestId;
  do {
    const res = await client.send(
      new DescribeServicesCommand({ FormatVersion: 'aws_v1', NextToken: nextToken, MaxResults: 100 }),
    );
    lastRequestId = res?.$metadata?.requestId;
    services.push(...(res.Services ?? []));
    nextToken = res.NextToken;
    pages += 1;
  } while (nextToken && pages < pageCap);
  return { services, pages, lastRequestId };
}

/* ------------------------------------------------------------------ */
/* Llamada 3: extracción de precios on-demand                          */
/* ------------------------------------------------------------------ */
function onDemandPrices(product) {
  const od = product?.terms?.OnDemand;
  const out = [];
  if (!od) return out;
  for (const offerKey of Object.keys(od)) {
    const dims = od[offerKey]?.priceDimensions ?? {};
    for (const dimKey of Object.keys(dims)) {
      const d = dims[dimKey];
      out.push({
        unit: d.unit ?? null,
        description: d.description ?? null,
        pricePerUnitUsd: d.pricePerUnit?.USD ?? null,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Llamada 2 y 3: payloads                                             */
/* ------------------------------------------------------------------ */
async function main() {
  console.log(`PricingClient región: ${REGION} | service: ${SERVICE_CODE}\n`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('ERROR: no se encontraron AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY en el entorno (backend/.env). No se imprimirá ninguno de sus valores.');
    process.exitCode = 1;
    return;
  }

  const client = new PricingClient({ region: REGION });

  /* 1) DescribeServices -------------------------------------------------- */
  const ds = await run('DescribeServices', () => describeAllServices(client));
  printResult({ ...ds, requestId: ds.result?.lastRequestId ?? null });
  if (ds.status === 'ok') {
    const codes = (ds.result.services ?? []).map((s) => s.ServiceCode);
    console.log(`servicios devueltos: ${codes.length} (páginas consultadas: ${ds.result.pages})`);
    for (const wanted of ['AmazonEC2', 'AmazonRDS', 'AmazonS3']) {
      console.log(`  ${wanted}: ${codes.includes(wanted) ? 'presente ✓' : 'AUSENTE ✗'}`);
    }
    console.log('');
  }

  /* 2) GetAttributeValues: instanceType de AmazonEC2 ---------------------- */
  const av = await run('GetAttributeValues', () =>
    client.send(
      new GetAttributeValuesCommand({ ServiceCode: SERVICE_CODE, AttributeName: 'instanceType', MaxResults: 25 }),
    ),
  );
  printResult(av);
  if (av.status === 'ok') {
    const values = (av.result.AttributeValues ?? []).map((v) => v.Value);
    console.log(`valores devueltos: ${values.length}`);
    console.log(`primeros: ${values.join(', ')}`);
    console.log('');
  }

  /* 3) GetProducts: t3.micro on-demand shared Linux, N. Virginia ---------- */
  const filters = [
    { Type: 'TERM_MATCH', Field: 'instanceType', Value: 't3.micro' },
    { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
    { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
    { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
    { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
    { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' },
  ];
  const gp = await run('GetProducts', () =>
    client.send(new GetProductsCommand({ ServiceCode: SERVICE_CODE, Filters: filters, FormatVersion: 'aws_v1' })),
  );
  printResult(gp);

  if (gp.status === 'ok') {
    const priceList = gp.result.PriceList ?? [];
    console.log(`productos devueltos: ${priceList.length}`);
    const firstRaw = priceList[0];
    const first = firstRaw ? JSON.parse(firstRaw) : null;
    if (first) {
      const attrs = first.product?.attributes ?? {};
      const wantedAttrs = [
        'instanceType', 'location', 'operatingSystem', 'tenancy',
        'preInstalledSw', 'capacitystatus', 'vcpu', 'memory',
        'currentGeneration', 'usagetype', 'operation', 'servicecode',
      ];
      console.log('primera coincidencia:');
      console.log(`  sku: ${first.product?.sku ?? 'n/d'}`);
      for (const key of wantedAttrs) {
        if (attrs[key] !== undefined) console.log(`  ${key}: ${JSON.stringify(attrs[key])}`);
      }
      const prices = onDemandPrices(first);
      console.log('  on-demand (USD):');
      if (prices.length === 0) {
        console.log('    (sin términos OnDemand en esta coincidencia)');
      }
      for (const p of prices) {
        console.log(`    ${p.unit ?? '?'}: ${p.pricePerUnitUsd ?? 'n/d'} USD — ${p.description ?? ''}`);
      }
      const hourly = prices.find((p) => p.unit === 'Hrs') ?? prices[0];
      if (hourly && hourly.pricePerUnitUsd) {
        console.log(`  → precio por hora (on-demand): ${hourly.pricePerUnitUsd} USD (${hourly.unit})`);
      }

      /* Evidencia ---------------------------------------------------------- */
      const evidenceDir = join(fileURLToPath(new URL('../', import.meta.url)), '..', 'docs', 'evidencia');
      mkdirSync(evidenceDir, { recursive: true });
      const evidenceFile = join(evidenceDir, `aws-getproducts-${stamp()}.json`);
      writeFileSync(
        evidenceFile,
        JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            region: REGION,
            serviceCode: SERVICE_CODE,
            filters,
            productCount: priceList.length,
            sampleRaw: firstRaw,
            sampleParsed: first,
          },
          null,
          2,
        ),
      );
      console.log(`\nevidencia guardada: ${evidenceFile}`);
    } else {
      console.log('sin coincidencias para los filtros indicados (posible variación de atributos en la nube de precios).');
    }
  }

  await client.destroy();
}

main().catch((err) => {
  console.error('Error inesperado:', redact(err?.message ?? err));
  process.exitCode = 1;
});