import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { SavingGoal, SmartSuggestion } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import { PlusIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const SavingsPlanner: React.FC = () => {
  const [goals, setGoals] = useState<SavingGoal[]>(db.getSavingGoals());
  const [showForm, setShowForm] = useState(false);
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null);
  const [hasHistoricalData, setHasHistoricalData] = useState(false);
  type TransType = "purchase" | "general";
  const [formData, setFormData] = useState({
    goalName: '',
    targetAmount: '',
    deadlineType: 'months',
    deadlineValue: '6',
    type: 'purchase' as TransType,
    notes: ''
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Savings input state
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [monthlyCapacity, setMonthlyCapacity] = useState(0);

  useEffect(() => {
    fetchSmartSuggestion();
  }, []);

  const fetchSmartSuggestion = async () => {
    try {
      const response = await fetch('http://localhost/NewManagementSystem/Expense-Management-System/index.php?action=smart_suggestion', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();

        const hasData =
          (data.avgMonthlyIncome ?? 0) > 0 ||
          (data.avgMonthlyRecurringExpenses ?? 0) > 0 ||
          (data.monthlyCapacity ?? 0) > 0;

        setHasHistoricalData(hasData);
        setMonthlyCapacity(data.monthlyCapacity ?? 0);

        setSuggestion({
          recommendedMonthlyAmount: 0,
          recommendedDeadline: '',
          feasibilityScore: 0,
          monthlyCapacity: data.monthlyCapacity ?? 0,
          reasoning: hasData
            ? `Based on your past 6 months: Average income ${CURRENCY_SYMBOL}${(data.avgMonthlyIncome ?? 0).toFixed(0)}, recurring expenses ${CURRENCY_SYMBOL}${(data.avgMonthlyRecurringExpenses ?? 0).toFixed(0)}`
            : null
        });
      }
    } catch (error) {
      console.error('Failed to fetch smart suggestion', error);
    }
  };

  const calculateDeadlineDate = () => {
    const today = new Date();
    if (formData.deadlineType === 'months') {
      today.setMonth(today.getMonth() + parseInt(formData.deadlineValue));
    } else {
      today.setFullYear(today.getFullYear() + parseInt(formData.deadlineValue));
    }
    return today.toISOString().split('T')[0];
  };

  const validateGoal = (): boolean => {
    setValidationError(null);

    if (!formData.goalName.trim()) {
      setValidationError('Please enter a goal name');
      return false;
    }

    const targetAmount = parseFloat(formData.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setValidationError('Please enter a valid target amount');
      return false;
    }

    const deadline = new Date(calculateDeadlineDate());
    const today = new Date();
    const monthsDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsDiff <= 0) {
      setValidationError('Deadline must be in the future');
      return false;
    }

    // Only run feasibility check if we have historical data to base it on
    if (hasHistoricalData && suggestion && suggestion.monthlyCapacity > 0) {
      const requiredMonthlySaving = targetAmount / monthsDiff;
      const monthlyCapacity = suggestion.monthlyCapacity;

      if (requiredMonthlySaving > monthlyCapacity) {
        const deficit = requiredMonthlySaving - monthlyCapacity;
        setValidationError(
          `❌ This saving goal is NOT achievable based on your past income and expense patterns.\n\n` +
          `Required monthly saving: ${CURRENCY_SYMBOL}${requiredMonthlySaving.toFixed(0)}\n` +
          `Your monthly capacity: ${CURRENCY_SYMBOL}${monthlyCapacity.toFixed(0)}\n` +
          `Shortfall: ${CURRENCY_SYMBOL}${deficit.toFixed(0)}\n\n` +
          `Consider:\n• Extending the deadline\n• Reducing the target amount\n• Increasing your income`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateGoal()) {
      return;
    }

    try {
      const deadline = calculateDeadlineDate();
      const newGoal = await db.addSavingGoal({
        userId: db.getCurrentUser()?.id || '',
        goalName: formData.goalName,
        targetAmount: parseFloat(formData.targetAmount),
        deadline,
        type: formData.type,
        status: 'active',
        notes: formData.notes
      });

      setGoals([...goals, newGoal]);
      setSuccessMessage(`✅ Goal "${formData.goalName}" created successfully!`);
      setFormData({
        goalName: '',
        targetAmount: '',
        deadlineType: 'months',
        deadlineValue: '6',
        type: 'purchase',
        notes: ''
      });
      setShowForm(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setValidationError('Failed to create goal. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.deleteSavingGoal(id);
      setGoals(goals.filter(g => g.id !== id));
    } catch (error) {
      console.error('Failed to delete goal', error);
    }
  };

  const handleAddSavings = (goalId: string) => {
    setSelectedGoalId(goalId);
    setSavingsAmount('');
    setSavingsError(null);
    setShowSavingsModal(true);
  };

  const handleSavingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingsError(null);

    if (!selectedGoalId) return;

    const amount = parseFloat(savingsAmount);
    if (isNaN(amount) || amount <= 0) {
      setSavingsError('Please enter a valid amount');
      return;
    }

    // Check if saving exceeds monthly capacity
    if (monthlyCapacity > 0 && amount > monthlyCapacity) {
      setSavingsError(
        `❌ Cannot save ${CURRENCY_SYMBOL}${amount.toFixed(0)} - exceeds your monthly capacity!\n\n` +
        `Your monthly capacity: ${CURRENCY_SYMBOL}${monthlyCapacity.toFixed(0)}\n` +
        `Trying to save: ${CURRENCY_SYMBOL}${amount.toFixed(0)}\n\n` +
        `💡 Suggestions:\n` +
        `• Reduce saving amount to ${CURRENCY_SYMBOL}${monthlyCapacity.toFixed(0)} or less\n` +
        `• Add a new source of income to increase capacity`
      );
      return;
    }

    try {
      const today = new Date();
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      await db.addSavingProgress(selectedGoalId, monthStr, amount);

      setShowSavingsModal(false);
      setSavingsAmount('');
      
      // Refresh goals to show updated progress
      setGoals(db.getSavingGoals());
      setSuccessMessage(`✅ Saved ${CURRENCY_SYMBOL}${amount.toFixed(0)} to your goal!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setSavingsError('Failed to save amount. Please try again.');
      console.error('Savings error:', error);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const failedGoals = goals.filter(g => g.status === 'failed');

  const calculateProgress = (goal: SavingGoal) => {
    const progress = db.getSavingProgress(goal.id);
    const totalSaved = progress.reduce((sum, p) => sum + p.amountSaved, 0);
    return {
      totalSaved,
      percentage: Math.min(100, (totalSaved / goal.targetAmount) * 100),
      daysLeft: Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Savings Planner</h2>
          <p className="text-sm text-slate-500 mt-1">
            {hasHistoricalData && suggestion
              ? `Monthly saving capacity: ${CURRENCY_SYMBOL}${suggestion.monthlyCapacity.toFixed(0)}`
              : 'Add income & expense records to unlock personalized insights'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Goal
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center">
          <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* No Data Notice — shown only for new users */}
      {!hasHistoricalData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800 mb-1">No financial history yet</h3>
              <p className="text-sm text-amber-700">
                You can still create saving goals — feasibility checks will activate once you've logged some income and expenses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Smart Suggestion Banner — only shown when there's real data */}
      {hasHistoricalData && suggestion && suggestion.reasoning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Smart Savings Insight</h3>
              <p className="text-sm text-blue-800">{suggestion.reasoning}</p>
              <p className="text-sm text-blue-700 mt-2">
                <strong>You can save up to {CURRENCY_SYMBOL}{suggestion.monthlyCapacity.toFixed(0)}/month</strong> based on your spending patterns
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Goal Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 mb-4">Create New Saving Goal</h3>

          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm whitespace-pre-line">
              {validationError}
            </div>
          )}

          {!hasHistoricalData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-700 text-sm">
              ⚠️ Feasibility check is disabled — no financial history found. Your goal will be saved without validation.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={formData.goalName}
                  onChange={e => setFormData({ ...formData, goalName: e.target.value })}
                  placeholder="e.g., Buy Laptop"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount ({CURRENCY_SYMBOL})</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'purchase' | 'general' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="purchase">Purchase Goal</option>
                  <option value="general">General Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                <select
                  value={formData.deadlineType}
                  onChange={e => setFormData({ ...formData, deadlineType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                <input
                  type="number"
                  min="1"
                  value={formData.deadlineValue}
                  onChange={e => setFormData({ ...formData, deadlineValue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this goal..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 h-16"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition"
              >
                Create Goal
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Goals */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Active Goals ({activeGoals.length})</h3>

          {activeGoals.length === 0 ? (
            <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-500 italic">
              No active goals. Create one to get started!
            </div>
          ) : (
            activeGoals.map(goal => {
              const progress = calculateProgress(goal);
              return (
                <div key={goal.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{goal.goalName}</h4>
                      <p className="text-sm text-slate-500">{goal.type === 'purchase' ? '🛍️ Purchase Goal' : '💰 General Savings'}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-bold text-slate-900">{progress.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{CURRENCY_SYMBOL}{progress.totalSaved.toFixed(0)} saved</span>
                      <span>Target: {CURRENCY_SYMBOL}{goal.targetAmount.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      ⏱️ {progress.daysLeft > 0 ? `${progress.daysLeft} days left` : 'Deadline passed'}
                    </span>
                    <span className="text-slate-600">Deadline: {goal.deadline}</span>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-600 mt-2 italic">{goal.notes}</p>
                  )}

                  <button
                    onClick={() => handleAddSavings(goal.id)}
                    className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    + Add This Month's Savings
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Active Goals</p>
            <p className="text-3xl font-bold text-green-600">{activeGoals.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Total Target</p>
            <p className="text-2xl font-bold text-slate-900">
              {CURRENCY_SYMBOL}{activeGoals.reduce((sum, g) => sum + g.targetAmount, 0).toFixed(0)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Total Saved</p>
            <p className="text-2xl font-bold text-slate-900">
              {CURRENCY_SYMBOL}{activeGoals.reduce((sum, g) => sum + calculateProgress(g).totalSaved, 0).toFixed(0)}
            </p>
          </div>

          {completedGoals.length > 0 && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <p className="text-xs font-bold text-green-600 uppercase mb-2">✅ Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedGoals.length}</p>
            </div>
          )}

          {failedGoals.length > 0 && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <p className="text-xs font-bold text-red-600 uppercase mb-2">❌ Failed</p>
              <p className="text-2xl font-bold text-red-600">{failedGoals.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Savings Modal */}
      {showSavingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Add Monthly Savings</h3>
              <button
                onClick={() => setShowSavingsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {savingsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {savingsError}
              </div>
            )}

            <form onSubmit={handleSavingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount Saved This Month ({CURRENCY_SYMBOL})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={savingsAmount}
                  onChange={e => setSavingsAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <p className="font-medium mb-1">This month: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                {monthlyCapacity > 0 && (
                  <p className="text-xs text-blue-600 font-semibold">
                    💡 Max capacity: {CURRENCY_SYMBOL}{monthlyCapacity.toFixed(0)}/month
                  </p>
                )}
                {monthlyCapacity === 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠️ No spending history yet - enter any amount
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Save Amount
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavingsModal(false)}
                  className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};