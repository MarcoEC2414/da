# Integración con la AWS Price List API (EC2 On-Demand real)

> Fase 2 · Fecha de corte de esta documentación: 2026-10-07
> Estado: **implementada y verificada en vivo** (solo lectura; sin aprovisionamiento).

La cotización de **Amazon EC2 (On-Demand)** usa precios **reales** obtenidos de la
AWS Price List API. El resto de servicios del catálogo (RDS, S3, Lambda, DynamoDB,
SNS, CloudFront, Route 53) siguen usando el catálogo de referencia simulado en
`shared/awsRates.json`.

## Principios

- **Solo lectura**: `GetProducts` / `GetAttributeValues`; jamás se crean instancias ni recursos.
- **Credenciales solo backend**: el frontend nunca conoce credenciales; consulta al backend.
- **Sin precios inventados**: si una combinación región + instancia + SO no tiene producto,
  la API responde `CONFIGURATION_NOT_FOUND` (la UI muestra "Configuración no disponible"
  solo para ese servicio).
- **Sin fallbacks silenciosos**: ni simulación de precios EC2 en producción, ni mapeo SUSE→Linux.
- **SUSE es real**: el atributo `operatingSystem` de AWS incluye el valor `"SUSE"` (verificado
  con `GetAttributeValues`); se cotiza con su propio SKU (p. ej. `BC2SFDXEPX53FCV2`).

## Cómo funciona

### Backend

`backend/src/aws/awsLivePricing.ts`:

1. Cliente `PricingClient` diferido (`lazy`) en `us-east-1` (la Pricing API solo se
   publica en `us-east-1` y `ap-south-1`; el recurso consultado se elige con el filtro `location`).
2. `ec2LocationOf(regionId)` devuelve el **location exacto** de la API:
   - **Override** de 7 regiones cuyo display difiere del location real
     (verificado con `GetAttributeValues(location)` el 2026-10-07):
     `eu-west-1 → "EU (Ireland)"`, `eu-west-2 → "EU (London)"`,
     `eu-west-3 → "EU (Paris)"`, `eu-central-1 → "EU (Frankfurt)"`,
     `eu-central-2 → "Europe (Zurich)"`, `eu-north-1 → "EU (Stockholm)"`,
     `eu-south-1 → "EU (Milan)"`.
   - **ASCII**: se eliminan diacríticos (p. ej. `"South America (São Paulo)"` →
     `"South America (Sao Paulo)"`), porque la API rechaza caracteres no-ASCII.
3. `GetProductsCommand` con 6 filtros `TERM_MATCH`: `instanceType`, `location`,
   `operatingSystem`, `tenancy=Shared`, `preInstalledSw=NA`, `capacitystatus=Used`.
4. Normalización del `PriceList`: el SDK reciente devuelve cada elemento como un
   `String` en caja (o directamente como objeto); versiones antiguas devolvían strings JSON.
   `parseEc2ProductPayload` acepta los tres casos.
5. Se extrae `terms.OnDemand[offer].priceDimensions` con `unit == "Hrs"` y `pricePerUnit.USD`.
6. **Caché en memoria** compartida (`estimate` + `regions`), TTL 30 minutos, con
   `cacheStatus: HIT | MISS` y estadísticas (`cacheHits`, `realRequests`).
