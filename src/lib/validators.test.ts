import { describe, it, expect } from 'vitest'
import {
  createTransactionSchema,
  createDebtSchema,
  updateDebtBalanceSchema,
  createBudgetSchema,
  createIncomeSourceSchema,
  createCategorySchema,
  createAssetSchema,
  createValueUnitSchema,
  loginSchema,
  loginPasswordSchema,
  verifyTotpSchema,
  enableTotpSchema,
  disableTotpSchema,
} from './validators'

// Helper to get first error message from a failed parse result
function getFirstError(result: {
  success: false
  error: { issues: { message: string }[] }
}): string {
  return result.error.issues[0].message
}

// Helper to get error message for a specific path
function getErrorAtPath(
  result: { success: false; error: { issues: { message: string; path: PropertyKey[] }[] } },
  path: string,
): string | undefined {
  const issue = result.error.issues.find((i) => i.path.includes(path))
  return issue?.message
}

describe('createTransactionSchema', () => {
  const validMinimal = {
    type: 'INCOME',
    amount: '15075',
    categoryId: 'clxyz123',
    date: '2026-04-05',
  }

  describe('valid inputs', () => {
    it('accepts minimal valid transaction', () => {
      const result = createTransactionSchema.safeParse(validMinimal)
      expect(result.success).toBe(true)
    })

    it('accepts full valid transaction with all optionals', () => {
      const result = createTransactionSchema.safeParse({
        ...validMinimal,
        description: 'Salario',
        paymentMethod: 'TRANSFERENCIA',
        notes: 'Abril',
        incomeSourceId: 'clxyz456',
      })
      expect(result.success).toBe(true)
    })

    it('accepts EXPENSE type', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, type: 'EXPENSE' })
      expect(result.success).toBe(true)
    })

    it('accepts zero amount', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, amount: '0' })
      expect(result.success).toBe(true)
    })

    it('accepts all valid payment methods', () => {
      for (const method of ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA']) {
        const result = createTransactionSchema.safeParse({ ...validMinimal, paymentMethod: method })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('invalid inputs', () => {
    it('rejects invalid type with Spanish message', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, type: 'INVALID' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toBe('El tipo debe ser INCOME o EXPENSE')
      }
    })

    it('rejects missing amount', () => {
      const { amount: _, ...noAmount } = validMinimal
      const result = createTransactionSchema.safeParse(noAmount)
      expect(result.success).toBe(false)
    })

    it('rejects negative amount', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, amount: '-5' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toContain('entero no negativo')
      }
    })

    it('rejects decimal amount', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, amount: '12.50' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toContain('entero no negativo')
      }
    })

    it('rejects non-numeric amount', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, amount: 'abc' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid date format', () => {
      const result = createTransactionSchema.safeParse({ ...validMinimal, date: 'not-a-date' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toContain('formato YYYY-MM-DD')
      }
    })

    it('rejects missing categoryId', () => {
      const { categoryId: _, ...noCategoryId } = validMinimal
      const result = createTransactionSchema.safeParse(noCategoryId)
      expect(result.success).toBe(false)
    })

    it('rejects invalid paymentMethod', () => {
      const result = createTransactionSchema.safeParse({
        ...validMinimal,
        paymentMethod: 'BITCOIN',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getErrorAtPath(result, 'paymentMethod')).toContain('no valido')
      }
    })

    it('rejects missing type', () => {
      const { type: _, ...noType } = validMinimal
      const result = createTransactionSchema.safeParse(noType)
      expect(result.success).toBe(false)
    })
  })
})

