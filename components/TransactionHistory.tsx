import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { CURRENCY_SYMBOL } from '../constants';
import { 
    ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, 
    PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';
import { 
    ArrowLeftIcon, 
    ChartBarIcon, 
    ChatBubbleLeftEllipsisIcon,
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    ShieldCheckIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface TransactionHistoryProps {
    onTransactionClick: (id: string) => void;
}

// --- YEAR DETAIL VIEW ---
const HistoryYearDetail: React.FC<{ year: string }> = ({ year }) => {
    const navigate = useNavigate();
    const allTxns = db.getAllTransactions();
    const categories = db.getCategories();

    // Filter for Year
    const yearTxns = allTxns.filter(t => t.date.startsWith(year));

    const totalIncome = yearTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = yearTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Monthly Breakdown for Bar Chart
    const monthlyData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => {
            const mStr = String(i + 1).padStart(2, '0');
            return {
                month: new Date(parseInt(year), i, 1).toLocaleString('default', { month: 'short' }),
                monthId: `${year}-${mStr}`,
                income: 0,
                expense: 0
            };
        });

        yearTxns.forEach(t => {
            const mIndex = new Date(t.date).getMonth();
            if (t.type === 'income') months[mIndex].income += t.amount;
            else months[mIndex].expense += t.amount;
        });

        return months;
    }, [yearTxns, year]);

    // Category Breakdown (Top 5 + Others)
    const pieData = useMemo(() => {
        const expenseTxns = yearTxns.filter(t => t.type === 'expense');
        const rawData = categories
            .filter(c => c.type === 'expense')
            .map(c => ({
                name: c.name,
                value: expenseTxns.filter(t => t.categoryId === c.id).reduce((sum, t) => sum + t.amount, 0)
            }))
            .filter(d => d.value > 0);
        
        rawData.sort((a, b) => b.value - a.value);

        if (rawData.length <= 5) return rawData;
        
        const top5 = rawData.slice(0, 5);
        const othersValue = rawData.slice(5).reduce((sum, item) => sum + item.value, 0);
        return [...top5, { name: 'Others', value: othersValue }];
    }, [yearTxns, categories]);

    // --- BASIC ANALYSIS ENGINE (Student Project Version) ---
    const { observations, monthlyStatus } = useMemo(() => {
        const observations: string[] = [];
        const monthlyStatus: Record<string, { status: 'ok' | 'warning' | 'critical', msg: string }> = {};

        // 1. Check if we have data
        const activeMonths = monthlyData.filter(m => m.income > 0 || m.expense > 0);
        
        if (activeMonths.length === 0) {
             return { observations: ["No data recorded yet."], monthlyStatus: {} };
        }

        // 2. Simple Average
        const avgExpense = activeMonths.reduce((sum, m) => sum + m.expense, 0) / activeMonths.length;
        let overspentCount = 0;

        // 3. Simple Loop to check each month
        monthlyData.forEach(m => {
             // Skip empty months
             if (m.income === 0 && m.expense === 0) {
                 monthlyStatus[m.monthId] = { status: 'ok', msg: '-' };
                 return;
             }

             // Logic: Simple check if expenses > income (Critical) or > average (Warning)
             if (m.expense > m.income) {
                 monthlyStatus[m.monthId] = { status: 'critical', msg: 'Overspent' };
                 overspentCount++;
             } else if (m.expense > avgExpense) {
                 monthlyStatus[m.monthId] = { status: 'warning', msg: 'Heavy' };
             } else {
                 monthlyStatus[m.monthId] = { status: 'ok', msg: 'Good' };
             }
        });

        // 4. Humanized / Simple Observations
        if (totalExpense > totalIncome) {
             observations.push("Uh oh, it looks like you spent more than you earned this year.");
        } else {
             observations.push("You're in the green! You made more money than you spent.");
        }

        if (overspentCount > 0) {
            observations.push(`You went over budget in ${overspentCount} month(s) this year.`);
        } else {
            observations.push("You didn't overspend in any single month. Nice work!");
        }

        // Simple category observation
        if (pieData.length > 0) {
            observations.push(`Most of your money went to ${pieData[0].name}.`);
        }

        return { observations, monthlyStatus };
    }, [monthlyData, totalIncome, totalExpense, pieData]);


    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button onClick={() => navigate('/history')} className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to History List
            </button>

            {/* Annual Header */}
            <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <ChartBarIcon className="w-6 h-6 text-blue-400" />
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Annual Report</span>
                    </div>
                    <h2 className="text-4xl font-bold">{year}</h2>
                </div>
                <div className="flex gap-8 text-right">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income</p>
                        <p className="text-2xl font-bold text-green-400">+{CURRENCY_SYMBOL}{totalIncome.toFixed(0)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expense</p>
                        <p className="text-2xl font-bold text-white">{CURRENCY_SYMBOL}{totalExpense.toFixed(0)}</p>
                    </div>
                    <div className="pl-6 border-l border-slate-700">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Result</p>
                        <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {netBalance >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Monthly Performance</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" tick={{fontSize: 12}} />
                            <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                            <Tooltip 
                                formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(0)}`}
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle"/>
                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Yearly Expense Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Expense Distribution ({year})</h3>
                    <div className="flex-1 w-full min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Simple Observations Section */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 text-white border border-slate-700">
                <div className="flex items-start gap-4">
                     <div className="bg-blue-500/20 p-3 rounded-lg hidden md:block">
                        <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-blue-400" />
                     </div>
                     <div className="flex-1">
                         <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-blue-400 mr-2 md:hidden" />
                            Yearly Observations
                         </h3>
                         <ul className="space-y-3">
                             {observations.map((obs, i) => (
                                 <li key={i} className="flex items-start text-sm text-slate-300">
                                     <CheckCircleIcon className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                     {obs}
                                 </li>
                             ))}
                         </ul>
                     </div>
                </div>
            </div>

            {/* Detailed Monthly Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Monthly Breakdown</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Income</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Expense</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {monthlyData.map(m => {
                            const net = m.income - m.expense;
                            if (m.income === 0 && m.expense === 0) return null; // Skip empty months
                            const status = monthlyStatus[m.monthId];

                            return (
                                <tr key={m.month} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{m.month}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">+{CURRENCY_SYMBOL}{m.income.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-700 font-medium">{CURRENCY_SYMBOL}{m.expense.toFixed(2)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {net >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{net.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${status.status === 'critical' ? 'bg-red-100 text-red-800' : 
                                              status.status === 'warning' ? 'bg-orange-100 text-orange-800' : 
                                              'bg-green-100 text-green-800'}`}>
                                            {status.msg}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => navigate(`/history/${m.monthId}`)}
                                            className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- MONTH DETAIL VIEW ---
