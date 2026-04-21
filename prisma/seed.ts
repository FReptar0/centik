import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import {
  CATEGORIES,
  BUDGET_AMOUNTS,
  INCOME_SOURCES,
  DEBTS,
  VALUE_UNITS,
  MARCH_SUMMARY,
  UNIT_RATES,
} from './seed-data'
import { buildCurrentMonthTransactions, buildPreviousMonthTransactions } from './seed-transactions'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

// --- Seed functions ---

async function seedAdminUser(): Promise<string> {
  const email = process.env.ADMIN_EMAIL || 'fmemije00@gmail.com'
  const password = process.env.ADMIN_PASSWORD || 'centik-dev-2026'
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: {
      email,
      hashedPassword,
      isApproved: true,
      totpEnabled: false,
      isAdmin: true,
    },
  })

  console.log(`Seeded admin user: ${email}`)
  return user.id
}

async function seedCategories(userId: string) {
  const categories: Record<string, string> = {}

  for (const cat of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isDefault: true,
        isActive: true,
        sortOrder: cat.sortOrder,
        userId,
      },
    })
    categories[cat.name] = result.id
  }

  console.log(`Seeded ${CATEGORIES.length} categories`)
  return categories
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0)
}

async function seedPeriods(userId: string) {
  const previousPeriod = await prisma.period.upsert({
    where: { month_year_userId: { month: 3, year: 2026, userId } },
    update: {},
    create: {
      month: 3,
      year: 2026,
      startDate: new Date(2026, 2, 1),
      endDate: lastDayOfMonth(2026, 3),
      isClosed: true,
      closedAt: new Date('2026-04-01T00:00:00Z'),
      userId,
    },
  })

  const currentPeriod = await prisma.period.upsert({
    where: { month_year_userId: { month: 4, year: 2026, userId } },
    update: {},
    create: {
      month: 4,
      year: 2026,
      startDate: new Date(2026, 3, 1),
      endDate: lastDayOfMonth(2026, 4),
      isClosed: false,
      userId,
    },
  })

  console.log('Seeded 2 periods (March 2026 closed, April 2026 open)')
  return { previousPeriod, currentPeriod }
}

async function seedIncomeSources(userId: string) {
  const results: Record<string, { id: string }> = {}

  for (const source of INCOME_SOURCES) {
    const result = await prisma.incomeSource.upsert({
      where: { name: source.name },
      update: {},
      create: {
        name: source.name,
        defaultAmount: source.defaultAmount,
        frequency: source.frequency,
        type: source.type,
        isActive: true,
        userId,
      },
    })
    results[source.name] = result
  }

  console.log(`Seeded ${INCOME_SOURCES.length} income sources`)
  return {
    tersoft: results['TerSoft (Empleo)'],
    freelance: results['Freelance'],
  }
}

async function seedDebts(userId: string) {
  for (const debt of DEBTS) {
    await prisma.debt.upsert({
      where: { name: debt.name },
      update: {},
      create: { ...debt, isActive: true, userId },
    })
  }

  console.log(`Seeded ${DEBTS.length} debts`)
}

async function seedValueUnits(userId: string) {
  const results: Record<string, { id: string }> = {}

  for (const unit of VALUE_UNITS) {
    const result = await prisma.valueUnit.upsert({
      where: { code: unit.code },
      update: {},
      create: { ...unit, isActive: true, userId },
    })
    results[unit.code] = result
  }

  console.log(`Seeded ${VALUE_UNITS.length} value units (MXN, UDI, UMA)`)
  return {
    mxn: results['MXN'],
    udi: results['UDI'],
    uma: results['UMA'],
  }
}

async function seedBudgets(
  categories: Record<string, string>,
  currentPeriodId: string,
  userId: string,
) {
  let count = 0

  for (const [categoryName, quincenalAmount] of Object.entries(BUDGET_AMOUNTS)) {
    const categoryId = categories[categoryName]
    if (!categoryId) continue

    await prisma.budget.upsert({
      where: {
        periodId_categoryId_userId: {
          periodId: currentPeriodId,
          categoryId,
          userId,
        },
      },
      update: {},
      create: {
        periodId: currentPeriodId,
        categoryId,
        quincenalAmount,
        userId,
      },
    })
    count++
  }

  console.log(`Seeded ${count} budget entries for current period`)
}

async function seedTransactions(
  categories: Record<string, string>,
  currentPeriodId: string,
  previousPeriodId: string,
  incomeSources: { tersoft: { id: string }; freelance: { id: string } },
  userId: string,
) {
  const currentCount = await prisma.transaction.count({
    where: { periodId: currentPeriodId },
  })
  const previousCount = await prisma.transaction.count({
    where: { periodId: previousPeriodId },
  })

  if (currentCount === 0) {
    const txns = buildCurrentMonthTransactions(
      userId,
      categories,
      currentPeriodId,
      incomeSources.tersoft.id,
      incomeSources.freelance.id,
    )
    for (const txn of txns) {
      await prisma.transaction.create({ data: txn })
    }
  }

  if (previousCount === 0) {
    const txns = buildPreviousMonthTransactions(
      userId,
      categories,
      previousPeriodId,
      incomeSources.tersoft.id,
    )
    for (const txn of txns) {
      await prisma.transaction.create({ data: txn })
    }
  }

  const totalCurrent = await prisma.transaction.count({
    where: { periodId: currentPeriodId },
  })
  const totalPrevious = await prisma.transaction.count({
    where: { periodId: previousPeriodId },
  })
  console.log(`Seeded transactions: ${totalCurrent} for April, ${totalPrevious} for March`)
}

async function seedMonthlySummary(previousPeriodId: string, userId: string) {
  await prisma.monthlySummary.upsert({
    where: { periodId: previousPeriodId },
    update: {},
    create: {
      periodId: previousPeriodId,
      ...MARCH_SUMMARY,
      userId,
    },
  })

  console.log('Seeded MonthlySummary for March 2026')
}

async function seedUnitRates(
  valueUnits: { udi: { id: string }; uma: { id: string } },
  userId: string,
) {
  const udiRate = UNIT_RATES.udi
  const existingUdiRate = await prisma.unitRate.findUnique({
    where: {
      unitId_date: { unitId: valueUnits.udi.id, date: udiRate.date },
    },
  })
  if (!existingUdiRate) {
    await prisma.unitRate.create({
      data: { unitId: valueUnits.udi.id, ...udiRate, userId },
    })
  }

  const umaRate = UNIT_RATES.uma
  const existingUmaRate = await prisma.unitRate.findUnique({
    where: {
      unitId_date: { unitId: valueUnits.uma.id, date: umaRate.date },
    },
  })
  if (!existingUmaRate) {
    await prisma.unitRate.create({
      data: { unitId: valueUnits.uma.id, ...umaRate, userId },
    })
  }

  console.log('Seeded unit rates for UDI and UMA')
}

// --- Main ---

async function main() {
  const adminUserId = await seedAdminUser()
  const categories = await seedCategories(adminUserId)
  const { previousPeriod, currentPeriod } = await seedPeriods(adminUserId)
  const incomeSources = await seedIncomeSources(adminUserId)
  await seedDebts(adminUserId)
  const valueUnits = await seedValueUnits(adminUserId)
  await seedBudgets(categories, currentPeriod.id, adminUserId)
  await seedTransactions(
    categories,
    currentPeriod.id,
    previousPeriod.id,
    incomeSources,
    adminUserId,
  )
  await seedMonthlySummary(previousPeriod.id, adminUserId)
  await seedUnitRates(valueUnits, adminUserId)

  console.log('\nSeed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
