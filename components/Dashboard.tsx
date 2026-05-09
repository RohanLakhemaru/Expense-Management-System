import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { generateSmartForecast, getCombinedForecast } from '../services/algorithms';
import { CURRENCY_SYMBOL } from '../constants';
import { 
    ArrowTrendingUpIcon, 
    ChevronRightIcon, 
    ExclamationTriangleIcon,
    PlusCircleIcon,
    DocumentTextIcon,
    ArrowDownTrayIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/solid';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export const Dashboard: React.FC = () => {
  const allTxns = db.getAllTransactions();
  const expenses = db.getExpenses();
  const incomes = db.getIncomes();
  const categories = db.getCategories();
  
  // Calculate Smart Forecast (Recurring, Non-Durable Expenses Only)
  const categoryForecasts = useMemo(() => generateSmartForecast(expenses, categories), [expenses, categories]);

  const categoryNameById = useMemo(() => {
    return new Map(categories.filter(c => c.type === 'expense').map(c => [c.id, c.name]));
  }, [categories]);

  const categoryChartData = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const validExpenses = expenses.filter(e => {
      const cat = categoryMap.get(e.categoryId);
      return e.expenseType === 'recurring' && !cat?.isDurable;
    });

    const actualTotals: Record<string, Record<string, number>> = {};
    const categoryIds = new Set<string>(Object.keys(categoryForecasts));

    validExpenses.forEach(e => {
      const month = e.date.slice(0, 7);
      if (!actualTotals[month]) actualTotals[month] = {};
      actualTotals[month][e.categoryId] = (actualTotals[month][e.categoryId] || 0) + e.amount;
      categoryIds.add(e.categoryId);
    });

    const actualMonths = Object.keys(actualTotals).sort();
    const recentActualMonths = actualMonths.slice(-6);
    const forecastMonths = Array.from(
      new Set(Object.values(categoryForecasts).flatMap(series => series.map(item => item.month)))
    ).sort();
    const allMonths = [...new Set([...recentActualMonths, ...forecastMonths])];

    return allMonths.map(month => {
      const row: Record<string, any> = { month };
      categoryIds.forEach(catId => {
        const categoryName = categoryNameById.get(catId) || catId;
        const actualValue = actualTotals[month]?.[catId] || 0;
        const forecastPoint = categoryForecasts[catId]?.find(item => item.month === month);
        row[categoryName] = forecastPoint?.total ?? actualValue;
      });
      return row;
    });
  }, [expenses, categories, categoryForecasts, categoryNameById]);

  const activeSavingPlans = useMemo(() => {
    const goals = db.getSavingGoals().filter(goal => goal.status === 'active');
    return goals.map(goal => {
      const totalSaved = db.getSavingProgress(goal.id).reduce((sum, progress) => sum + progress.amountSaved, 0);
      return {
        ...goal,
        totalSaved,
        percentComplete: Math.min(100, goal.targetAmount > 0 ? (totalSaved / goal.targetAmount) * 100 : 0),
        formattedDeadline: new Date(goal.deadline).toLocaleDateString()
      };
    });
  }, []);

  const chartData = categoryChartData;

  const categoryLineKeys = useMemo(() => {
    const keys = new Set<string>();
    chartData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'month') keys.add(key);
      });
    });
    return Array.from(keys);
  }, [chartData]);

  const limitedCategoryKeys = useMemo(() => {
    if (categoryLineKeys.length <= 6) return categoryLineKeys;

    const totals = new Map<string, number>();
    chartData.forEach(row => {
      categoryLineKeys.forEach(key => {
        totals.set(key, (totals.get(key) || 0) + (row[key] || 0));
      });
    });

    return categoryLineKeys
      .slice()
      .sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0))
      .slice(0, 6);
  }, [chartData, categoryLineKeys]);

  // Current Month Stats
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
  const currentMonthIncome = incomes.filter(i => i.date.startsWith(currentMonthStr));
  
  const currentMonthTotalExpense = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthTotalIncome = currentMonthIncome.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = currentMonthTotalIncome - currentMonthTotalExpense;

  // Financial Health Calculation
  const calculateHealth = () => {
      if (currentMonthTotalIncome === 0) return { score: 0, label: 'No Income', color: 'text-slate-400' };
      const savingsRate = ((currentMonthTotalIncome - currentMonthTotalExpense) / currentMonthTotalIncome) * 100;
      
      if (savingsRate < 0) return { score: 20, label: 'Critical Deficit', color: 'text-red-600' };
      if (savingsRate < 10) return { score: 50, label: 'Low Savings', color: 'text-orange-500' };
      if (savingsRate < 30) return { score: 80, label: 'Healthy', color: 'text-blue-500' };
      return { score: 98, label: 'Excellent', color: 'text-green-600' };
  };
  const health = calculateHealth();

  // Budget Calculations
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const budgetStatus = expenseCategories.map(cat => {
    const spent = currentMonthExpenses
      .filter(e => e.categoryId === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      ...cat,
      spent,
      percent: cat.budgetLimit > 0 ? Math.min(100, (spent / cat.budgetLimit) * 100) : 0,
      isOver: cat.budgetLimit > 0 && spent > cat.budgetLimit
    };
  });

  // Identify Alerts
  const alerts = budgetStatus.filter(b => b.isOver || b.percent >= 85);

  const nextMonthForecast = getCombinedForecast(categoryForecasts)[0]?.total || 0;

  return (
    <div className="space-y-6">
      
      {/* Alert Banner */}
      {alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                  <h3 className="text-red-800 font-bold text-sm uppercase tracking-wide">Budget Attention Needed</h3>
                  <div className="mt-1 space-y-1">
                      {alerts.map(cat => (
                          <div key={cat.id} className="text-sm text-red-700 flex items-center">
                              <span className="font-semibold mr-1">{cat.name}:</span>
                              {cat.isOver ? (
                                  <span>Exceeded limit by {CURRENCY_SYMBOL}{(cat.spent - cat.budgetLimit).toFixed(0)}</span>
                              ) : (
                                  <span>Approaching limit ({cat.percent.toFixed(0)}%)</span>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Expenses (This Month)</p>
          <div className="flex items-end space-x-2 mt-2">
            <h3 className="text-2xl font-bold text-slate-900">{CURRENCY_SYMBOL}{currentMonthTotalExpense.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Income (This Month)</p>
          <div className="flex items-end space-x-2 mt-2">
            <h3 className="text-2xl font-bold text-green-600">{CURRENCY_SYMBOL}{currentMonthTotalIncome.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Net Balance</p>
            <div className="flex items-end space-x-2 mt-2">
                <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {netBalance >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{netBalance.toLocaleString()}
                </h3>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 bg-gradient-to-br from-white to-blue-50">
          <p className="text-sm font-medium text-slate-500">Projected Expense (Next)</p>
          <div className="flex items-end space-x-2 mt-2">
            <h3 className="text-2xl font-bold text-purple-600">{CURRENCY_SYMBOL}{nextMonthForecast.toLocaleString()}</h3>
            <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400 mb-1"/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Category Forecast Trends</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Recurring Categories + Forecast</span>
            </div>
            {chartData.length === 0 || limitedCategoryKeys.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">No recurring category forecast data is available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      tickMargin={10}
                      tick={{fontSize: 12}}
                    />
                    <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: number) => val ? val.toLocaleString() : '0'}
                    />
                    <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                    {limitedCategoryKeys.map((categoryKey, index) => (
                      <Line
                        key={categoryKey}
                        type="monotone"
                        dataKey={categoryKey}
                        stroke={[ '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6' ][index % 8]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Actions & Health */}
          <div className="space-y-6">
              {/* Financial Health Widget */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Financial Health</h3>
                  <div className="flex items-center justify-between mb-2">
                      <span className={`text-2xl font-bold ${health.color}`}>{health.label}</span>
                      <ShieldCheckIcon className={`w-8 h-8 ${health.color}`} />
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${health.color.replace('text-', 'bg-')}`} style={{ width: `${health.score}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Based on current savings rate and budget adherence.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ongoing Saving Plans</h3>
                    <span className="text-xs text-slate-400">{activeSavingPlans.length} active</span>
                </div>
                {activeSavingPlans.length === 0 ? (
                  <div className="text-sm text-slate-500">No active saving plans at the moment.</div>
                ) : (
                  <div className="space-y-4">
                    {activeSavingPlans.map(plan => (
                      <div key={plan.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{plan.goalName}</p>
                            <p className="text-xs text-slate-500">Deadline: {plan.formattedDeadline}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-700">{plan.percentComplete.toFixed(0)}%</p>
                        </div>
                        <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${plan.percentComplete}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {CURRENCY_SYMBOL}{plan.totalSaved.toLocaleString()} saved of {CURRENCY_SYMBOL}{plan.targetAmount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Links */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <Link 
                        to="/add"
                        className="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold flex flex-col items-center hover:bg-blue-100 transition"
                      >
                          <PlusCircleIcon className="w-6 h-6 mb-1" />
                          Add Expense
                      </Link>
                      <Link 
                        to="/reports"
                        className="p-3 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold flex flex-col items-center hover:bg-purple-100 transition"
                      >
                          <DocumentTextIcon className="w-6 h-6 mb-1" />
                          View Report
                      </Link>
                      <button 
                        onClick={() => window.alert("Data Export functionality would generate a CSV here.")}
                        className="p-3 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex flex-col items-center hover:bg-slate-100 transition"
                      >
                          <ArrowDownTrayIcon className="w-6 h-6 mb-1" />
                          Export CSV
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Budget Progress & Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Category Budget Status</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {budgetStatus.map((cat) => (
                    <Link key={cat.id} to={`/category/${cat.id}`} className="block group">
                        <div className="flex justify-between text-sm mb-1 group-hover:text-blue-600 transition">
                            <span className="font-medium text-slate-700 flex items-center">
                                {cat.name} <ChevronRightIcon className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                            </span>
                            <span className={`${cat.isOver ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                {CURRENCY_SYMBOL}{cat.spent.toLocaleString()} / {CURRENCY_SYMBOL}{cat.budgetLimit.toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${cat.isOver ? 'bg-red-500' : (cat.percent > 85 ? 'bg-orange-400' : 'bg-green-500')}`} 
                                style={{ width: `${cat.percent}%` }}
                            ></div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Transactions</h3>
             <div className="overflow-y-auto max-h-80">
                <table className="min-w-full">
                    <tbody className="divide-y divide-slate-100">
                        {allTxns.slice(0, 8).map(e => (
                            <tr key={e.id}>
                                <td className="py-3 text-sm text-slate-600">{e.date}</td>
                                <td className="py-3 text-sm font-medium text-slate-800">{e.description}</td>
                                <td className={`py-3 text-sm font-bold text-right ${e.type === 'income' ? 'text-green-600' : 'text-slate-900'}`}>
                                    {e.type === 'income' ? '+' : ''}{CURRENCY_SYMBOL}{e.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
};