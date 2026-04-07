import { CONFIG } from '../config.js';
import { AnomalyDetector } from '../logic/algorithms.js';

class DatabaseManager {
    constructor() {
        this.tables = {
            expenses: [],
            categories: [],
            audits: [],
            users: []
        };
        this.init();
    }

    init() {
        const stored = localStorage.getItem('pem_db');
        if (stored) {
            this.tables = JSON.parse(stored);
        } else {
            this.seed();
        }
    }

    save() {
        localStorage.setItem('pem_db', JSON.stringify(this.tables));
    }

    seed() {
        this.tables.categories = CONFIG.INITIAL_CATEGORIES;
        
        const expenses = [];
        const today = new Date();
        for (let i = 12; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const numTxns = Math.floor(Math.random() * 8) + 3;
            
            for (let j = 0; j < numTxns; j++) {
                const day = Math.floor(Math.random() * 28) + 1;
                const cat = this.tables.categories[Math.floor(Math.random() * this.tables.categories.length)];
                
                const amt = (Math.random() * 80) + 20 + ((12-i) * 2);
                
                expenses.push({
                    expense_id: `exp_${Date.now()}_${i}_${j}`,
                    user_id: 1,
                    category_id: cat.id,
                    amount: parseFloat(amt.toFixed(2)),
                    date: new Date(date.getFullYear(), date.getMonth(), day).toISOString().split('T')[0],
                    description: `Seed transaction for ${cat.name}`,
                    receipt_path: null
                });
            }
        }
        this.tables.expenses = expenses;

        this.tables.expenses.forEach(exp => {
            const res = AnomalyDetector.check(exp, this.tables.expenses);
            if (res.isAnomaly) this.tables.audits.push(res.auditLog);
        });

        this.save();
    }


    getAllExpenses() {
        return [...this.tables.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    addExpense(data) {
        const newExpense = {
            expense_id: `exp_${Date.now()}`,
            user_id: 1,
            ...data,
            amount: parseFloat(data.amount)
        };
        
        const res = AnomalyDetector.check(newExpense, this.tables.expenses);
        
        if (res.isAnomaly) {
            this.tables.audits.push(res.auditLog);
        }

        this.save();
        return { expense: newExpense, audit: res.auditLog };
    }


    getCategories() {
        return this.tables.categories;
    }


    getAudits() {
        return this.tables.audits.map(audit => {
            const exp = this.tables.expenses.find(e => e.expense_id === audit.expense_id);
            return { ...audit, expense_details: exp };
        }).sort((a, b) => b.risk_score - a.risk_score);
    }
}

export const DB = new DatabaseManager();