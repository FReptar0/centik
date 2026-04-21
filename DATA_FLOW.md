# DATA_FLOW.md — MisFinanzas: Flujo de Datos

## 1. Visión General

Este documento mapea cómo los datos fluyen desde PostgreSQL hasta cada componente de la UI, qué mutations desencadenan qué actualizaciones, y cómo se propagan los cambios entre vistas para evitar datos stale o inconsistentes.

**Convenciones:**
- `→` indica dirección del flujo de datos
- `⟳` indica revalidación necesaria
- `⚡` indica que una mutation desencadena efectos secundarios
- Todos los montos viajan como `string` (BigInt serializado) entre API y cliente

---

## 2. Fuentes de Verdad

Cada dato tiene exactamente una fuente de verdad. Nunca se duplica un dato en dos tablas.

```
Ingreso mensual estimado     → Calculado: SUM de IncomeSource.defaultAmount ajustado por frecuencia
Gastos del mes               → Calculado: SUM de Transaction.amount WHERE type=EXPENSE AND periodId=current
Ingreso real del mes         → Calculado: SUM de Transaction.amount WHERE type=INCOME AND periodId=current
Deuda total                  → Calculado: SUM de Debt.currentBalance WHERE isActive=true
Presupuesto mensual          → Calculado: SUM de Budget.quincenalAmount * 2 WHERE periodId=current
Gasto por categoría          → Calculado: SUM de Transaction.amount GROUP BY categoryId WHERE type=EXPENSE
Tasa de ahorro               → Derivado: (ingreso real - gastos) / ingreso real
Patrimonio neto              → Derivado: SUM(Asset.mxnValue) - deuda total
Historial anual              → Snapshot: MonthlySummary (se congela al cerrar periodo)
```

Los datos de MonthlySummary son la única excepción a "no duplicar" — son snapshots intencionales que sobreviven a ediciones posteriores.

---

## 3. Queries por Página

### 3.1 Dashboard

El Dashboard es la página más costosa en queries. Todas deben ser agregaciones SQL, nunca cargar registros individuales.

```sql
-- KPI: Ingreso mensual estimado
SELECT SUM(
  CASE 
    WHEN frequency = 'QUINCENAL' THEN "defaultAmount" * 2
    WHEN frequency = 'SEMANAL' THEN "defaultAmount" * 4
    ELSE "defaultAmount"
  END
) as monthly_income
FROM "IncomeSource"
WHERE "isActive" = true;

-- KPI: Gastos del mes actual
SELECT SUM(amount) as total_expenses
FROM "Transaction"
WHERE type = 'EXPENSE' AND "periodId" = :currentPeriodId;

-- KPI: Ingreso real del mes
SELECT SUM(amount) as total_income
FROM "Transaction"
WHERE type = 'INCOME' AND "periodId" = :currentPeriodId;

-- KPI: Deuda total
SELECT SUM("currentBalance") as total_debt
FROM "Debt"
WHERE "isActive" = true;

-- Gráfica: Gastos por categoría (pie chart)
SELECT c.name, c.icon, c.color, SUM(t.amount) as total
FROM "Transaction" t
JOIN "Category" c ON t."categoryId" = c.id
WHERE t.type = 'EXPENSE' AND t."periodId" = :currentPeriodId
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total DESC;

-- Gráfica: Presupuesto vs Gastado (bar chart)
SELECT 
  c.name,
  c.color,
  b."quincenalAmount" * 2 as budget,
  COALESCE(SUM(t.amount), 0) as spent
FROM "Budget" b
JOIN "Category" c ON b."categoryId" = c.id
LEFT JOIN "Transaction" t ON t."categoryId" = c.id 
  AND t."periodId" = :currentPeriodId 
  AND t.type = 'EXPENSE'
WHERE b."periodId" = :currentPeriodId
GROUP BY c.id, c.name, c.color, b."quincenalAmount"
ORDER BY c."sortOrder";

-- Gráfica: Tendencia 6 meses (area chart)
SELECT 
  p.month, p.year,
  ms."totalIncome", ms."totalExpenses", ms."totalSavings"
FROM "MonthlySummary" ms
JOIN "Period" p ON ms."periodId" = p.id
WHERE p."startDate" >= :sixMonthsAgo
ORDER BY p.year, p.month;

-- Últimos movimientos (max 8)
SELECT t.*, c.name as category_name, c.icon, c.color
FROM "Transaction" t
JOIN "Category" c ON t."categoryId" = c.id
WHERE t."periodId" = :currentPeriodId
ORDER BY t.date DESC, t."createdAt" DESC
LIMIT 8;
```

