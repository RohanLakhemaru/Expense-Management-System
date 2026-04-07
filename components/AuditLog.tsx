import React, { useState } from 'react';
import { db } from '../services/db';
import { AuditLog as AuditLogType } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import { ExclamationCircleIcon, ShieldCheckIcon, XMarkIcon, DocumentMagnifyingGlassIcon, ChartBarIcon, CalendarIcon, BanknotesIcon, TagIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export const AuditLog: React.FC = () => {
  const audits = db.getAudits();
  const expenses = db.getExpenses();
  const [selectedAudit, setSelectedAudit] = useState<AuditLogType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ processed: number; anomalies: number } | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number; currentExpenseId?: string } | null>(null);

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 5) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };
  
  const getRiskLabel = (score: number) => {
      if (score >= 8) return 'CRITICAL RISK';
      if (score >= 5) return 'MODERATE RISK';
      return 'LOW RISK';
  };

  const getExpenseDetails = (id: string) => expenses.find(e => e.id === id);

  const selectedExpense = selectedAudit ? getExpenseDetails(selectedAudit.expenseId) : null;

  const handleRefreshAudit = async () => {
    setIsRefreshing(true);
    setRefreshResult(null);
    setProgress({ processed: 0, total: 0 });

    try {
      const result = await db.rerunAnomalyDetectionOnAllExpenses((processed, total, currentExpenseId) => {
        setProgress({ processed, total, currentExpenseId });
      });

      setRefreshResult(result);

    } catch (error) {
      console.error('Error refreshing audit:', error);
      alert('Error refreshing audit. Check console for details.');
    } finally {
      setIsRefreshing(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Anomaly Audit Log</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 shadow-sm flex items-center">
              <ChartBarIcon className="w-4 h-4 mr-2 text-blue-500" />
              Algorithm: IQR (Interquartile Range) Statistical Analysis
          </div>
          <button
            onClick={handleRefreshAudit}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Audit'}
          </button>
        </div>
      </div>

      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-sm font-medium text-blue-700">Processing audit data ({progress.processed}/{progress.total})</div>
              <div className="text-xs text-blue-600">Current expense ID: {progress.currentExpenseId || 'N/A'}</div>
            </div>
            <div className="text-xs text-slate-500">({((progress.total ? progress.processed / progress.total : 0) * 100).toFixed(1)}%)</div>
          </div>
          <div className="h-2 bg-blue-100 rounded-lg overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="text-xs text-slate-700">
            <span className="font-semibold">Live entry:</span> {progress.currentExpenseId ? `Expense ${progress.currentExpenseId} is under audit` : 'No current item'}
          </div>
        </div>
      )}

      {refreshResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">
              Audit refresh complete: {refreshResult.processed} transactions processed, {refreshResult.anomalies} anomalies found
            </span>
          </div>
        </div>
      )}
      {audits.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border border-slate-200">
            <ShieldCheckIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
            <p className="text-slate-500 mt-2">No anomalous transactions detected in your history.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expense</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {audits.map(audit => {
                        const expense = getExpenseDetails(audit.expenseId);
                        if (!expense) return null;
                        return (
                            <tr 
                                key={audit.id} 
                                onClick={() => setSelectedAudit(audit)}
                                className="hover:bg-blue-50 transition cursor-pointer group"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{expense.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{expense.description}</div>
                                    <div className="text-xs text-slate-400">ID: {expense.id.slice(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRiskColor(audit.riskScore)}`}>
                                        Risk: {audit.riskScore}/10
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={audit.flagReason}>
                                    <ExclamationCircleIcon className="w-4 h-4 inline mr-1 text-slate-400" />
                                    {audit.flagReason}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                                    {CURRENCY_SYMBOL}{expense.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button className="text-slate-400 hover:text-blue-600">
                                        <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}

      {/* Detail Report Modal */}
      {selectedAudit && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header - Color Coded */}
                <div className={`px-8 py-6 flex justify-between items-start border-b ${
                    selectedAudit.riskScore >= 8 ? 'bg-red-50 border-red-100' : 
                    selectedAudit.riskScore >= 5 ? 'bg-orange-50 border-orange-100' : 
                    'bg-yellow-50 border-yellow-100'
                }`}>
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <ExclamationTriangleIcon className={`w-6 h-6 ${
                                selectedAudit.riskScore >= 8 ? 'text-red-600' : 
                                selectedAudit.riskScore >= 5 ? 'text-orange-600' : 
                                'text-yellow-600'
                            }`} />
                            <span className={`text-xs font-bold tracking-widest uppercase ${
                                selectedAudit.riskScore >= 8 ? 'text-red-800' : 
                                selectedAudit.riskScore >= 5 ? 'text-orange-800' : 
                                'text-yellow-800'
                            }`}>
                                {getRiskLabel(selectedAudit.riskScore)}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Audit Investigation Report</h3>
                        <p className="text-slate-500 text-sm mt-1">Ref: {selectedAudit.id}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedAudit(null)}
                        className="p-2 bg-white/50 hover:bg-white rounded-full transition text-slate-500 hover:text-slate-800"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Violation Section */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Detection Analysis</h4>
                        <div className="space-y-3">
                            {selectedAudit.flagReason.split('; ').map((reason, idx) => (
                                <div key={idx} className="flex items-start space-x-3">
                                    <ExclamationCircleIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-slate-700 font-medium">{reason}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                            <span className="text-slate-500">Algorithm: <span className="font-semibold text-slate-700">IQR & Frequency Analysis</span></span>
                            <span className="text-slate-500">Detected: <span className="font-semibold text-slate-700">{new Date(selectedAudit.flagDate).toLocaleString()}</span></span>
                        </div>
                    </div>

                    {/* Transaction Snapshot */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Transaction Snapshot</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                    <BanknotesIcon className="w-4 h-4" />
                                    <span className="text-xs uppercase font-bold">Amount</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{CURRENCY_SYMBOL}{selectedExpense.amount.toFixed(2)}</p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg">
                                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span className="text-xs uppercase font-bold">Date</span>
                                </div>
                                <p className="text-lg font-semibold text-slate-700">{selectedExpense.date}</p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg col-span-2">
                                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                    <TagIcon className="w-4 h-4" />
                                    <span className="text-xs uppercase font-bold">Description & Category</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-lg font-semibold text-slate-700">{selectedExpense.description}</p>
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                        {selectedAudit.details || 'General'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={() => setSelectedAudit(null)}
                        className="px-6 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition"
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};