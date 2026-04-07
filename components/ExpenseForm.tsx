import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { TransactionType } from '../types';
import { CURRENCY_SYMBOL, BUDGET_WARNING_THRESHOLD } from '../constants';
import { ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export const ExpenseForm: React.FC = () => {
  const [txnType, setTxnType] = useState<TransactionType>('expense');
  const [categories, setCategories] = useState(db.getCategories());
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    categoryId: '',
    description: '',
    receipt: null as File | null
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);

  // Filter categories when type changes
  const availableCategories = categories.filter(c => c.type === txnType);

  useEffect(() => {
      // Default to first category available
      if (availableCategories.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: availableCategories[0].id }));
      }
  }, [txnType]);

  // Real-time budget check
  useEffect(() => {
      if (txnType === 'expense' && formData.categoryId && formData.amount) {
          const amt = parseFloat(formData.amount);
          if (!isNaN(amt)) {
            const status = db.checkBudgetStatus(formData.categoryId, amt);
            if (status) {
                if (status.isOverLimit) {
                    setBudgetWarning(`⚠️ Over Budget! Total will be ${CURRENCY_SYMBOL}${status.totalAfter.toFixed(2)} (${status.percent.toFixed(0)}% of limit).`);
                } else if (status.isNearLimit) {
                    setBudgetWarning(`⚠️ Near Budget. Total will be ${CURRENCY_SYMBOL}${status.totalAfter.toFixed(2)} (${status.percent.toFixed(0)}% of limit).`);
                } else {
                    setBudgetWarning(null);
                }
            }
          }
      } else {
          setBudgetWarning(null);
      }
  }, [formData.amount, formData.categoryId, txnType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
        setMessage({ type: 'error', text: 'Please enter a valid amount' });
        return;
    }
    if (!formData.categoryId) {
        setMessage({ type: 'error', text: 'Please select a category' });
        return;
    }

    try {
        const newTxn = await db.addTransaction({
            date: formData.date,
            amount: parseFloat(formData.amount),
            categoryId: formData.categoryId,
            description: formData.description,
            receiptPath: formData.receipt ? URL.createObjectURL(formData.receipt) : undefined,
            type: txnType
        });

        // Check audit (only relevant for expenses)
        const audits = db.getAudits();
        const triggeredAudit = audits.find(a => a.expenseId === newTxn.id);

        if (triggeredAudit) {
             setMessage({ 
                 type: 'error', 
                 text: `Transaction saved but FLAGGED! Risk Score: ${triggeredAudit.riskScore}. Check Audit Log.` 
            });
        } else {
            setMessage({ type: 'success', text: `${txnType === 'income' ? 'Income' : 'Expense'} saved successfully.` });
        }
        
        // Reset form
        setFormData(prev => ({ ...prev, amount: '', description: '', receipt: null }));
        setBudgetWarning(null);
    } catch (err) {
        setMessage({ type: 'error', text: 'Failed to save transaction.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      
      {/* Type Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
          <button 
            onClick={() => setTxnType('expense')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${txnType === 'expense' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Record Expense
          </button>
          <button 
            onClick={() => setTxnType('income')}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${txnType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Record Income
          </button>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {txnType === 'expense' ? 'Add New Expense' : 'Add New Income'}
      </h2>
      
      {message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
            {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount ({CURRENCY_SYMBOL})</label>
                <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0.00"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select 
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
                {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.name} {c.type === 'expense' ? `(Limit: ${CURRENCY_SYMBOL}${c.budgetLimit})` : ''}
                    </option>
                ))}
            </select>
        </div>

        {budgetWarning && (
            <div className="flex items-center text-sm font-bold text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                {budgetWarning}
            </div>
        )}

        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition h-24"
                placeholder={txnType === 'expense' ? "Dinner at..." : "Freelance project..."}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Receipt/Proof (Optional)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition">
                <div className="space-y-1 text-center">
                    <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                            <span>Upload a file</span>
                            <input 
                                type="file" 
                                className="sr-only" 
                                accept=".jpg,.png,.pdf"
                                onChange={e => setFormData({...formData, receipt: e.target.files ? e.target.files[0] : null})}
                            />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                    {formData.receipt && <p className="text-sm font-bold text-blue-600 mt-2">{formData.receipt.name}</p>}
                </div>
            </div>
        </div>

        <button 
            type="submit" 
            className={`w-full text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all transform hover:scale-[1.01] ${txnType === 'expense' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
            Save {txnType === 'expense' ? 'Expense' : 'Income'}
        </button>
      </form>
    </div>
  );
};