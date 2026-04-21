# DFR.md — MisFinanzas: App de Control Financiero Personal

## 1. Visión General

**Producto:** Aplicación web personal de control financiero integral.  
**Usuario:** Único (Fernando Rodríguez Memije) — sin necesidad de sistema de autenticación multi-usuario en MVP.  
**Problema:** Llevar un control completo de finanzas personales adaptado al ciclo quincenal mexicano, con seguimiento de deudas, ingresos variables (empleo + freelance), presupuesto por categorías y visualización histórica.  
**Stack:** Next.js 14+ (App Router), PostgreSQL (Docker), Prisma ORM, Tailwind CSS, desplegable en Vercel o servidor local.

---

## 2. Entidades del Dominio

### 2.1 Fuentes de Ingreso (`IncomeSource`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre de la fuente (ej: "TerSoft", "Freelance") |
| defaultAmount | BigInt | Monto habitual por periodo (en centavos) |
| frequency | Enum | `QUINCENAL`, `MENSUAL`, `SEMANAL`, `VARIABLE` |
| type | Enum | `EMPLOYMENT`, `FREELANCE`, `OTHER` |
| isActive | Boolean | Si la fuente está activa |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 2.2 Transacciones (`Transaction`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| type | Enum | `INCOME`, `EXPENSE` |
| amount | BigInt | Monto en centavos (siempre positivo, ej: $150.00 = 15000) |
| description | String? | Descripción opcional |
| categoryId | UUID | FK a Category |
| incomeSourceId | UUID? | FK a IncomeSource (solo si type=INCOME) |
| date | Date | Fecha de la transacción |
| paymentMethod | Enum? | `EFECTIVO`, `DEBITO`, `CREDITO`, `TRANSFERENCIA` |
| periodId | UUID | FK a Period |
| notes | String? | Notas adicionales |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 2.3 Categorías de Gasto (`Category`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre (ej: "Comida") |
| icon | String | Nombre del ícono de Lucide (ej: "utensils", "zap") |
| color | String | Color hex para gráficas |
| type | Enum | `EXPENSE`, `INCOME`, `BOTH` |
| isDefault | Boolean | Si es categoría del sistema |
| isActive | Boolean | |
| sortOrder | Int | Orden de aparición |

**Categorías iniciales (seed):**

| Nombre | Ícono (Lucide) | Color | Tipo |
|--------|----------------|-------|------|
| Comida | utensils | #fb923c | EXPENSE |
| Servicios | zap | #60a5fa | EXPENSE |
| Entretenimiento | clapperboard | #a78bfa | EXPENSE |
| Suscripciones | smartphone | #f472b6 | EXPENSE |
| Transporte | car | #fbbf24 | EXPENSE |
| Otros | package | #94a3b8 | EXPENSE |
| Empleo | briefcase | #34d399 | INCOME |
| Freelance | laptop | #22d3ee | INCOME |

### 2.4 Deudas (`Debt`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre descriptivo |
| type | Enum | `CREDIT_CARD`, `PERSONAL_LOAN`, `AUTO_LOAN`, `OTHER` |
| currentBalance | BigInt | Saldo actual (en centavos) |
| creditLimit | BigInt? | Solo para tarjetas de crédito (en centavos) |
| annualRate | Int | Tasa de interés anual en basis points (ej: 4500 = 45.00%) |
| minimumPayment | BigInt? | Pago mínimo en centavos (tarjetas) |
| monthlyPayment | BigInt? | Mensualidad fija en centavos (préstamos) |
| originalAmount | BigInt? | Monto original en centavos (préstamos) |
| remainingMonths | Int? | Meses restantes (préstamos) |
| cutOffDay | Int? | Día de corte (tarjetas, 1-31) |
| paymentDueDay | Int? | Día límite de pago (tarjetas, 1-31) |
| isActive | Boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Campos calculados (no almacenados, derivados en la app):**
- `utilizationRate`: currentBalance / creditLimit (solo tarjetas)
- `estimatedMonthlyInterest`: currentBalance * (annualRate / 12)
- `percentPaid`: 1 - (currentBalance / originalAmount) (solo préstamos)
- `totalRemainingPayment`: monthlyPayment * remainingMonths (solo préstamos)

### 2.5 Presupuestos (`Budget`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| categoryId | UUID | FK a Category |
| quincenalAmount | BigInt | Monto asignado por quincena (en centavos) |
| periodId | UUID | FK a Period |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Campos calculados:**
- `monthlyAmount`: quincenalAmount * 2
- `semesterAmount`: monthlyAmount * 6
- `annualAmount`: monthlyAmount * 12
- `spent`: SUM(transactions del periodo en esa categoría)
- `remaining`: monthlyAmount - spent
- `percentUsed`: spent / monthlyAmount

### 2.6 Periodos (`Period`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| month | Int | Mes (1-12) |
| year | Int | Año |
| startDate | Date | Primer día del mes |
| endDate | Date | Último día del mes |
| isClosed | Boolean | Si el periodo está cerrado |
| closedAt | DateTime? | Fecha en que se cerró |
| createdAt | DateTime | |

**Constraint:** UNIQUE(month, year)

### 2.7 Resumen Mensual (`MonthlySummary`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| periodId | UUID | FK a Period (UNIQUE) |
| totalIncome | BigInt | Total ingresos del mes (en centavos) |
| totalExpenses | BigInt | Total gastos del mes (en centavos) |
| totalSavings | BigInt | Ingresos - Gastos (en centavos) |
| savingsRate | Int | Tasa de ahorro en basis points (ej: 2050 = 20.50%) |
| debtAtClose | BigInt | Deuda total al cierre (en centavos) |
| debtPayments | BigInt | Pagos a deudas en el mes (en centavos) |
| notes | String? | Notas del cierre |
| createdAt | DateTime | |

### 2.8 Unidades de Valor (`ValueUnit`)

Permite rastrear activos en unidades distintas a MXN (UDI, UMA, USD, etc.) con conversión automática vía proveedores de tasa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| code | String | Código único (ej: "UDI", "UMA", "USD"). UNIQUE |
| name | String | Nombre legible (ej: "Unidad de Inversión") |
| precision | Int | Decimales nativos de la unidad (UDI=6, UMA=2, USD=2) |
| symbol | String? | Símbolo de display (ej: "UDI", "US$") |
| providerUrl | String? | URL del API para obtener la tasa (ej: Banxico API) |
| providerPath | String? | JSONPath para extraer el valor de la respuesta del API |
| providerHeaders | Json? | Headers requeridos por el API (ej: token de Banxico) |
| refreshInterval | Int | Intervalo de refresco en horas (UDI=24, UMA=8760 para anual) |
| isActive | Boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Unidades iniciales (seed):**

| Código | Nombre | Precisión | Refresh | Provider |
|--------|--------|-----------|---------|----------|
| MXN | Peso Mexicano | 2 | — | Moneda base, no requiere API |
| UDI | Unidad de Inversión | 6 | 24h | Banxico SIE API (serie SP68257) |
| UMA | Unidad de Medida y Actualización | 2 | 8760h (anual) | INEGI / DOF |

### 2.9 Tasas de Conversión (`UnitRate`)

Historial de tasas de conversión de cada unidad a MXN centavos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| unitId | UUID | FK a ValueUnit |
| date | Date | Fecha de la tasa |
| rateToMxnCents | BigInt | Cuántos centavos MXN equivale 1 unidad entera (ej: 1 UDI ≈ 829 centavos → 829) |
| rateRaw | String | Valor original tal como lo devolvió el API (para auditoría) |
| source | String | Origen: "api", "manual" |
| createdAt | DateTime | |

**Constraint:** UNIQUE(unitId, date)

**Ejemplo de cálculo:**
- Tengo 50,000.123456 UDIs almacenados como `50000123456` (precision=6, o sea amount / 10^6)
- Tasa del día: 1 UDI = $8.29 MXN → rateToMxnCents = 829
- Valor en MXN centavos: `(amount * rateToMxnCents) / 10^precision` = `(50000123456 * 829) / 1000000` = `41450102` centavos = $414,501.02 MXN

### 2.10 Activos / Inversiones (`Asset`)

Cualquier cosa cuyo valor se rastrea en una unidad distinta a MXN.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre descriptivo (ej: "PPR Profuturo", "CETES 28d") |
| unitId | UUID | FK a ValueUnit |
| amount | BigInt | Cantidad en la subdivisión mínima de la unidad (según precision) |
| category | Enum | `PPR`, `INVESTMENT`, `SAVINGS`, `CRYPTO`, `OTHER` |
| institution | String? | Institución (ej: "GBM", "Profuturo", "Cetesdirecto") |
| notes | String? | |
| isActive | Boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Campos calculados (no almacenados):**
- `displayAmount`: amount / 10^unit.precision (ej: 50000123456 / 10^6 = 50,000.123456 UDIs)
- `mxnValue`: (amount × latestRate.rateToMxnCents) / 10^unit.precision (en centavos MXN)
- `mxnDisplay`: formatMoney(mxnValue)

---

## 3. Módulos y Funcionalidades

### 3.1 Dashboard (Pantalla principal)

**KPIs superiores (cards):**
- Ingreso mensual (calculado de fuentes activas)
- Gastos del mes actual (SUM transacciones EXPENSE del periodo actual)
- Disponible (ingreso - gastos)
- Deuda total (SUM saldos de deudas activas)
- Tasa de ahorro (disponible / ingreso, en %)
- Ratio deuda/ingreso (deuda total / ingreso mensual, en %)

**Gráficas:**
1. **Barras horizontales:** Presupuesto vs Gastado por categoría (mes actual)
2. **Área/Línea:** Tendencia 6 meses (ingresos vs gastos) — usa datos de MonthlySummary
3. **Dona/Pie:** Distribución de gastos por categoría (mes actual)

**Últimos movimientos:** Lista de las 5-8 transacciones más recientes con ícono de categoría, descripción, fecha y monto.

### 3.2 Registro de Transacciones

**Formulario rápido (objetivo: < 30 segundos por registro):**
- Tipo: toggle Gasto/Ingreso
- Monto: input numérico con prefijo $
- Categoría: selector con íconos (si es gasto) o fuente de ingreso (si es ingreso)
- Descripción: input texto (opcional)
- Fecha: date picker, default a hoy
- Forma de pago: selector (Efectivo, Débito, Crédito, Transferencia) — solo para gastos
- Notas: textarea corto (opcional, colapsado por default)

**Lista de transacciones:**
- Vista tabla/lista del mes actual
- Filtros: por categoría, tipo, rango de fechas, forma de pago
- Ordenamiento: por fecha (default desc), monto
- Acción rápida: eliminar con confirmación
- Editar: abre el mismo formulario precargado

### 3.3 Control de Deudas

**Vista por deuda (card expandible):**
- Nombre y tipo (ícono diferenciado)
- Saldo actual (editable inline o vía modal)
- Para tarjetas: barra de utilización (verde < 30%, naranja 30-70%, rojo > 70%), pago mínimo, fechas corte/pago, interés mensual estimado
- Para préstamos: barra de progreso (% pagado), mensualidad, meses restantes, total por pagar
- Botón para actualizar saldo manualmente

**Resumen:**
- Deuda total
- Pago mensual total de deudas
- Ratio deuda/ingreso

**Funcionalidades futuras (no MVP):**
- Simulador de estrategia de pago (avalancha vs bola de nieve)
- Alertas de fechas de corte/pago

### 3.4 Presupuesto

**Configuración:**
- Tabla editable con cada categoría
- Input principal: monto quincenal
- Columnas calculadas: mensual (×2), semestral (×6), anual (×12)
- Fila de total
- Comparación: ingreso quincenal vs total presupuestado quincenal → sobrante/faltante

**Vista de avance (mes actual):**
- Barra de progreso por categoría con % usado
- Color dinámico: verde (< 80%), naranja (80-100%), rojo (> 100%)
- Monto gastado vs presupuestado

**Vistas temporales:**
- Toggle para ver presupuesto en modo quincenal, mensual o anual

### 3.5 Ingresos

**Lista de fuentes:**
- Cards con nombre, monto, frecuencia
- Editable
- Para frecuencia quincenal: mostrar equivalente mensual
- Para variable: mostrar promedio de los últimos 3 meses

**Resumen:**
- Ingreso quincenal estimado
- Ingreso mensual estimado
- Ingreso semestral y anual

### 3.6 Historial Anual

**Tabla pivote:**
- Filas: Ingresos, Gastos, Ahorro, % Ahorro, Deuda (cierre), Pagos a deudas
- Columnas: Ene-Dic + Total Anual
- Se llena automáticamente con datos de MonthlySummary
- Ahorro y % Ahorro son calculados

**Cierre de mes:**
- Botón "Cerrar mes" que:
  1. Calcula totales del periodo
  2. Crea/actualiza el registro MonthlySummary
  3. Marca el periodo como cerrado (isClosed = true)
  4. Crea el siguiente periodo si no existe
- Un periodo cerrado no se puede editar (las transacciones quedan bloqueadas) a menos que se reabra explícitamente

### 3.7 Activos e Inversiones (v2.0)

**Vista principal:**
- Lista de activos como cards, cada una muestra: nombre, institución, cantidad en unidad nativa (ej: "50,000.12 UDIs"), equivalente MXN al tipo de cambio más reciente, y fecha de última actualización de tasa
- Total de portafolio en MXN (suma de todos los activos convertidos)
- Indicador de cambio desde la última actualización de tasa

**CRUD de activos:**
- Formulario: nombre, unidad de valor (selector), cantidad (input en formato de la unidad), categoría (PPR, Inversión, Ahorro, Crypto, Otro), institución (opcional)
- Editar cantidad manualmente (ej: al recibir estado de cuenta del PPR)

**Administración de unidades (Settings):**
- Lista de ValueUnits configuradas
- Formulario para agregar/editar unidad: código, nombre, precisión decimal, URL del API, JSONPath para extraer la tasa, headers del API, intervalo de refresco
- Botón "Probar conexión" que hace un request al API y muestra la tasa extraída
- Botón "Actualizar tasa ahora" por unidad
- Historial de tasas por unidad (tabla con fecha, valor, fuente)

**Actualización automática de tasas:**
- Cron job o API route invocable (para llamar desde un cron externo o Vercel Cron) que recorre todas las ValueUnits activas cuya última tasa tenga más horas que su refreshInterval
- Fetch al providerUrl, extrae el valor con providerPath, almacena en UnitRate
- Log de éxito/error por unidad

### 3.8 Configuración (Settings)

- Administración de unidades de valor (ver 3.7)
- Administración de categorías personalizadas
- Exportar/importar datos (JSON)

---

## 4. Navegación y Layout

**Sidebar fija (desktop) / Bottom tab bar (mobile):**
1. Dashboard (ícono: LayoutDashboard)
2. Movimientos (ícono: Receipt)
3. Deudas (ícono: CreditCard)
4. Presupuesto (ícono: Target)
5. Ingresos (ícono: Wallet)
6. Activos (ícono: TrendingUp) — v2.0
7. Historial (ícono: BarChart)
8. Configuración (ícono: Settings) — v2.0

**Header:**
- Nombre del periodo actual (ej: "Abril 2026")
- Botón flotante "+" para registro rápido de transacción (siempre visible)
- Selector de periodo (para navegar meses previos en modo solo lectura)

---

## 5. Reglas de Negocio

### 5.1 Ciclo Quincenal
- El ingreso base se captura como monto quincenal y se multiplica ×2 para el mensual
- El presupuesto se define por quincena como unidad base
- La app no separa primera y segunda quincena en MVP; el presupuesto es mensual (quincenal × 2) pero el input es quincenal para coincidir con el flujo de cobro

### 5.2 Periodos
- Un periodo = un mes calendario (día 1 al último día del mes)
- El periodo actual se crea automáticamente si no existe al abrir la app
- Solo se pueden agregar transacciones al periodo actual (a menos que el anterior esté abierto)
- El cierre de mes genera el snapshot para MonthlySummary

### 5.3 Deudas
- Los saldos de deudas se actualizan manualmente (no hay conexión bancaria)
- El interés mensual estimado es informativo, no modifica el saldo automáticamente
- La deuda total en el Dashboard es la suma de currentBalance de todas las deudas activas

### 5.4 Presupuesto
- Si no hay presupuesto configurado para el periodo actual, se copia el del periodo anterior
- Las categorías de presupuesto incluyen categorías de gasto + "Ahorro/Emergencia" + "Pago Deudas" (estos dos no son categorías de transacción, son asignaciones de presupuesto)

### 5.5 Moneda y Representación Monetaria
- Toda la app opera en MXN como moneda base
- **Almacenamiento:** Todos los montos se guardan como `BigInt` en centavos (ej: $1,500.75 → 150075). Esto elimina errores de punto flotante y permite montos de hasta ~$922 billones
- **Tasas de interés:** Se almacenan como `Int` en basis points (ej: 45.00% → 4500). Esto permite representar hasta dos decimales de precisión sin flotantes
- **Serialización API:** Prisma devuelve `BigInt` como tipo nativo de JS. Los API routes serializan a `String` en el JSON response (JSON.stringify no soporta BigInt nativamente). El frontend parsea `String → Number` solo para formateo de display
- **UI (entrada):** El usuario escribe en formato decimal normal ($1,500.75). La conversión a centavos ocurre en la capa de validación/API antes de persistir
- **UI (salida):** Se divide entre 100 y se formatea con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`
- **API:** Los endpoints reciben y devuelven montos como `String` (representación del BigInt en centavos). La conversión String ↔ display es responsabilidad exclusiva de la capa de presentación
- No se requiere soporte multi-moneda en MVP (pero ver sección 2.9 para sistema de unidades de valor)

---

## 6. Diseño Visual

### 6.1 Estética
- **Tema:** Dark mode como default (fondo oscuro tipo #0a0f1a, cards #111827)
- **Acento principal:** Cyan/Teal (#22d3ee)
- **Paleta semántica:** Verde para ingresos/positivo, Rojo para gastos/deuda/negativo, Naranja para alertas, Azul para información neutral
- **Iconografía:** Lucide React exclusivamente. No emojis en ninguna parte de la UI. Los íconos de categorías se renderizan dinámicamente por nombre almacenado en BD
- **Tipografía:** DM Sans o similar sans-serif moderna
- **Border radius:** 12-16px en cards, 8px en inputs
- **Sombras:** Sutiles, orientadas a profundidad (no drop shadow genérico)

### 6.2 Responsividad
- Mobile-first
- Breakpoints: móvil (<768px), tablet (768-1024px), desktop (>1024px)
- Sidebar colapsable en móvil, fija en desktop
- Cards de KPI: 2 columnas en móvil, 3-4 en desktop
- Formulario de transacción rápida: full screen modal en móvil, slide-over en desktop

---

## 7. API Routes (Next.js App Router)

```
POST   /api/transactions          → Crear transacción
GET    /api/transactions          → Listar (con filtros via query params)
PUT    /api/transactions/[id]     → Actualizar
DELETE /api/transactions/[id]     → Eliminar

GET    /api/income-sources        → Listar fuentes
POST   /api/income-sources        → Crear
PUT    /api/income-sources/[id]   → Actualizar
DELETE /api/income-sources/[id]   → Eliminar

GET    /api/debts                 → Listar deudas
POST   /api/debts                 → Crear
PUT    /api/debts/[id]            → Actualizar saldo y datos
DELETE /api/debts/[id]            → Eliminar

GET    /api/budgets               → Presupuesto del periodo actual
POST   /api/budgets               → Crear/actualizar presupuesto
PUT    /api/budgets/[id]          → Actualizar categoría individual

GET    /api/categories            → Listar categorías
POST   /api/categories            → Crear categoría personalizada

GET    /api/periods               → Listar periodos
GET    /api/periods/current       → Periodo actual con resumen
POST   /api/periods/[id]/close    → Cerrar periodo

GET    /api/dashboard             → KPIs + datos para gráficas del periodo actual
GET    /api/dashboard/trend       → Datos de tendencia (últimos 6 meses)

GET    /api/history/[year]        → Historial anual (MonthlySummary del año)

# ─── v2.0: Activos y Unidades de Valor ───
GET    /api/assets                → Listar activos con valor MXN calculado
POST   /api/assets                → Crear activo
PUT    /api/assets/[id]           → Actualizar (cantidad, datos)
DELETE /api/assets/[id]           → Eliminar

GET    /api/units                 → Listar unidades de valor
POST   /api/units                 → Crear unidad personalizada
PUT    /api/units/[id]            → Actualizar configuración
DELETE /api/units/[id]            → Eliminar
POST   /api/units/[id]/test       → Probar conexión al API del proveedor
POST   /api/units/[id]/refresh    → Forzar actualización de tasa

GET    /api/units/[id]/rates      → Historial de tasas
POST   /api/cron/refresh-rates    → Actualizar tasas vencidas (invocable por cron)
```

---

## 8. Consideraciones Técnicas

### 8.1 Base de Datos
- PostgreSQL en contenedor Docker para desarrollo
- Prisma como ORM con migraciones versionadas
- UUIDs como primary keys (cuid2 generados por Prisma)
- Montos monetarios como `BigInt` en centavos (mapea a `bigint` de PostgreSQL, 8 bytes). Serialización a `String` en JSON responses
- Tasas de interés como `Int` en basis points (4500 = 45.00%)
- Índices: Transaction(periodId, date), Transaction(categoryId), Budget(periodId, categoryId), Debt(isActive), UnitRate(unitId, date), Asset(unitId)

### 8.2 Validación
- Zod para validación de inputs en API routes y formularios
- La API recibe montos como String (BigInt centavos). La conversión de la entrada decimal del usuario a centavos String ocurre en la capa de presentación antes de enviar al API
- Montos siempre positivos (≥ 0), el tipo (INCOME/EXPENSE) determina el signo en cálculos

### 8.3 Performance
- Server Components por default, Client Components solo donde hay interactividad
- Las gráficas (Recharts) son Client Components
- Los cálculos de KPIs se hacen en queries SQL agregadas, no en el cliente
- ISR no aplica (datos personales, siempre fresh)

### 8.4 Infraestructura
- Docker Compose para desarrollo local: app Next.js + PostgreSQL
- Producción: Vercel (app) + PostgreSQL externo, O servidor local con reverse proxy
- Variables de entorno: DATABASE_URL, NEXTAUTH_SECRET (si se agrega auth después)

---

## 9. Alcance MVP vs Futuro

### MVP (v1.0)
- [x] Dashboard con KPIs y 3 gráficas
- [x] CRUD de transacciones con formulario rápido
- [x] Control de deudas (tarjeta + préstamo)
- [x] Presupuesto quincenal/mensual con avance
- [x] Ingresos (2 fuentes + configurable)
- [x] Historial anual con cierre de mes
- [x] Categorías predefinidas + personalizables
- [x] Dark mode
- [x] Responsive

### Futuro (v2.0+)
- [ ] Sistema de unidades de valor (UDI, UMA, USD) con proveedores de tasa configurables
- [ ] Tracking de activos e inversiones (PPR en UDIs, CETES, fondos, crypto) con conversión MXN automática
- [ ] Cron job para actualización automática de tasas (Vercel Cron o cron externo)
- [ ] Autenticación (NextAuth/Clerk) si se comparte el servidor
- [ ] PWA con soporte offline
- [ ] Notificaciones de fechas de corte/pago
- [ ] Importación de estados de cuenta (CSV/PDF parsing)
- [ ] Simulador de pago de deudas (avalancha/bola de nieve)
- [ ] Metas de ahorro con tracking
- [ ] Exportar reportes PDF/Excel
- [ ] API para integrar con bots de Telegram/WhatsApp para registro rápido
- [ ] Multi-moneda para ingresos freelance en USD
