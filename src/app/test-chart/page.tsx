'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Ene', gasto: 4000 },
  { name: 'Feb', gasto: 3000 },
  { name: 'Mar', gasto: 5000 },
]

export default function TestChartPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-4 text-2xl font-bold text-accent">Recharts Validation</h1>
        <div className="h-80 w-full rounded-lg bg-bg-card p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="gasto" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-text-secondary">
          If you see 3 cyan bars above, Recharts works with React 19.
        </p>
      </div>
    </div>
  )
}