**Implementación en Next.js:**

```
app/page.tsx (Server Component)
├── getDashboardKPIs()          → 4 queries agregadas en paralelo con Promise.all
├── getCategoryExpenses()       → 1 query para pie chart
├── getBudgetVsSpent()          → 1 query para bar chart
├── getMonthlyTrend()           → 1 query para area chart (MonthlySummary)
└── getRecentTransactions()     → 1 query con limit 8
    ├── <KPICards data={kpis} />           (Client Component)
    ├── <ExpensePieChart data={expenses} /> (Client Component)
    ├── <BudgetBarChart data={budget} />    (Client Component)
    ├── <TrendAreaChart data={trend} />     (Client Component)
    └── <RecentTransactions data={txns} />  (Server Component)
```

### 3.2 Movimientos

```
app/movimientos/page.tsx (Server Component)
├── getCurrentPeriod()
├── getTransactions(filters)    → Paginado, filtrable por categoría/tipo/fecha/paymentMethod
├── getCategories()             → Para el selector de filtro y el formulario
└── getIncomeSources()          → Para el formulario (si type=INCOME)
    ├── <TransactionFilters />  (Client Component — maneja estado de filtros)
    ├── <TransactionList />     (Server Component — renderiza la lista)
    └── <TransactionForm />     (Client Component — modal de registro)
```

**Query principal:**
```sql
SELECT t.*, c.name as category_name, c.icon, c.color
FROM "Transaction" t
JOIN "Category" c ON t."categoryId" = c.id
WHERE t."periodId" = :periodId
  AND (:type IS NULL OR t.type = :type)
  AND (:categoryId IS NULL OR t."categoryId" = :categoryId)
  AND (:startDate IS NULL OR t.date >= :startDate)
  AND (:endDate IS NULL OR t.date <= :endDate)
ORDER BY t.date DESC, t."createdAt" DESC
LIMIT :limit OFFSET :offset;
```

### 3.3 Deudas

```
app/deudas/page.tsx (Server Component)
├── getDebts()                  → Todas las deudas activas con campos completos
├── getMonthlyIncome()          → Para calcular ratio deuda/ingreso
└── Campos calculados en el componente (no en query):
    ├── utilizationRate = currentBalance / creditLimit
    ├── estimatedMonthlyInterest = currentBalance * (annualRate / 12 / 10000)
    ├── percentPaid = 1 - (currentBalance / originalAmount)
    └── totalRemaining = monthlyPayment * remainingMonths
```

### 3.4 Presupuesto

```
app/presupuesto/page.tsx (Server Component)
├── getBudgetsWithSpent()       → Presupuestos del periodo actual + gasto real por categoría
├── getQuincenalIncome()        → Para comparar vs total presupuestado
```

**Query clave (budget con gasto real en una sola query):**
```sql
SELECT 
  b.id, b."quincenalAmount",
  c.name, c.icon, c.color,
  COALESCE(SUM(t.amount), 0) as spent
FROM "Budget" b
JOIN "Category" c ON b."categoryId" = c.id
LEFT JOIN "Transaction" t ON t."categoryId" = c.id
  AND t."periodId" = b."periodId"
  AND t.type = 'EXPENSE'
WHERE b."periodId" = :currentPeriodId
GROUP BY b.id, b."quincenalAmount", c.id, c.name, c.icon, c.color
ORDER BY c."sortOrder";
```

### 3.5 Ingresos

```
app/ingresos/page.tsx (Server Component)
├── getIncomeSources()          → Todas las fuentes con isActive
├── getAverageFreelance()       → Promedio de últimos 3 meses para fuentes variables
```

**Query para promedio variable:**
```sql
SELECT AVG(monthly_total) as average
FROM (
  SELECT SUM(t.amount) as monthly_total
  FROM "Transaction" t
  JOIN "Period" p ON t."periodId" = p.id
  WHERE t.type = 'INCOME' 
    AND t."incomeSourceId" = :sourceId
    AND p."startDate" >= :threeMonthsAgo
  GROUP BY p.id
) sub;
```

### 3.6 Historial

