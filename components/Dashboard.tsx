import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { generateForecast } from '../services/algorithms';
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
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export const Dashboard: React.FC = () => {
  const allTxns = db.getAllTransactions();
  const expenses = db.getExpenses();
  const incomes = db.getIncomes();
  const categories = db.getCategories();
  
  // Calculate Forecast (Expenses Only)
  const forecastData = useMemo(() => generateForecast(expenses), [expenses]);
  
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

  // Prepare chart data (History + 2 months forecast)
  const chartData = useMemo(() => {
    // Get last 6 months of history + 2 months forecast
    const combined = [];
    const monthlyExpenses: Record<string, number> = {};
    const monthlyIncome: Record<string, number> = {};

    allTxns.forEach(e => {
        const m = e.date.slice(0, 7);
        if (e.type === 'expense') monthlyExpenses[m] = (monthlyExpenses[m] || 0) + e.amount;
        else monthlyIncome[m] = (monthlyIncome[m] || 0) + e.amount;
    });

    // Sort months
    const allMonths = Array.from(new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyIncome)])).sort();
    const recentMonths = allMonths.slice(-6);

    recentMonths.forEach(month => {
        combined.push({
            month,
            expense: monthlyExpenses[month] || 0,
            income: monthlyIncome[month] || 0,
            type: 'Actual'
        });
    });
    
    // Add Forecast to combined data
    if(forecastData.length > 0) {
        forecastData.forEach(f => {
            combined.push({ 
                month: f.month, 
                expense: f.total, 
                income: null, 
                type: 'Forecast' 
            });
        });
    }
    return combined;
  }, [allTxns, forecastData]);

  const nextMonthForecast = forecastData[0]?.total || 0;

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
                <h3 className="text-lg font-bold text-slate-800">Cash Flow Trends</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Last 6 Months + Forecast</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
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
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#3b82f6" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
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