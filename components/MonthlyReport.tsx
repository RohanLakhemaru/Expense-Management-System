import React, { useMemo } from 'react';
import { db } from '../services/db';
import { CURRENCY_SYMBOL } from '../constants';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, SparklesIcon } from '@heroicons/react/24/outline';

export const MonthlyReport: React.FC = () => {
  const allTxns = db.getAllTransactions();
  const categories = db.getCategories();
  const goals = db.getSavingGoals();

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const currentMonthTxns = allTxns.filter(t => t.date.startsWith(currentMonth));
  const currentMonthExpenses = currentMonthTxns.filter(t => t.type === 'expense');
  const currentMonthIncomes = currentMonthTxns.filter(t => t.type === 'income');

  const totalIncome = currentMonthIncomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Recurring vs Irregular
  const recurringExpenses = currentMonthExpenses
    .filter(t => t.expenseType === 'recurring' || t.expenseType === undefined)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const irregularExpenses = currentMonthExpenses
    .filter(t => t.expenseType === 'irregular')
    .reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown = categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const catExpenses = currentMonthExpenses
          .filter(e => e.categoryId === cat.id)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          name: cat.name,
          value: catExpenses,
          isDurable: cat.isDurable || false
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return breakdown;
  }, [currentMonthExpenses, categories]);

  // Durable vs non-durable
  const durableExpenses = categoryBreakdown
    .filter(c => c.isDurable)
    .reduce((sum, c) => sum + c.value, 0);

  const nonDurableExpenses = categoryBreakdown
    .filter(c => !c.isDurable)
    .reduce((sum, c) => sum + c.value, 0);

  // Saving goals performance
  const activeGoals = goals.filter(g => g.status === 'active');
  const goalProgress = activeGoals.map(goal => {
    const progress = db.getSavingProgress(goal.id);
    const currentMonthProgress = progress.find(p => p.month === currentMonth);
    return {
      goalName: goal.goalName,
      targetAmount: goal.targetAmount,
      amountThisMonth: currentMonthProgress?.amountSaved || 0,
      totalSaved: progress.reduce((sum, p) => sum + p.amountSaved, 0)
    };
  });

  // Generate insights
  const generateInsights = () => {
    const insights: string[] = [];

    if (savingsRate >= 30) {
      insights.push('💚 Excellent savings rate! You\'re managing your money very well.');
    } else if (savingsRate >= 10) {
      insights.push('👍 Good job saving! Keep up the positive momentum.');
    } else if (savingsRate > 0) {
      insights.push('⚠️ You have a small surplus. Consider increasing savings.');
    } else if (savingsRate >= -10) {
      insights.push('⚠️ You\'re spending slightly more than earning. Watch your expenses.');
    } else {
      insights.push('🔴 You\'re overspending significantly. Review your budget.');
    }

    if (recurringExpenses > totalExpenses * 0.8) {
      insights.push('📊 Most of your expenses are recurring, which is predictable.');
    } else if (irregularExpenses > totalExpenses * 0.3) {
      insights.push('🎯 You have significant irregular expenses. Consider planning for large purchases.');
    }

    if (durableExpenses > totalExpenses * 0.4) {
      insights.push('🛍️ You spent a lot on durable goods this month.');
    }

    const topCategory = categoryBreakdown[0];
    if (topCategory && topCategory.value > totalExpenses * 0.4) {
      insights.push(`📌 ${topCategory.name} is your largest expense category (${(topCategory.value / totalExpenses * 100).toFixed(0)}%).`);
    }

    if (goalProgress.length > 0) {
      const goalsOnTrack = goalProgress.filter(g => g.amountThisMonth > 0);
      if (goalsOnTrack.length > 0) {
        insights.push(`✅ You saved towards ${goalsOnTrack.length} saving goal(s) this month.`);
      } else {
        insights.push('💡 You haven\'t contributed to any saving goals this month.');
      }
    }

    return insights;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Monthly Report</h2>
        <p className="text-sm text-slate-500 mt-1">{currentMonth}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Income</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{CURRENCY_SYMBOL}{totalIncome.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{currentMonthIncomes.length} transactions</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{CURRENCY_SYMBOL}{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{currentMonthExpenses.length} transactions</p>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-sm border ${netBalance >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className="text-sm font-medium text-slate-500">Net Balance</p>
          <p className={`text-3xl font-bold mt-2 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{netBalance.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">Savings Rate: {savingsRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Recurring Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{CURRENCY_SYMBOL}{recurringExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">
            {irregularExpenses > 0 && `+ ${CURRENCY_SYMBOL}${irregularExpenses.toLocaleString()} irregular`}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Spending by Category</h3>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No expenses this month</div>
          )}
        </div>

        {/* Expense Types */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Recurring vs Irregular</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Recurring', value: recurringExpenses },
                { name: 'Irregular', value: irregularExpenses }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${CURRENCY_SYMBOL}${value}`} />
              <RechartsTooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Durable vs Non-Durable */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <ArrowTrendingDownIcon className="w-5 h-5 mr-2 text-slate-400" />
            Expense Classification
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-600 mb-1">Non-Durable (Daily Essentials)</p>
              <p className="text-2xl font-bold text-slate-900">{CURRENCY_SYMBOL}{nonDurableExpenses.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{((nonDurableExpenses / totalExpenses) * 100).toFixed(0)}% of expenses</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Durable (Goods & Assets)</p>
              <p className="text-2xl font-bold text-slate-900">{CURRENCY_SYMBOL}{durableExpenses.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{((durableExpenses / totalExpenses) * 100).toFixed(0)}% of expenses</p>
            </div>
          </div>
        </div>

        {/* Income Sources */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-green-500" />
            Income Sources
          </h3>
          <div className="space-y-2">
            {categories
              .filter(c => c.type === 'income')
              .map(cat => {
                const catIncome = currentMonthIncomes
                  .filter(i => i.categoryId === cat.id)
                  .reduce((sum, i) => sum + i.amount, 0);
                return (
                  <div key={cat.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{cat.name}</span>
                    <span className="font-bold text-slate-900">{CURRENCY_SYMBOL}{catIncome.toLocaleString()}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Saving Goals Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" />
            Saving Goals
          </h3>
          {goalProgress.length > 0 ? (
            <div className="space-y-2">
              {goalProgress.map(goal => (
                <div key={goal.goalName} className="text-sm">
                  <p className="text-slate-600">{goal.goalName}</p>
                  <p className="font-bold text-slate-900">
                    {CURRENCY_SYMBOL}{goal.amountThisMonth.toLocaleString()} / {CURRENCY_SYMBOL}{goal.targetAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Total saved: {CURRENCY_SYMBOL}{goal.totalSaved.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No active saving goals</p>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <SparklesIcon className="w-5 h-5 mr-2 text-blue-600" />
          Monthly Insights
        </h3>
        <ul className="space-y-2">
          {generateInsights().map((insight, idx) => (
            <li key={idx} className="text-sm text-slate-700">
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-600 mb-1">Monthly Capacity for Savings</p>
            <p className="text-xl font-bold text-green-600">{CURRENCY_SYMBOL}{Math.max(0, netBalance).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Average Daily Spending</p>
            <p className="text-xl font-bold text-slate-900">{CURRENCY_SYMBOL}{(totalExpenses / 30).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Forecasted Next Month (Recurring)</p>
            <p className="text-xl font-bold text-slate-900">{CURRENCY_SYMBOL}{recurringExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