```
app/historial/page.tsx (Server Component)
├── getMonthlySummaries(year)   → 12 registros de MonthlySummary para el año
├── getAvailableYears()         → Lista de años con datos
```

### 3.7 Activos (v2.0)

```
app/activos/page.tsx (Server Component)
├── getAssetsWithValues()       → Assets + última tasa de su unidad + valor MXN calculado
├── getValueUnits()             → Unidades configuradas
```

**Query con valor MXN calculado:**
```sql
SELECT 
  a.*,
  vu.code, vu.name as unit_name, vu.precision, vu.symbol,
  ur."rateToMxnCents",
  ur.date as rate_date
FROM "Asset" a
JOIN "ValueUnit" vu ON a."unitId" = vu.id
LEFT JOIN LATERAL (
  SELECT "rateToMxnCents", date 
  FROM "UnitRate" 
  WHERE "unitId" = vu.id 
  ORDER BY date DESC 
  LIMIT 1
) ur ON true
WHERE a."isActive" = true
ORDER BY a."createdAt" DESC;
```

El cálculo `mxnValue = (amount * rateToMxnCents) / 10^precision` se hace en la capa de aplicación.

---

## 4. Mutations y Propagación

### 4.1 Crear Transacción

```
POST /api/transactions (o Server Action)
│
├── Validar con Zod (amount > 0, categoryId exists, date within current period)
├── INSERT Transaction
├── ⟳ Revalidar:
│   ├── /                    (Dashboard: KPIs, gráficas, últimos movimientos)
│   ├── /movimientos         (Lista de transacciones)
│   └── /presupuesto         (Avance por categoría si type=EXPENSE)
│
└── Nota: NO actualiza Debt ni IncomeSource automáticamente.
    El pago de una deuda es una transacción de gasto normal.
    El saldo de la deuda se actualiza manualmente por separado.
```

**Implementación de revalidación:**
```ts
// En el Server Action o API route después del INSERT
revalidatePath('/')            // Dashboard
revalidatePath('/movimientos') // Lista
revalidatePath('/presupuesto') // Progress bars
```

### 4.2 Eliminar Transacción

```
DELETE /api/transactions/[id]
│
├── Verificar que el periodo NO está cerrado
├── DELETE Transaction
├── ⟳ Misma revalidación que crear
```

### 4.3 Actualizar Saldo de Deuda

```
PUT /api/debts/[id]
│
├── UPDATE Debt.currentBalance (y otros campos editados)
├── ⟳ Revalidar:
│   ├── /          (Dashboard: KPI deuda total, patrimonio neto)
│   └── /deudas    (Cards de deuda)
```

### 4.4 Actualizar Presupuesto

```
PUT /api/budgets/[id]  (o batch POST /api/budgets)
│
├── UPSERT Budget entries para el periodo actual
├── ⟳ Revalidar:
│   ├── /              (Dashboard: gráfica presupuesto vs gastado)
│   └── /presupuesto   (Tabla y barras de progreso)
```

### 4.5 Cerrar Periodo

Esta es la mutation más compleja. Tiene múltiples side effects.

```
POST /api/periods/[id]/close
│
├── Verificar que el periodo NO está ya cerrado
├── ⚡ Calcular y guardar MonthlySummary:
│   ├── totalIncome = SUM(Transaction.amount WHERE type=INCOME)
│   ├── totalExpenses = SUM(Transaction.amount WHERE type=EXPENSE)
│   ├── totalSavings = totalIncome - totalExpenses
│   ├── savingsRate = (totalSavings / totalIncome) * 10000  [basis points]
│   ├── debtAtClose = SUM(Debt.currentBalance WHERE isActive=true)
│   └── debtPayments = SUM(Transaction.amount WHERE categoryId IN debt-related categories)
│
├── ⚡ Marcar periodo: isClosed = true, closedAt = now()
│
├── ⚡ Crear siguiente periodo (si no existe):
│   ├── Calcular mes/año siguiente
│   └── INSERT Period con isClosed = false
│
├── ⚡ Copiar presupuesto al siguiente periodo:
│   ├── SELECT Budget WHERE periodId = currentPeriod
│   └── INSERT Budget con periodId = nextPeriod (mismos montos)
│
├── ⟳ Revalidar:
│   ├── /              (Dashboard: tendencia 6 meses se actualiza)
│   ├── /historial     (Nueva fila en tabla anual)
│   └── /presupuesto   (Ahora muestra el nuevo periodo)
│
└── Responder con: { closedPeriod, newPeriod, summary }
```