const HistoryDetail: React.FC<{ monthId: string, onTransactionClick: (id: string) => void }> = ({ 
    monthId, onTransactionClick 
}) => {
    const navigate = useNavigate();
    const allTxns = db.getAllTransactions();
    const categories = db.getCategories();
    
    const [yearStr, monthStr] = monthId.split('-');
    const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const monthlyTxns = allTxns.filter(t => t.date.startsWith(monthId));
    const totalIncome = monthlyTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = monthlyTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Daily Trend Data
    const dailyData = useMemo(() => {
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            expense: 0,
            income: 0,
            date: `${monthId}-${String(i+1).padStart(2, '0')}`
        }));

        monthlyTxns.forEach(t => {
            const d = new Date(t.date).getDate() - 1;
            if (days[d]) {
                if (t.type === 'expense') days[d].expense += t.amount;
                else days[d].income += t.amount;
            }
        });
        return days;
    }, [monthlyTxns, monthId, yearStr, monthStr]);

    // Category Pie Data with "Others" Grouping
    const pieData = useMemo(() => {
        const expenseTxns = monthlyTxns.filter(t => t.type === 'expense');
        const rawData = categories
            .filter(c => c.type === 'expense')
            .map(c => ({
                name: c.name,
                value: expenseTxns.filter(t => t.categoryId === c.id).reduce((sum, t) => sum + t.amount, 0)
            }))
            .filter(d => d.value > 0);
        
        // Sort
        rawData.sort((a, b) => b.value - a.value);

        // Group into Others if > 5 items
        if (rawData.length <= 5) return rawData;

        const top4 = rawData.slice(0, 4);
        const othersValue = rawData.slice(4).reduce((sum, item) => sum + item.value, 0);
        
        if (othersValue > 0) {
            return [...top4, { name: 'Others', value: othersValue }];
        }
        return top4;
    }, [monthlyTxns, categories]);

    // --- MONTHLY ANALYSIS & AUDIT ENGINE ---
    const { monthlyObservations, monthAudits } = useMemo(() => {
        const obs: string[] = [];
        
        // 1. Basic Income vs Expense
        if (totalExpense > totalIncome) {
            obs.push("You spent more than you earned this month. Be careful!");
        } else if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
            if (savingsRate > 20) {
                obs.push("Great job! You saved a healthy portion of your income.");
            } else {
                obs.push("You saved some money, but it was a bit tight.");
            }
        }

        // 2. Category Analysis
        if (pieData.length > 0) {
            obs.push(`Your biggest expense category was ${pieData[0].name}.`);
        } else {
            obs.push("No expenses recorded yet.");
        }

        // 3. Audit Log Filter
        // Filter audits that belong to transactions in this specific month
        const audits = db.getAudits().filter(a => {
            const tx = allTxns.find(t => t.id === a.expenseId);
            return tx && tx.date.startsWith(monthId);
        });

        if (audits.length > 0) {
            obs.push(`Warning: ${audits.length} suspicious transaction(s) detected.`);
        } else {
            obs.push("Security Check: No anomalies detected this month.");
        }

        return { monthlyObservations: obs, monthAudits: audits };
    }, [totalIncome, totalExpense, pieData, monthId, allTxns]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button onClick={() => navigate('/history')} className="flex items-center text-slate-500 hover:text-blue-600 transition mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to History List
            </button>

            {/* Monthly Summary Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                        Monthly Report
                    </span>
                    <h2 className="text-3xl font-bold text-slate-800 mt-2">{monthName}</h2>
                </div>
                <div className="flex gap-8 text-right">
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Income</p>
                        <p className="text-xl font-bold text-green-600">+{CURRENCY_SYMBOL}{totalIncome.toFixed(2)}</p>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expense</p>
                        <p className="text-xl font-bold text-slate-800">{CURRENCY_SYMBOL}{totalExpense.toFixed(2)}</p>
                     </div>
                     <div className="pl-6 border-l border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net</p>
                        <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {netBalance >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{Math.abs(netBalance).toFixed(2)}
                        </p>
                     </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Flow */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Daily Cash Flow</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="day" stroke="#64748b" tick={{fontSize: 12}} />
                            <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                            <Tooltip 
                                formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`}
                                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px' }}
                            />
                            <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                            <Line type="monotone" dataKey="expense" name="Expense" stroke="#3b82f6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Dist */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Expense Breakdown</h3>
                    <div className="flex-1 w-full min-h-0">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(2)}`} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        layout="horizontal"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">No expenses recorded</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analysis & Audit Section (Side by Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Monthly Observations */}
                <div className="bg-slate-800 rounded-xl shadow-lg p-6 text-white border border-slate-700">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Monthly Observations</h3>
                            <ul className="space-y-2">
                                {monthlyObservations.map((obs, i) => (
                                    <li key={i} className="flex items-start text-sm text-slate-300">
                                        <CheckCircleIcon className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                        {obs}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 2. Security / Audit Log */}
                <div className={`${monthAudits.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} rounded-xl shadow-sm border p-6`}>
                     <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${monthAudits.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                            {monthAudits.length > 0 ? (
                                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                            ) : (
                                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-lg font-bold mb-2 ${monthAudits.length > 0 ? 'text-red-800' : 'text-green-800'}`}>
                                Security & Anomalies
                            </h3>
                            {monthAudits.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-red-700 font-medium">
                                        {monthAudits.length} anomaly(s) detected this month.
                                    </p>
                                    <ul className="space-y-1">
                                        {monthAudits.slice(0, 3).map(a => (
                                            <li key={a.id} className="text-xs text-red-600 flex items-center">
                                                • {a.flagReason}
                                            </li>
                                        ))}
                                    </ul>
                                    {monthAudits.length > 3 && <p className="text-xs text-red-500 mt-1">...and {monthAudits.length - 3} more.</p>}
                                    <button onClick={() => navigate('/audit')} className="mt-2 text-xs font-bold text-red-800 hover:underline">
                                        View Audit Log &rarr;
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-green-700">
                                    No suspicious transactions were flagged by the algorithm this month.
                                </p>
                            )}
                        </div>
                     </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Transactions for {monthName}</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Day</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {monthlyTxns.map(t => {
                            const audit = monthAudits.find(a => a.expenseId === t.id);
                            let rowClass = "hover:bg-blue-50 cursor-pointer transition border-l-4 border-transparent";
                            if (audit) {
                                if (audit.riskScore >= 8) rowClass = "bg-red-50 hover:bg-red-100 cursor-pointer transition border-l-4 border-red-500";
                                else if (audit.riskScore >= 5) rowClass = "bg-orange-50 hover:bg-orange-100 cursor-pointer transition border-l-4 border-orange-500";
                                else rowClass = "bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition border-l-4 border-yellow-500";
                            }

                            return (
                                <tr 
                                    key={t.id} 
                                    onClick={() => onTransactionClick(t.id)}
                                    className={rowClass}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(t.date).getDate()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                        {categories.find(c => c.id === t.categoryId)?.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-900">
                                        <div className="flex items-center">
                                            {audit && (
                                                <div className="mr-2 text-red-600" title={`Risk Score: ${audit.riskScore}/10`}>
                                                    <ExclamationCircleIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                            {t.description}
                                            {audit && <span className="ml-2 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Risk: {audit.riskScore}</span>}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-slate-900'}`}>
                                        {t.type === 'income' ? '+' : ''}{CURRENCY_SYMBOL}{t.amount.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- LIST OVERVIEW ---
const HistoryList: React.FC = () => {
    const navigate = useNavigate();
    const allTxns = db.getAllTransactions();
    const allAudits = db.getAudits(); // Added to check for risks at high level

    // Global Totals Calculation
    const grandTotalExpense = allTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const grandTotalIncome = allTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const grandNet = grandTotalIncome - grandTotalExpense;

    // Monthly Grouping
    const months = useMemo(() => {
        const grouped: Record<string, { id: string, name: string, expense: number, income: number, daily: any[] }> = {};
        
        allTxns.forEach(t => {
            const mKey = t.date.slice(0, 7); // YYYY-MM
            if (!grouped[mKey]) {
                const dateObj = new Date(t.date);
                grouped[mKey] = {
                    id: mKey,
                    name: dateObj.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    expense: 0,
                    income: 0,
                    daily: Array(31).fill(0).map((_, i) => ({ day: i+1, expense: 0, income: 0 }))
                };
            }

            const day = new Date(t.date).getDate() - 1;

            if (t.type === 'expense') {
                grouped[mKey].expense += t.amount;
                if(grouped[mKey].daily[day]) grouped[mKey].daily[day].expense += t.amount;
            } else {
                grouped[mKey].income += t.amount;
                if(grouped[mKey].daily[day]) grouped[mKey].daily[day].income += t.amount;
            }
        });

        return Object.values(grouped).sort((a, b) => b.id.localeCompare(a.id));
    }, [allTxns]);

    // Yearly Grouping
    const years = useMemo(() => {
        const grouped: Record<string, { id: string, income: number, expense: number }> = {};
        allTxns.forEach(t => {
            const yKey = t.date.slice(0, 4); // YYYY
            if (!grouped[yKey]) grouped[yKey] = { id: yKey, income: 0, expense: 0 };
            
            if (t.type === 'income') grouped[yKey].income += t.amount;
            else grouped[yKey].expense += t.amount;
        });
        return Object.values(grouped).sort((a,b) => b.id.localeCompare(a.id));
    }, [allTxns]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-slate-800">Financial History</h2>

            {/* Lifetime Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income (All Time)</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">+{CURRENCY_SYMBOL}{grandTotalIncome.toFixed(0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses (All Time)</p>
                         <p className="text-2xl font-bold text-slate-800 mt-2">{CURRENCY_SYMBOL}{grandTotalExpense.toFixed(0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                     <div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Net Balance</p>
                         <p className={`text-2xl font-bold mt-2 ${grandNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {grandNet >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{grandNet.toFixed(0)}
                         </p>
                     </div>
                </div>
            </div>

             {/* Yearly Archives */}
             {years.length > 0 && (
                <>
                    <h3 className="text-lg font-bold text-slate-700 mt-8">Yearly Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {years.map(y => {
                            const net = y.income - y.expense;
                            const pieData = [
                                { name: 'Expense', value: y.expense },
                                { name: 'Income', value: y.income }
                            ].filter(d => d.value > 0);

                            return (
                                <div 
                                    key={y.id} 
                                    onClick={() => navigate(`/history/${y.id}`)}
                                    className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6 cursor-pointer hover:scale-[1.02] transition group relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Year</span>
                                            <h3 className="text-3xl font-bold text-white mt-1">{y.id}</h3>
                                        </div>
                                        {/* Mini Pie Chart for Year */}
                                        <div className="w-12 h-12">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={15}
                                                        outerRadius={25}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#10b981' : '#3b82f6'} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Income</span>
                                            <span className="text-green-400 font-bold">+{CURRENCY_SYMBOL}{y.income.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Expense</span>
                                            <span className="text-white font-bold">{CURRENCY_SYMBOL}{y.expense.toFixed(0)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-700 flex justify-between text-sm">
                                            <span className="text-slate-400">Net</span>
                                            <span className={`font-bold ${net >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                                {net >= 0 ? '+' : ''}{CURRENCY_SYMBOL}{Math.abs(net).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Decorative bg element */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition"></div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            
            <h3 className="text-lg font-bold text-slate-700 mt-8">Monthly Archives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {months.map(m => {
                    const pieData = [
                        { name: 'Expense', value: m.expense },
                        { name: 'Income', value: m.income }
                    ].filter(d => d.value > 0);

                    // Check for risks in this month
                    const risks = allAudits.filter(a => {
                        const t = allTxns.find(tx => tx.id === a.expenseId);
                        return t && t.date.startsWith(m.id);
                    });
                    const hasRisk = risks.length > 0;
                    const maxRiskScore = hasRisk ? Math.max(...risks.map(r => r.riskScore)) : 0;

                    let borderClass = "border-slate-200 hover:border-blue-400";
                    let riskColorText = "text-slate-400";
                    
                    if (hasRisk) {
                        if (maxRiskScore >= 8) {
                            borderClass = "border-red-200 bg-red-50 hover:border-red-400";
                            riskColorText = "text-red-600";
                        } else {
                            borderClass = "border-orange-200 bg-orange-50 hover:border-orange-400";
                            riskColorText = "text-orange-600";
                        }
                    }

                    return (
                        <div 
                            key={m.id} 
                            onClick={() => navigate(`/history/${m.id}`)}
                            className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition group ${borderClass}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-lg font-bold text-slate-800 group-hover:text-blue-600 transition`}>{m.name}</h3>
                                        {hasRisk && (
                                            <ExclamationTriangleIcon 
                                                className={`w-5 h-5 ${riskColorText} animate-pulse`} 
                                                title={`${risks.length} Risk Factor(s)`}
                                            />
                                        )}
                                    </div>
                                    {hasRisk ? (
                                        <p className={`text-xs ${riskColorText} uppercase font-bold tracking-wider mt-1`}>
                                            {risks.length} Risk Factor{risks.length > 1 ? 's' : ''}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Overview</p>
                                    )}
                                </div>
                                <div className="w-10 h-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={10}
                                                outerRadius={20}
                                                paddingAngle={pieData.length > 1 ? 5 : 0}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#10b981' : '#3b82f6'} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                cursor={false}
                                                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', fontSize: '10px', borderRadius: '4px', border: 'none' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(val: number) => `${CURRENCY_SYMBOL}${val.toFixed(0)}`}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4 text-sm">
                                <div>
                                    <span className="block text-slate-400 text-xs">Expense</span>
                                    <span className="font-bold text-slate-700">{CURRENCY_SYMBOL}{m.expense.toFixed(0)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-slate-400 text-xs">Income</span>
                                    <span className="font-bold text-green-600">{CURRENCY_SYMBOL}{m.income.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Mini Graph (Sparkline-ish) */}
                            <div className="h-16 w-full bg-slate-50 rounded-lg overflow-hidden relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={m.daily} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                        <Line type="monotone" dataKey="expense" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-1">Daily Income & Expense Trend</p>
                        </div>
                    );
                })}
            </div>

            {months.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <p>No transaction history available.</p>
                </div>
            )}
        </div>
    );
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ onTransactionClick }) => {
    const { monthId } = useParams();

    if (monthId) {
        // If ID is just 4 digits, it is a Year (e.g., 2023)
        if (monthId.length === 4) {
            return <HistoryYearDetail year={monthId} />;
        }
        // Otherwise it is Year-Month (e.g., 2023-01)
        return <HistoryDetail monthId={monthId} onTransactionClick={onTransactionClick} />;
    }
    return <HistoryList />;
};