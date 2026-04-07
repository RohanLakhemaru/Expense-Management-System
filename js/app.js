import { DB } from './data/db.js';
import { CONFIG } from './config.js';
import { Forecaster } from './logic/algorithms.js';

const Layout = {
    Sidebar: (active) => `
        <div class="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
            <div class="p-6 border-b border-slate-700">
                <h1 class="text-2xl font-bold tracking-tight text-blue-400">Pinnacle<span class="text-white">Manager</span></h1>
                <p class="text-xs text-slate-400 mt-1">${CONFIG.VERSION}</p>
            </div>
            <nav class="flex-1 p-4 space-y-2">
                <a href="#" onclick="window.navigate('dashboard')" class="sidebar-link ${active === 'dashboard' ? 'active' : 'text-slate-400 hover:bg-slate-800'} flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors block">
                    <span>🏠</span> <span class="font-medium">Dashboard</span>
                </a>
                <a href="#" onclick="window.navigate('add_expense')" class="sidebar-link ${active === 'add_expense' ? 'active' : 'text-slate-400 hover:bg-slate-800'} flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors block">
                    <span>➕</span> <span class="font-medium">Add Expense</span>
                </a>
                <a href="#" onclick="window.navigate('reports')" class="sidebar-link ${active === 'reports' ? 'active' : 'text-slate-400 hover:bg-slate-800'} flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors block">
                    <span>📊</span> <span class="font-medium">Reports</span>
                </a>
                <a href="#" onclick="window.navigate('audit')" class="sidebar-link ${active === 'audit' ? 'active' : 'text-slate-400 hover:bg-slate-800'} flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors block">
                    <span>⚠️</span> <span class="font-medium">Audit Log</span>
                </a>
            </nav>
            <div class="p-4 border-t border-slate-800">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">U</div>
                    <div>
                        <p class="text-sm font-medium">Student Admin</p>
                        <p className="text-xs text-slate-500">PHP/MySQL Mode</p>
                    </div>
                </div>
            </div>
        </div>
    `,
    Header: (title) => `
        <header class="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
            <h2 class="text-xl font-bold text-slate-800 capitalize">${title}</h2>
            <div class="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                System Status: Online
            </div>
        </header>
    `
};