**Esta operación debe ser transaccional (Prisma $transaction):**
```ts
await prisma.$transaction(async (tx) => {
  // 1. Calcular totales
  const totals = await tx.transaction.aggregate({ ... })
  const debtTotal = await tx.debt.aggregate({ ... })
  
  // 2. Crear MonthlySummary
  await tx.monthlySummary.create({ data: { ... } })
  
  // 3. Cerrar periodo
  await tx.period.update({ where: { id }, data: { isClosed: true, closedAt: new Date() } })
  
  // 4. Crear siguiente periodo
  const nextPeriod = await tx.period.create({ data: { ... } })
  
  // 5. Copiar presupuesto
  const budgets = await tx.budget.findMany({ where: { periodId: id } })
  await tx.budget.createMany({
    data: budgets.map(b => ({ ...b, id: undefined, periodId: nextPeriod.id }))
  })
})
```

### 4.6 Reabrir Periodo

```
POST /api/periods/[id]/reopen
│
├── Verificar que el periodo está cerrado
├── UPDATE Period: isClosed = false, closedAt = null
├── DELETE MonthlySummary WHERE periodId = id
├── ⟳ Revalidar: /, /historial
│
└── Nota: NO elimina el siguiente periodo ni su presupuesto.
    Solo desbloquea el periodo para edición.
```

### 4.7 Actualizar Tasa de Unidad de Valor (v2.0)

```
POST /api/units/[id]/refresh  (o invocado por cron)
│
├── Fetch al providerUrl de la ValueUnit
├── Extraer valor con providerPath (JSONPath)
├── INSERT UnitRate con la nueva tasa
├── ⟳ Revalidar:
│   ├── /          (Dashboard: patrimonio neto si hay assets)
│   └── /activos   (Valores MXN actualizados)
```

### 4.8 Crear/Actualizar Fuente de Ingreso

```
POST|PUT /api/income-sources
│
├── INSERT|UPDATE IncomeSource
├── ⟳ Revalidar:
│   ├── /          (Dashboard: KPI ingreso mensual estimado)
│   └── /ingresos  (Lista de fuentes)
```

---

## 5. Diagrama de Dependencias entre Vistas

Cada vista depende de ciertas entidades. Cuando una entidad cambia, las vistas afectadas necesitan revalidación.

```
Transaction (crear/editar/eliminar)
├── → Dashboard (KPIs, pie chart, bar chart, últimos movimientos)
├── → Movimientos (lista)
└── → Presupuesto (barras de progreso)

Debt (actualizar saldo)
├── → Dashboard (KPI deuda total, ratio deuda/ingreso)
└── → Deudas (cards)

Budget (actualizar montos)
├── → Dashboard (gráfica presupuesto vs gastado)
└── → Presupuesto (tabla, barras)

IncomeSource (crear/editar/eliminar)
├── → Dashboard (KPI ingreso mensual)
├── → Ingresos (lista)
└── → Presupuesto (sobrante quincenal/mensual)

Period (cerrar/reabrir)
├── → Dashboard (tendencia 6 meses)
├── → Historial (tabla anual)
└── → Presupuesto (periodo activo cambia)

Asset (crear/editar) [v2.0]
├── → Dashboard (patrimonio neto)
└── → Activos (lista)

UnitRate (nueva tasa) [v2.0]
├── → Dashboard (patrimonio neto)
└── → Activos (valores MXN)
```

---

## 6. Estrategia de Revalidación

### 6.1 Next.js Revalidation

Usar `revalidatePath()` en Server Actions y API routes:

```ts
// Después de cada mutation exitosa
import { revalidatePath } from 'next/cache'

// Revalidar páginas afectadas
revalidatePath('/')              // Dashboard
revalidatePath('/movimientos')   // Transactions list
revalidatePath('/presupuesto')   // Budget progress
```

No usar `revalidateTag()` en MVP — `revalidatePath()` es suficiente y más simple.

### 6.2 Regla de Consistencia

Nunca modificar datos en una tabla sin revalidar TODAS las vistas que dependen de esa tabla según el diagrama de la sección 5. Si falta una revalidación, el usuario verá datos stale.

