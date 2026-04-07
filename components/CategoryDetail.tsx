import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/db';
import { CURRENCY_SYMBOL } from '../constants';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowLeftIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CategoryDetailProps {
    onTransactionClick: (id: string) => void;
    onUpdate: () => void;
}

export const CategoryDetail: React.FC<CategoryDetailProps> = ({ onTransactionClick, onUpdate }) => {
    const { categoryId } = useParams();
    const category = db.getCategories().find(c => c.id === categoryId);
    const allTxns = db.getAllTransactions();
    
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');

    const catTxns = allTxns.filter(t => t.categoryId === categoryId);

    const currentMonthData = useMemo(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            amount: 0,
            date: new Date(year, month, i + 1).toISOString().split('T')[0]
        }));

        catTxns.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === month && tDate.getFullYear() === year) {
                const dayIndex = tDate.getDate() - 1;
                if (days[dayIndex]) {
                    days[dayIndex].amount += t.amount;
                }
            }
        });

        let runningTotal = 0;
        return days.map(d => {
            runningTotal += d.amount;
            return { ...d, cumulative: runningTotal };
        });

    }, [catTxns]);

    if (!category) return <div className="p-8 text-center text-slate-500">Category not found</div>;

    const startEditing = () => {
        setBudgetInput(category.budgetLimit.toString());
        setIsEditingBudget(true);
    };

    const saveBudget = () => {
        const val = parseFloat(budgetInput);
        if (!isNaN(val) && val >= 0) {
            db.updateCategoryBudget(category.id, val);
            setIsEditingBudget(false);
            onUpdate();
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>

            <div className="flex justify-between items-end bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${category.type === 'expense' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {category.type} Category
                    </span>
                    <h2 className="text-3xl font-bold text-slate-800 mt-2">{category.name}</h2>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500 mb-1">Monthly Budget</p>
                    {isEditingBudget ? (
                        <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-bold">{CURRENCY_SYMBOL}</span>
                            <input 
                                type="number" 
                                className="w-24 px-2 py-1 border border-blue-400 rounded-md outline-none font-bold text-slate-700"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                autoFocus
                            />
                            <button onClick={saveBudget} className="p-1 bg-green-100 text-green-600 rounded-md hover:bg-green-200">
                                <CheckIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsEditingBudget(false)} className="p-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-end space-x-2 group">
                            <p className="text-2xl font-bold text-slate-700">
                                {category.budgetLimit > 0 ? `${CURRENCY_SYMBOL}${category.budgetLimit}` : 'No Limit'}
                            </p>
                            {category.type === 'expense' && (
                                <button 
                                    onClick={startEditing}
                                    className="text-slate-300 group-hover:text-blue-500 transition"
                                    title="Edit Budget"
                                >
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Current Month Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Spending Trend (Current Month)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentMonthData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="day" 
                            stroke="#64748b" 
                            label={{ value: 'Day of Month', position: 'insideBottom', offset: -15 }} 
                            tickMargin={5}
                        />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                            formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`}
                            labelFormatter={(label) => `Day ${label}`}
                        />
                        <Line type="monotone" dataKey="amount" name="Daily Amount" stroke="#cbd5e1" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cumulative" name="Cumulative Total" stroke={category.type === 'expense' ? '#3b82f6' : '#10b981'} strokeWidth={3} dot={{r:3}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Transaction History</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {catTxns.map(t => (
                            <tr 
                                key={t.id} 
                                onClick={() => onTransactionClick(t.id)}
                                className="hover:bg-blue-50 cursor-pointer transition"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.date}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{t.description}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${category.type === 'income' ? 'text-green-600' : 'text-slate-900'}`}>
                                    {category.type === 'income' ? '+' : ''}{CURRENCY_SYMBOL}{t.amount.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};