7. Errores tipados `Ec2PricingError`: `CONFIGURATION_NOT_FOUND` (404) y
   `AWS_UNAVAILABLE` (503). Los logs se sanitizan (`redactMessage`); nunca se devuelve
   un secreto al cliente.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/aws/ec2/estimate` | Cotiza UNA instancia en UNA región. Cuerpo: `{ instanceType, region, operatingSystem, quantity, hoursPerMonth }`. Respuesta con `pricePerHour`, `monthlyEstimate`, `sku`, `retrievedAt`, `cacheStatus`, `source: "AWS Price List API"`. Cabecera `X-Cache: HIT|MISS`. |
| POST | `/api/aws/ec2/regions` | Comparación real por región (las 28). Cuerpo igual sin `region`. Por región: `available`, `unavailableReason`, `pricePerHour`, `monthlyEstimate`, `cacheStatus`, `source`. Concurrencia limitada (6) para no castigar la API. La primera llamada es `MISS` (consulta real); las repetidas son `HIT` (caché). |

Ambas rutas **no** pasan por `simulateNetwork` (sin latencia simulada).

### Frontend

- `frontend/src/pricing/HttpPricingProvider.ts`:
  - `getQuote` con servicio `kind === 'ec2'` → `POST /api/aws/ec2/estimate` (mapea `os` del
    formulario a `operatingSystem`, `instanceCount` → `quantity`, `regionId` → `region`).
  - `getRegionQuotes` → combina **EC2 real** (`/api/aws/ec2/regions`) con el **catálogo de
    referencia** de los restantes servicios (`/pricing/regions`).
- `types/pricing.ts`: `ServiceQuote.aws?: AwsQuoteMeta` (metadatos de la cotización real) y
  `RegionQuote` ampliado con `source`, `cacheStatus`, `unavailableReason`.
- Estados de cotización: `no-data` (catálogo), `no-data-config` (combinación EC2 inexistente),
  `aws-unavailable` (la API no respondió). En la tabla de resultados:
  - badge **Configuración no disponible** para `no-data-config`;
  - botón **AWS no disponible · reintentar** para `aws-unavailable`;
  - en filas EC2 con precio real, una línea discreta
    `AWS Price List API · Actualizado: <fecha/hora>` con badge **AWS LIVE** (MISS) o **CACHE AWS** (HIT).
- Mapa de regiones: badge **AWS LIVE / CACHE AWS** cuando el total incluye EC2 real; el tooltip
  indica el origen ("Precio real AWS · consulta en vivo / desde caché" o "Cuenta de referencia simulada").

## Consideraciones de coste y límites (solo lectura)

- El cliente usa `us-east-1`; el filtro `location` selecciona la región del recurso.
- La caché (30 min) evita repetir consultas al abrir el mapa varias veces.
- La concurrencia del mapa está limitada a `EC2_REGIONS_CONCURRENCY = 6` por oleadas.
- Si TODAS las regiones fallan se responde `503 AWS_UNAVAILABLE`; si falla una sola región,
  esa región se reporta con `unavailableReason: "aws-error"` y `available: false`
  (no se inventa ningún precio).

## Verificación en vivo (2026-10-07)

Ver `docs/evidencia/`:

- `aws-os-attribute-values-2026-10-07.json` — valores reales de `operatingSystem` (incluye `SUSE`).
- `aws-suse-t3micro-us-east-1-2026-10-07.json` — producto SUSE real (SKU `BC2SFDXEPX53FCV2`, 0.0104 USD/h).
- `aws-getproducts-2026-10-07.json` — producto Linux t3.micro us-east-1 (Fase 1).

Resultados E2E obtenidos (cliente → proxy Vite 5173 → backend 3001 → AWS):

1. **EC2 Linux real**: `POST /api/aws/ec2/estimate` `t3.micro` `us-east-1` Linux →
   `0.0104 USD/h`, `7.592 USD/mes`, SKU `CRAJUW7BTXFMT2UJ`, `X-Cache: MISS` → repetir → `HIT`.
2. **EC2 SUSE real**: `t3.micro` `us-east-1` SUSE → `0.0104 USD/h`, SKU `BC2SFDXEPX53FCV2`;
   `t3.micro` `eu-west-1` SUSE → `0.0114 USD/h`, SKU `CCNCA2EZY5QTQAHN` (MISS).
3. **MISS → HIT limpio**: `m5.large` `eu-west-1` Linux ×2 → `0.107 USD/h`, `156.22 USD/mes`,
   SKU `FP7Z96TTU3VFSX2H`; `X-Cache: MISS` (1ª) → `HIT` (2ª, mismo `retrievedAt`).
4. **Mapa real 28 regiones** (t3.micro Linux y SUSE): 28/28 disponibles, 0 errores.
   Primera llamada `X-Cache: MISS` (≥28 consultas reales); repetición `X-Cache: HIT`,
   `cacheMissCount: 0` (0 consultas).
5. **Combinación inexistente**: `u-3tb1xlarge` SUSE us-east-1 → `404 CONFIGURATION_NOT_FOUND`.

## Pruebas automatizadas

- `backend/src/aws/awsLivePricing.test.ts`: parser (string | objeto | `String` en caja),
  SUSE, ubicaciones/overrides/ASCII, caché MISS/HIT/TTL, no encontrado, errores del SDK,
  clave de caché y estimación mensual.
- `npm run typecheck` y `npm test` en `backend/`: **33/33** tests en verde.
- `npm run build` en `frontend/`: TypeScript + Vite sin errores.

## No incluido (fuera del alcance de esta fase)

- RDS/S3/Lambda/DynamoDB/SNS/CloudFront/Route 53 siguen simulados (catálogo de referencia).
- No hay aprovisionamiento, autenticación, pagos ni despliegue.