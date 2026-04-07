import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { TransactionType } from '../types';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { CURRENCY_SYMBOL } from '../constants';

interface ReportsProps {
    onTransactionClick: (id: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onTransactionClick }) => {
  const [viewType, setViewType] = useState<TransactionType>('expense');
  const [visibleCount, setVisibleCount] = useState(20);

  const allTxns = db.getAllTransactions();
  const categories = db.getCategories();

  const transactions = allTxns.filter(t => t.type === viewType);
  const relevantCategories = categories.filter(c => c.type === viewType);

  // Reset visible count when switching type
  useEffect(() => {
    setVisibleCount(20);
  }, [viewType]);

  // Scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (
      scrollTop + clientHeight >= scrollHeight - 10 &&
      visibleCount < transactions.length
    ) {
      setVisibleCount(prev => prev + 20);
    }
  };

  const categoryData = useMemo(() => {
    const rawData = relevantCategories.map(cat => {
        const total = transactions
            .filter(e => e.categoryId === cat.id)
            .reduce((sum, e) => sum + e.amount, 0);
        return { name: cat.name, value: total };
    }).filter(d => d.value > 0);

    rawData.sort((a, b) => b.value - a.value);

    if (rawData.length <= 6) return rawData;

    const topItems = rawData.slice(0, 5);
    const othersValue = rawData.slice(5).reduce((sum, item) => sum + item.value, 0);

    if (othersValue > 0) {
        return [...topItems, { name: 'Others', value: othersValue }];
    }
    return topItems;
  }, [relevantCategories, transactions]);

  const monthlyTotals: Record<string, number> = {};
  transactions.forEach(e => {
      const m = e.date.slice(0, 7);
      monthlyTotals[m] = (monthlyTotals[m] || 0) + e.amount;
  });

  const barData = Object.entries(monthlyTotals)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
  const INCOME_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#94a3b8'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Financial Reports</h2>
          <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200">
              <button
                  onClick={() => setViewType('expense')}
                  className={`px-4 py-1 text-sm font-medium rounded-md ${viewType === 'expense' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  Expenses
              </button>
              <button
                  onClick={() => setViewType('income')}
                  className={`px-4 py-1 text-sm font-medium rounded-md ${viewType === 'income' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  Income
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[28rem] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {viewType === 'expense' ? 'Spending' : 'Income'} by Category
            </h3>
            {categoryData.length > 0 ? (
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                dataKey="value"
                                paddingAngle={2}
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell
                                      key={index}
                                      fill={viewType === 'expense'
                                        ? COLORS[index % COLORS.length]
                                        : INCOME_COLORS[index % INCOME_COLORS.length]
                                      }
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 italic">
                  No data available
                </div>
            )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[28rem] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Historical Monthly {viewType === 'expense' ? 'Spending' : 'Income'}
            </h3>
            {barData.length > 0 ? (
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`} />
                            <RechartsTooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
                            <Bar dataKey="total" fill={viewType === 'expense' ? '#3b82f6' : '#10b981'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 italic">
                  No data available
                </div>
            )}
        </div>
      </div>

      {/* Table with Infinite Scroll */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              {viewType === 'expense' ? 'Expense' : 'Income'} Transactions
            </h3>
        </div>

        <div
          className="max-h-96 overflow-y-auto"
          onScroll={handleScroll}
        >
          <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Amount</th>
                  </tr>
              </thead>

              <tbody>
                  {transactions.slice(0, visibleCount).map(e => (
                      <tr
                          key={e.id}
                          onClick={() => onTransactionClick(e.id)}
                          className="hover:bg-blue-50 cursor-pointer"
                      >
                          <td className="px-6 py-4 text-sm text-slate-500">{e.date}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                              {categories.find(c => c.id === e.categoryId)?.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">{e.description}</td>
                          <td className={`px-6 py-4 text-right text-sm font-bold ${
                            viewType === 'income' ? 'text-green-600' : ''
                          }`}>
                              {viewType === 'income' ? '+' : ''}
                              {CURRENCY_SYMBOL}{e.amount.toFixed(2)}
                          </td>
                      </tr>
                  ))}

                  {/* Loader */}
                  {visibleCount < transactions.length && (
                      <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-400">
                              Loading more...
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};