describe('createDebtSchema', () => {
  const validCreditCard = {
    name: 'BBVA',
    type: 'CREDIT_CARD',
    currentBalance: '5000000',
    annualRate: 4500,
    creditLimit: '15000000',
  }

  const validLoan = {
    name: 'Prestamo',
    type: 'PERSONAL_LOAN',
    currentBalance: '10000000',
    annualRate: 2500,
  }

  describe('valid inputs', () => {
    it('accepts valid credit card with creditLimit', () => {
      const result = createDebtSchema.safeParse(validCreditCard)
      expect(result.success).toBe(true)
    })

    it('accepts valid personal loan without creditLimit', () => {
      const result = createDebtSchema.safeParse(validLoan)
      expect(result.success).toBe(true)
    })

    it('accepts all debt types', () => {
      for (const debtType of ['CREDIT_CARD', 'PERSONAL_LOAN', 'AUTO_LOAN', 'OTHER']) {
        const data =
          debtType === 'CREDIT_CARD'
            ? { ...validCreditCard, type: debtType }
            : { ...validLoan, type: debtType }
        const result = createDebtSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('accepts all optional fields', () => {
      const result = createDebtSchema.safeParse({
        ...validCreditCard,
        minimumPayment: '100000',
        monthlyPayment: '200000',
        originalAmount: '15000000',
        remainingMonths: 24,
        cutOffDay: 15,
        paymentDueDay: 28,
      })
      expect(result.success).toBe(true)
    })

    it('accepts zero annual rate', () => {
      const result = createDebtSchema.safeParse({ ...validLoan, annualRate: 0 })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects credit card without creditLimit with Spanish message', () => {
      const { creditLimit: _, ...noCreditLimit } = validCreditCard
      const result = createDebtSchema.safeParse(noCreditLimit)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getErrorAtPath(result, 'creditLimit')).toBe(
          'El limite de credito es requerido para tarjetas de credito',
        )
      }
    })

    it('allows personal loan without creditLimit', () => {
      const result = createDebtSchema.safeParse(validLoan)
      expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
      const { name: _, ...noName } = validCreditCard
      const result = createDebtSchema.safeParse(noName)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toBe('El nombre es requerido')
      }
    })

    it('rejects empty name', () => {
      const result = createDebtSchema.safeParse({ ...validCreditCard, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getFirstError(result)).toBe('El nombre no puede estar vacio')
      }
    })

    it('rejects negative annualRate', () => {
      const result = createDebtSchema.safeParse({ ...validLoan, annualRate: -100 })
      expect(result.success).toBe(false)
    })

    it('rejects float annualRate', () => {
      const result = createDebtSchema.safeParse({ ...validLoan, annualRate: 45.5 })
      expect(result.success).toBe(false)
    })

    it('rejects invalid debt type', () => {
      const result = createDebtSchema.safeParse({ ...validLoan, type: 'MORTGAGE' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid currentBalance', () => {
      const result = createDebtSchema.safeParse({ ...validLoan, currentBalance: 'abc' })
      expect(result.success).toBe(false)
    })

    it('rejects cutOffDay out of range', () => {
      const result = createDebtSchema.safeParse({ ...validCreditCard, cutOffDay: 0 })
      expect(result.success).toBe(false)
      const result2 = createDebtSchema.safeParse({ ...validCreditCard, cutOffDay: 32 })
      expect(result2.success).toBe(false)
    })

    it('rejects paymentDueDay out of range', () => {
      const result = createDebtSchema.safeParse({ ...validCreditCard, paymentDueDay: 0 })
      expect(result.success).toBe(false)
      const result2 = createDebtSchema.safeParse({ ...validCreditCard, paymentDueDay: 32 })
      expect(result2.success).toBe(false)
    })
  })
})

describe('updateDebtBalanceSchema', () => {
  it('accepts valid currentBalance', () => {
    const result = updateDebtBalanceSchema.safeParse({ currentBalance: '5000000' })
    expect(result.success).toBe(true)
  })

  it('accepts zero balance', () => {
    const result = updateDebtBalanceSchema.safeParse({ currentBalance: '0' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid currentBalance', () => {
    const result = updateDebtBalanceSchema.safeParse({ currentBalance: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects missing currentBalance', () => {
    const result = updateDebtBalanceSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects negative currentBalance', () => {
    const result = updateDebtBalanceSchema.safeParse({ currentBalance: '-100' })
    expect(result.success).toBe(false)
  })
})

describe('createBudgetSchema', () => {
  const validBudget = {
    entries: [{ categoryId: 'clx1', quincenalAmount: '500000' }],
  }

  it('accepts valid budget with one entry', () => {
    const result = createBudgetSchema.safeParse(validBudget)
    expect(result.success).toBe(true)
  })

  it('accepts budget with multiple entries', () => {
    const result = createBudgetSchema.safeParse({
      entries: [
        { categoryId: 'clx1', quincenalAmount: '500000' },
        { categoryId: 'clx2', quincenalAmount: '300000' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty entries array', () => {
    const result = createBudgetSchema.safeParse({ entries: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getErrorAtPath(result, 'entries')).toContain('al menos una entrada')
    }
  })

  it('rejects invalid amount in entry', () => {
    const result = createBudgetSchema.safeParse({
      entries: [{ categoryId: 'clx1', quincenalAmount: 'abc' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing categoryId in entry', () => {
    const result = createBudgetSchema.safeParse({
      entries: [{ quincenalAmount: '500000' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing entries', () => {
    const result = createBudgetSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('createIncomeSourceSchema', () => {
  const validSource = {
    name: 'TerSoft',
    defaultAmount: '3000000',
    frequency: 'QUINCENAL',
    type: 'EMPLOYMENT',
  }

  it('accepts valid income source', () => {
    const result = createIncomeSourceSchema.safeParse(validSource)
    expect(result.success).toBe(true)
  })

  it('accepts all frequencies', () => {
    for (const freq of ['QUINCENAL', 'MENSUAL', 'SEMANAL', 'VARIABLE']) {
      const result = createIncomeSourceSchema.safeParse({ ...validSource, frequency: freq })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid frequency', () => {
    const result = createIncomeSourceSchema.safeParse({ ...validSource, frequency: 'DIARIO' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name: _, ...noName } = validSource
    const result = createIncomeSourceSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createIncomeSourceSchema.safeParse({ ...validSource, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing defaultAmount', () => {
    const { defaultAmount: _, ...noAmount } = validSource
    const result = createIncomeSourceSchema.safeParse(noAmount)
    expect(result.success).toBe(false)
  })

  it('rejects invalid defaultAmount', () => {
    const result = createIncomeSourceSchema.safeParse({ ...validSource, defaultAmount: '-100' })
    expect(result.success).toBe(false)
  })

  it('rejects empty type', () => {
    const result = createIncomeSourceSchema.safeParse({ ...validSource, type: '' })
    expect(result.success).toBe(false)
  })
})

describe('createCategorySchema', () => {
  const validCategory = {
    name: 'Mascotas',
    icon: 'paw-print',
    color: '#8b5cf6',
    type: 'EXPENSE',
  }

  it('accepts valid category', () => {
    const result = createCategorySchema.safeParse(validCategory)
    expect(result.success).toBe(true)
  })

  it('accepts all category types', () => {
    for (const catType of ['EXPENSE', 'INCOME', 'BOTH']) {
      const result = createCategorySchema.safeParse({ ...validCategory, type: catType })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid color format (no #)', () => {
    const result = createCategorySchema.safeParse({ ...validCategory, color: '8b5cf6' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getErrorAtPath(result, 'color')).toContain('hexadecimal')
    }
  })

  it('rejects invalid color format (too short)', () => {
    const result = createCategorySchema.safeParse({ ...validCategory, color: '#8b5' })
    expect(result.success).toBe(false)
  })

  it('rejects missing icon', () => {
    const { icon: _, ...noIcon } = validCategory
    const result = createCategorySchema.safeParse(noIcon)
    expect(result.success).toBe(false)
  })

  it('rejects empty icon', () => {
    const result = createCategorySchema.safeParse({ ...validCategory, icon: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name: _, ...noName } = validCategory
    const result = createCategorySchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects invalid category type', () => {
    const result = createCategorySchema.safeParse({ ...validCategory, type: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })
})

describe('createAssetSchema', () => {
  const validAsset = {
    name: 'CETES',
    unitId: 'clx1',
    amount: '50000000',
    category: 'INVESTMENT',
  }

  it('accepts valid asset', () => {
    const result = createAssetSchema.safeParse(validAsset)
    expect(result.success).toBe(true)
  })

  it('accepts asset with all optionals', () => {
    const result = createAssetSchema.safeParse({
      ...validAsset,
      institution: 'GBM',
      notes: 'CETES 28 dias',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all asset categories', () => {
    for (const cat of ['PPR', 'INVESTMENT', 'SAVINGS', 'CRYPTO', 'OTHER']) {
      const result = createAssetSchema.safeParse({ ...validAsset, category: cat })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid category', () => {
    const result = createAssetSchema.safeParse({ ...validAsset, category: 'STOCK' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name: _, ...noName } = validAsset
    const result = createAssetSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects invalid amount', () => {
    const result = createAssetSchema.safeParse({ ...validAsset, amount: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects missing unitId', () => {
    const { unitId: _, ...noUnitId } = validAsset
    const result = createAssetSchema.safeParse(noUnitId)
    expect(result.success).toBe(false)
  })
})

describe('createValueUnitSchema', () => {
  const validUnit = {
    code: 'UDI',
    name: 'Unidad de Inversion',
    precision: 6,
  }

  it('accepts valid value unit with minimal fields', () => {
    const result = createValueUnitSchema.safeParse(validUnit)
    expect(result.success).toBe(true)
  })

  it('accepts value unit with all optionals', () => {
    const result = createValueUnitSchema.safeParse({
      ...validUnit,
      providerUrl: 'https://api.banxico.org.mx',
      providerPath: '$.bmx.series[0].datos[0].dato',
      refreshInterval: 24,
    })
    expect(result.success).toBe(true)
  })

  it('accepts zero precision', () => {
    const result = createValueUnitSchema.safeParse({ ...validUnit, precision: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects negative precision', () => {
    const result = createValueUnitSchema.safeParse({ ...validUnit, precision: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects float precision', () => {
    const result = createValueUnitSchema.safeParse({ ...validUnit, precision: 2.5 })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const { code: _, ...noCode } = validUnit
    const result = createValueUnitSchema.safeParse(noCode)
    expect(result.success).toBe(false)
  })

  it('rejects empty code', () => {
    const result = createValueUnitSchema.safeParse({ ...validUnit, code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name: _, ...noName } = validUnit
    const result = createValueUnitSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects negative refreshInterval', () => {
    const result = createValueUnitSchema.safeParse({ ...validUnit, refreshInterval: -1 })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid email and non-empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'secret123' })
    expect(result.success).toBe(false)
  })
})

// --- Phase 29 TOTP schemas (D-30, D-31) ---

describe('loginPasswordSchema', () => {
  it('accepts valid email and non-empty password', () => {
    const result = loginPasswordSchema.safeParse({
      email: 'user@example.com',
      password: 'a',
    })
    expect(result.success).toBe(true)
  })

  it('normalizes email (trim runs after email parse, so no-whitespace valid input round-trips unchanged)', () => {
    const result = loginPasswordSchema.safeParse({
      email: 'user@example.com',
      password: 'a',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('user@example.com')
  })

  it('rejects invalid email with Spanish message', () => {
    const result = loginPasswordSchema.safeParse({ email: 'nope', password: 'a' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailIssue?.message).toBe('Correo electronico no valido')
    }
  })

  it('rejects empty password with Spanish message', () => {
    const result = loginPasswordSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwIssue?.message).toBe('La contrasena es requerida')
    }
  })

  it('rejects missing email field entirely', () => {
    const result = loginPasswordSchema.safeParse({ password: 'a' })
    expect(result.success).toBe(false)
  })
})

describe('verifyTotpSchema', () => {
  it('accepts a 6-digit TOTP code with a valid challenge', () => {
    const result = verifyTotpSchema.safeParse({
      challenge: 'abcdefghij.signature',
      code: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a 9-char backup code (XXXX-XXXX format)', () => {
    const result = verifyTotpSchema.safeParse({
      challenge: 'abcdefghij.signature',
      code: 'AB12-CD34',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from code', () => {
    const result = verifyTotpSchema.safeParse({
      challenge: 'abcdefghij.signature',
      code: '  123456  ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.code).toBe('123456')
  })

  it('rejects challenge shorter than 10 chars with Spanish message', () => {
    const result = verifyTotpSchema.safeParse({ challenge: 'short', code: '123456' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('challenge'))
      expect(issue?.message).toBe('Sesion expirada')
    }
  })

  it('rejects code shorter than 6 chars', () => {
    const result = verifyTotpSchema.safeParse({
      challenge: 'abcdefghij.signature',
      code: '12345',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('code'))
      expect(issue?.message).toBe('Codigo invalido')
    }
  })

  it('rejects code longer than 9 chars', () => {
    const result = verifyTotpSchema.safeParse({
      challenge: 'abcdefghij.signature',
      code: 'AB12-CD345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const result = verifyTotpSchema.safeParse({ challenge: 'abcdefghij.signature' })
    expect(result.success).toBe(false)
  })

  it('rejects missing challenge', () => {
    const result = verifyTotpSchema.safeParse({ code: '123456' })
    expect(result.success).toBe(false)
  })
})

describe('enableTotpSchema', () => {
  it('accepts a valid base32 secret + 6-digit code', () => {
    const result = enableTotpSchema.safeParse({
      secret: 'JBSWY3DPEHPK3PXP',
      code: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-6-digit code (5 digits)', () => {
    const result = enableTotpSchema.safeParse({
      secret: 'JBSWY3DPEHPK3PXP',
      code: '12345',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('code'))
      expect(issue?.message).toBe('Ingresa un codigo de 6 digitos')
    }
  })

  it('rejects a non-6-digit code (7 digits)', () => {
    const result = enableTotpSchema.safeParse({
      secret: 'JBSWY3DPEHPK3PXP',
      code: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects alphabetic chars in code', () => {
    const result = enableTotpSchema.safeParse({
      secret: 'JBSWY3DPEHPK3PXP',
      code: 'abc123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects secret shorter than 16 chars', () => {
    const result = enableTotpSchema.safeParse({
      secret: 'short',
      code: '123456',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('secret'))
      expect(issue?.message).toBe('Reinicia el asistente')
    }
  })

  it('rejects missing secret', () => {
    const result = enableTotpSchema.safeParse({ code: '123456' })
    expect(result.success).toBe(false)
  })
})

describe('disableTotpSchema', () => {
  it('accepts a 6-digit TOTP code', () => {
    const result = disableTotpSchema.safeParse({ code: '123456' })
    expect(result.success).toBe(true)
  })

  it('accepts a 9-char backup code', () => {
    const result = disableTotpSchema.safeParse({ code: 'AB12-CD34' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace', () => {
    const result = disableTotpSchema.safeParse({ code: '  123456  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.code).toBe('123456')
  })

  it('rejects code shorter than 6 chars with Spanish message', () => {
    const result = disableTotpSchema.safeParse({ code: '12345' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('code'))
      expect(issue?.message).toBe('Codigo invalido')
    }
  })

  it('rejects code longer than 9 chars', () => {
    const result = disableTotpSchema.safeParse({ code: 'AB12-CD345' })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const result = disableTotpSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
