import React, { useState } from 'react';
import { db } from '../services/db';
import { Category, TransactionType } from '../types';
import { PlusIcon, CurrencyDollarIcon, TagIcon } from '@heroicons/react/24/outline';
import { CURRENCY_SYMBOL } from '../constants';

export const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(db.getCategories());
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' as TransactionType, limit: '' });

  const refresh = () => setCategories([...db.getCategories()]);

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newCat.name) {
          await db.addCategory(newCat.name, newCat.type, parseFloat(newCat.limit) || 0);
          setNewCat({ name: '', type: 'expense', limit: '' });
          setIsAdding(false);
          refresh();
      }
  };

  const handleBudgetChange = async (id: string, val: string) => {
      const num = parseFloat(val);
      if (!isNaN(num)) {
          await db.updateCategoryBudget(id, num);
          refresh();
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Category & Budget Manager</h2>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Category
            </button>
        </div>

        {/* Add Form */}
        {isAdding && (
            <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-slate-800 mb-4">Create New Category</h3>
                <form onSubmit={handleAdd} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full px-4 py-2 border rounded-lg"
                            placeholder="e.g. Gym, Freelance..."
                            value={newCat.name}
                            onChange={e => setNewCat({...newCat, name: e.target.value})}
                        />
                    </div>
                    <div className="w-40">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                         <select 
                            className="w-full px-4 py-2 border rounded-lg"
                            value={newCat.type}
                            onChange={e => setNewCat({...newCat, type: e.target.value as TransactionType})}
                         >
                             <option value="expense">Expense</option>
                             <option value="income">Income</option>
                         </select>
                    </div>
                    <div className="w-40">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Budget Limit</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-2 border rounded-lg"
                            placeholder="0.00"
                            value={newCat.limit}
                            onChange={e => setNewCat({...newCat, limit: e.target.value})}
                            disabled={newCat.type === 'income'}
                        />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">
                        Save
                    </button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                    <TagIcon className="w-5 h-5 text-slate-500 mr-2" />
                    <h3 className="font-bold text-slate-700">Expense Categories</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Monthly Budget</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {categories.filter(c => c.type === 'expense').map(cat => (
                            <tr key={cat.id}>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{cat.name}</td>
                                <td className="px-6 py-4">
                                    <div className="relative rounded-md shadow-sm max-w-[150px]">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-slate-500 sm:text-sm">{CURRENCY_SYMBOL}</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="block w-full rounded-md border-0 py-1.5 pl-11 pr-2 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                            value={cat.budgetLimit}
                                            onBlur={(e) => handleBudgetChange(cat.id, e.target.value)}
                                            onChange={(e) => {
                                                const newCats = [...categories];
                                                const target = newCats.find(c => c.id === cat.id);
                                                if(target) target.budgetLimit = parseFloat(e.target.value);
                                                setCategories(newCats);
                                            }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Income List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-bold text-slate-700">Income Sources</h3>
                </div>
                <ul className="divide-y divide-slate-200 bg-white">
                    {categories.filter(c => c.type === 'income').map(cat => (
                         <li key={cat.id} className="px-6 py-4 flex justify-between items-center">
                             <span className="text-sm font-medium text-slate-900">{cat.name}</span>
                             <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                         </li>
                    ))}
                    {categories.filter(c => c.type === 'income').length === 0 && (
                        <li className="px-6 py-4 text-sm text-slate-500 italic">No income sources defined.</li>
                    )}
                </ul>
            </div>
        </div>
    </div>
  );
};