### 6.3 Optimistic Updates (Opcional, MVP no lo requiere)

Para el flujo de registro rápido de transacciones, se puede implementar optimistic update en el futuro:
1. El UI agrega la transacción a la lista inmediatamente (antes de la respuesta del server)
2. Si el server confirma: no hacer nada (ya está en la UI)
3. Si el server falla: revertir el cambio en la UI y mostrar toast de error

En MVP, el flujo normal (esperar respuesta → cerrar modal → revalidar) es suficiente.

---

## 7. Periodo Activo: Resolución Automática

El periodo actual se resuelve así:

```ts
async function getCurrentPeriod(): Promise<Period> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  
  // Intentar encontrar el periodo actual
  let period = await prisma.period.findUnique({
    where: { month_year: { month, year } }
  })
  
  // Si no existe, crearlo
  if (!period) {
    period = await prisma.period.create({
      data: {
        month,
        year,
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0), // último día del mes
        isClosed: false,
      }
    })
  }
  
  return period
}
```

Esta función se llama en el layout raíz o en un middleware, garantizando que siempre existe un periodo actual.

---

## 8. Serialización: Boundary entre Server y Client

```
PostgreSQL (bigint) 
    ↓ Prisma devuelve BigInt nativo de JS
Server Component / API Route
    ↓ serializeBigInts() convierte BigInt → String
JSON Response / Props
    ↓ El Client Component recibe strings
Client Component
    ↓ formatMoney(centsStr) → "$1,234.56" para display
    ↓ toCents(userInput) → "123456" para enviar al server
Server Action / API Route
    ↓ BigInt(centsStr) para operaciones con Prisma
PostgreSQL
```

**Regla absoluta:** Ningún Client Component opera con BigInt. Solo recibe y envía strings. La conversión BigInt ↔ String es responsabilidad exclusiva del Server Component, Server Action o API route.

---

## 9. Flujo de Cierre de Mes (Secuencia Completa)

Este es el flujo de datos más complejo de la app. Se documenta paso a paso:

```
1. Usuario navega a Historial → ve tabla anual con meses abiertos/cerrados
2. Usuario clickea "Cerrar Abril 2026"
3. UI muestra modal de confirmación con preview de totales:
   │
   ├── Query: SUM ingresos del periodo → mostrar total
   ├── Query: SUM gastos del periodo → mostrar total
   ├── Query: SUM deudas activas → mostrar total
   └── Calcular: ahorro, tasa de ahorro → mostrar
   │
4. Usuario confirma → Server Action ejecuta transacción:
   │
   ├── INSERT MonthlySummary con los totales calculados
   ├── UPDATE Period SET isClosed=true, closedAt=now()
   ├── INSERT Period (Mayo 2026) si no existe
   └── COPY Budget entries de Abril → Mayo
   │
5. Server Action retorna éxito → revalidatePath para /, /historial, /presupuesto
6. UI:
   ├── Toast: "Abril 2026 cerrado correctamente"
   ├── Historial: nueva fila con datos de Abril
   ├── El selector de periodo cambia a Mayo 2026
   └── Presupuesto: muestra Mayo con los montos copiados de Abril
```

---

## 10. Casos Edge

### 10.1 Transacción en Periodo Cerrado
Si el usuario intenta crear una transacción con fecha en un periodo cerrado, el server rechaza con error 400: "El periodo de [Mes Año] está cerrado. Reabre el periodo para agregar transacciones."

### 10.2 Primer Uso (Base de Datos Vacía)
Al abrir la app por primera vez después del seed:
- Existe el periodo actual con presupuestos en 0
- Existen las categorías default y fuentes de ingreso en 0
- El Dashboard muestra empty states informativos, no errores
- Todas las queries de SUM retornan 0 (COALESCE), nunca NULL

### 10.3 Cambio de Mes Natural
Si el usuario abre la app el 1 de mayo pero el último periodo creado es abril:
- `getCurrentPeriod()` crea mayo automáticamente
- Si abril no fue cerrado, queda abierto (no se cierra automáticamente)
- El Dashboard muestra mayo (vacío), el usuario puede navegar a abril para cerrarlo

### 10.4 Múltiples Tabs Abiertas
No se manejan en MVP. Si el usuario tiene dos tabs y modifica datos en una, la otra mostrará datos stale hasta que recargue. Esto es aceptable para una app de usuario único.

