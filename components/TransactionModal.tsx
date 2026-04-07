import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Expense, Category } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import { XMarkIcon, PencilSquareIcon, CheckIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TransactionModalProps {
    transactionId: string | null;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh parent data
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ transactionId, onClose, onUpdate }) => {
    const [transaction, setTransaction] = useState<Expense | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Expense>>({});
    const [amountStr, setAmountStr] = useState<string>(''); // Handle decimal inputs
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        if (transactionId) {
            const tx = db.getTransactionById(transactionId);
            if (tx) {
                setTransaction(tx);
                setEditData(tx);
                setAmountStr(tx.amount.toString());
                setCategories(db.getCategories().filter(c => c.type === tx.type));
            }
        }
        setIsEditing(false);
    }, [transactionId]);

    if (!transactionId || !transaction) return null;

    const handleSave = () => {
        const finalAmount = parseFloat(amountStr);
        if (transaction && !isNaN(finalAmount) && editData.date && editData.categoryId) {
            db.updateTransaction({
                ...transaction,
                ...editData as Expense,
                amount: finalAmount
            });
            setIsEditing(false);
            onUpdate();
            onClose();
        }
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            db.deleteTransaction(transaction.id);
            onUpdate();
            onClose();
        }
    };

    const handleDownload = () => {
        const catName = db.getCategories().find(c => c.id === transaction.categoryId)?.name;
        const reportContent = `
PINNACLE EXPENSE MANAGER - TRANSACTION REPORT
---------------------------------------------
Transaction ID: ${transaction.id}
Date:           ${transaction.date}
Type:           ${transaction.type.toUpperCase()}
Category:       ${catName}
Amount:         ${CURRENCY_SYMBOL}${transaction.amount.toFixed(2)}
Description:    ${transaction.description}
---------------------------------------------
Generated on:   ${new Date().toLocaleString()}
        `;

        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${transaction.date}_${transaction.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const startEditing = () => {
        setEditData(transaction);
        setAmountStr(transaction.amount.toString());
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditData(transaction);
        setAmountStr(transaction.amount.toString());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Transaction Details</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                    <input 
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editData.date || ''}
                                        onChange={e => setEditData({...editData, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={amountStr}
                                        onChange={e => setAmountStr(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                <select 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editData.categoryId || ''}
                                    onChange={e => setEditData({...editData, categoryId: e.target.value})}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                    value={editData.description || ''}
                                    onChange={e => setEditData({...editData, description: e.target.value})}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                <div>
                                    <p className="text-sm text-slate-500">Amount</p>
                                    <h2 className={`text-3xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-slate-900'}`}>
                                        {transaction.type === 'income' ? '+' : ''}{CURRENCY_SYMBOL}{transaction.amount.toFixed(2)}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {categories.find(c => c.id === transaction.categoryId)?.name || 'Unknown Category'}
                                    </span>
                                    <p className="text-sm text-slate-400 mt-1">{transaction.date}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Description</p>
                                <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {transaction.description}
                                </p>
                            </div>
                            {transaction.receiptPath && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Receipt</p>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center space-x-2 text-blue-600 text-sm cursor-pointer hover:underline">
                                        <span>📄 View Attached Receipt</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={handleDelete}
                                className="flex items-center text-red-600 hover:text-red-700 font-medium text-sm transition"
                            >
                                <TrashIcon className="w-4 h-4 mr-1" /> Delete
                            </button>
                            <div className="flex space-x-3">
                                <button 
                                    onClick={cancelEditing}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center"
                                >
                                    <CheckIcon className="w-4 h-4 mr-2" /> Save Changes
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleDownload}
                                className="flex items-center text-slate-600 hover:text-blue-600 font-medium text-sm transition"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4 mr-1" /> Download
                            </button>
                            <button 
                                onClick={startEditing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center"
                            >
                                <PencilSquareIcon className="w-4 h-4 mr-2" /> Edit Transaction
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};