const Controllers = {
    dashboard: () => {
        const expenses = DB.getAllExpenses();
        const categories = DB.getCategories();
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
        const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

        const budgetAlerts = categories.map(cat => {
            const spent = monthlyExpenses.filter(e => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0);
            return {
                ...cat,
                spent,
                isOver: spent > cat.budget_limit,
                percent: Math.min(100, (spent/cat.budget_limit)*100)
            };
        });

        const forecastData = Forecaster.predict(expenses);
        const nextMonthForecast = forecastData.find(d => d.type === 'Forecast');
        return `
            <div class="space-y-6 fade-in">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p class="text-sm font-medium text-slate-500">Current Month Spending</p>
                        <h3 class="text-3xl font-bold text-slate-900 mt-2">${CONFIG.CURRENCY}${totalSpent.toFixed(2)}</h3>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p class="text-sm font-medium text-slate-500">Forecast (Next Month)</p>
                        <div class="flex items-end space-x-2 mt-2">
                            <h3 class="text-3xl font-bold text-blue-600">${CONFIG.CURRENCY}${nextMonthForecast ? nextMonthForecast.total.toFixed(2) : '0.00'}</h3>
                            <span class="text-xs text-blue-400 bg-blue-50 px-2 py-1 rounded-full">Holt's Linear</span>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p class="text-sm font-medium text-slate-500">Budget Status</p>
                         <div class="mt-2 text-sm">
                            ${budgetAlerts.filter(b => b.isOver).length > 0 
                                ? `<span class="text-red-600 font-bold flex items-center">⚠️ ${budgetAlerts.filter(b => b.isOver).length} Categories Exceeded</span>` 
                                : `<span class="text-green-600 font-bold">✅ All Budgets On Track</span>`}
                        </div>
                    </div>
                </div>

                <!-- Main Chart Canvas -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Expense Trends & Forecast</h3>
                    <div class="h-80 w-full relative">
                        <canvas id="dashboardChart"></canvas>
                    </div>
                </div>

                <!-- Budget Bars -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Category Budgets</h3>
                    <div class="space-y-4">
                        ${budgetAlerts.map(cat => `
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span class="font-medium text-slate-700">${cat.name}</span>
                                    <span class="${cat.isOver ? 'text-red-600 font-bold' : 'text-slate-500'}">
                                        ${CONFIG.CURRENCY}${cat.spent.toFixed(0)} / ${CONFIG.CURRENCY}${cat.budget_limit}
                                    </span>
                                </div>
                                <div class="w-full bg-slate-100 rounded-full h-2.5">
                                    <div class="h-2.5 rounded-full ${cat.isOver ? 'bg-red-500' : 'bg-green-500'}" style="width: ${cat.percent}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    add_expense: () => {
        const categories = DB.getCategories();
        return `
            <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 fade-in">
                <h2 class="text-2xl font-bold text-slate-800 mb-6">Record New Transaction</h2>
                <div id="form-message" class="hidden mb-4 p-4 rounded-lg"></div>
                <form id="expenseForm" class="space-y-6">
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input type="date" name="date" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                            <input type="number" step="0.01" name="amount" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select name="category_id" required class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea name="description" required class="w-full px-4 py-2 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Receipt Upload (Simulated)</label>
                        <input type="file" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all">Save Transaction</button>
                </form>
            </div>
        `;
    },

    audit: () => {
        const audits = DB.getAudits();
        return `
            <div class="space-y-6 fade-in">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-slate-800">Anomaly Audit Log</h2>
                    <div class="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 shadow-sm">
                        Algorithm: IQR (Interquartile Range)
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Risk Score</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-200">
                            ${audits.length === 0 ? `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No anomalies detected. System is clean.</td></tr>` : 
                                audits.map(a => {
                                    const scoreColor = a.risk_score >= 8 ? 'bg-red-100 text-red-800' : (a.risk_score >= 5 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800');
                                    return `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${a.expense_details?.date || a.flag_date}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${a.expense_details?.description || 'Unknown'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${scoreColor}">Risk: ${a.risk_score}/10</span></td>
                                        <td class="px-6 py-4 text-sm text-slate-600">${a.flag_reason}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">${CONFIG.CURRENCY}${parseFloat(a.amount || a.expense_details?.amount).toFixed(2)}</td>
                                    </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    reports: () => {
        const expenses = DB.getAllExpenses();
        const categories = DB.getCategories();
        return `
             <div class="space-y-6 fade-in">
                <h2 class="text-2xl font-bold text-slate-800">Reports</h2>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">Historical Transaction Data</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-200">
                                ${expenses.slice(0, 50).map(e => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-6 py-4 text-sm text-slate-500">${e.date}</td>
                                        <td class="px-6 py-4 text-sm text-slate-700">${categories.find(c=>c.id === e.category_id)?.name}</td>
                                        <td class="px-6 py-4 text-sm text-slate-900">${e.description}</td>
                                        <td class="px-6 py-4 text-sm font-bold text-right">${CONFIG.CURRENCY}${e.amount.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
        `;
    }
};


function render(viewName) {
    const app = document.getElementById('app');
    
    const sidebar = Layout.Sidebar(viewName);
    const header = Layout.Header(viewName);
    const content = Controllers[viewName]();

    app.innerHTML = `
        ${sidebar}
        <div class="flex-1 flex flex-col h-screen overflow-hidden">
            ${header}
            <main class="flex-1 overflow-y-auto p-8 bg-slate-50">
                <div class="max-w-6xl mx-auto">
                    ${content}
                </div>
            </main>
        </div>
    `;

    if (viewName === 'dashboard') {
        renderDashboardChart();
    }
    if (viewName === 'add_expense') {
        document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    }
}


function renderDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    const expenses = DB.getAllExpenses();
    const data = Forecaster.predict(expenses);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Monthly Spending',
                data: data.map(d => d.total),
                borderColor: data.map(d => d.type === 'Forecast' ? '#9333ea' : '#3b82f6'),
                segment: {
                    borderDash: ctx => ctx.p0.parsed.x >= (data.length - 3) ? [6, 6] : undefined,
                    borderColor: ctx => ctx.p0.parsed.x >= (data.length - 3) ? '#9333ea' : '#3b82f6'
                },
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw} (${data[ctx.dataIndex].type})`
                    }
                }
            }
        }
    });
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const result = DB.addExpense(data);
    
    const msgBox = document.getElementById('form-message');
    msgBox.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-green-50', 'text-green-700');
    
    if (result.audit) {
        msgBox.classList.add('bg-red-50', 'text-red-700');
        msgBox.innerHTML = `<strong>⚠️ Warning:</strong> Expense saved but flagged as anomaly! Risk Score: ${result.audit.risk_score}. Check Audit Log.`;
    } else {
        msgBox.classList.add('bg-green-50', 'text-green-700');
        msgBox.innerHTML = `<strong>✅ Success:</strong> Transaction recorded successfully.`;
    }
    
    e.target.reset();
}


window.navigate = (view) => render(view);
render('dashboard');