import { Category, Expense, AuditLog, User, TransactionType, Notification } from '../types';
import { detectAnomaly, runSequentialAudit } from './algorithms';

const API_URL = 'http://localhost/expense-management-v2/index.php'; 

interface DatabaseSchema {
  users: User[];
  categories: Category[];
  transactions: Expense[];
  audit_logs: AuditLog[];
}

class PEMDatabase {
  private db: DatabaseSchema = {
      users: [],
      categories: [],
      transactions: [],
      audit_logs: []
  };
  
  private isConnected = false;

  constructor() {}

  async init(): Promise<void> {
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const [catsRes, txnsRes, auditsRes] = await Promise.all([
              fetch(`${API_URL}?action=categories`, { signal: controller.signal }),
              fetch(`${API_URL}?action=transactions`, { signal: controller.signal }),
              fetch(`${API_URL}?action=audits`, { signal: controller.signal })
          ]);
          clearTimeout(timeoutId);

          if (!catsRes.ok || !txnsRes.ok || !auditsRes.ok) {
              throw new Error("API endpoint returned error status");
          }

          this.db.categories = await catsRes.json();
          this.db.transactions = await txnsRes.json();
          this.db.audit_logs = await auditsRes.json();
          this.db.categories.forEach(c => c.budgetLimit = Number(c.budgetLimit));
          this.db.transactions.forEach(t => t.amount = Number(t.amount));
          this.db.audit_logs.forEach(a => a.riskScore = Number(a.riskScore));

          this.isConnected = true;
          console.log("✅ Connected to MySQL Database");

      } catch (error) {
          console.error("❌ MySQL API Unavailable. No fallback enabled for testing.", error);
          this.isConnected = false;
          throw error;
      }
  }

  public getStatus(): boolean {
      return this.isConnected;
  }

  getAllTransactions(): Expense[] {
    return this.db.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getTransactionById(id: string): Expense | undefined {
    return this.db.transactions.find(t => t.id === id);
  }

  getExpenses(): Expense[] {
    return this.db.transactions.filter(t => t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getIncomes(): Expense[] {
    return this.db.transactions.filter(t => t.type === 'income')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getCategories(): Category[] {
    return this.db.categories;
  }

  getAudits(): AuditLog[] {
    return this.db.audit_logs.sort((a, b) => b.riskScore - a.riskScore);
  }

  async addTransaction(data: Omit<Expense, 'id' | 'createdAt' | 'userId'>): Promise<Expense> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot add transaction");
    }

    const newTxn: Expense = {
      ...data,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: 'user_1',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    this.db.transactions.push(newTxn);
    await fetch(`${API_URL}?action=transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTxn)
    });
    
    if (newTxn.type === 'expense') {
      const budgetMap = Object.fromEntries(this.db.categories.map(c => [c.id, c.budgetLimit]));
      const allExpenses = this.getExpenses();
      const anomalyResult = detectAnomaly(newTxn, allExpenses, budgetMap);
      
      if (anomalyResult.isAnomaly && anomalyResult.log) {
        this.db.audit_logs.push(anomalyResult.log);
        
        await fetch(`${API_URL}?action=audits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(anomalyResult.log)
        });
      }
    }

    return newTxn;
  }

  async updateTransaction(updatedTxn: Expense): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot update transaction");
    }

    const index = this.db.transactions.findIndex(item => item.id === updatedTxn.id);
    if (index !== -1) {
      this.db.transactions[index] = updatedTxn;
      
      await fetch(`${API_URL}?action=transactions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTxn)
      });
      
      if (updatedTxn.type === 'expense') {
        this.db.audit_logs = this.db.audit_logs.filter(a => a.expenseId !== updatedTxn.id);
        const budgetMap = Object.fromEntries(this.db.categories.map(c => [c.id, c.budgetLimit]));
        const anomalyResult = detectAnomaly(updatedTxn, this.getExpenses(), budgetMap);
        if (anomalyResult.isAnomaly && anomalyResult.log) {
            this.db.audit_logs.push(anomalyResult.log);
            await fetch(`${API_URL}?action=audits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(anomalyResult.log)
            });
        }
      }
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot delete transaction");
    }

    this.db.transactions = this.db.transactions.filter(item => item.id !== id);
    this.db.audit_logs = this.db.audit_logs.filter(item => item.expenseId !== id);
    
    await fetch(`${API_URL}?action=transactions&id=${id}`, { method: 'DELETE' });
  }

  async addCategory(name: string, type: TransactionType, budgetLimit: number): Promise<Category> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot add category");
    }

    const newCat: Category = {
        id: `${type.substring(0,3)}_${Date.now()}`,
        name,
        type,
        budgetLimit
    };
    this.db.categories.push(newCat);
    
    await fetch(`${API_URL}?action=categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
    });

    return newCat;
  }

  async updateCategoryBudget(categoryId: string, newLimit: number) {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot update category budget");
    }

    const cat = this.db.categories.find(c => c.id === categoryId);
    if (cat) {
        cat.budgetLimit = newLimit;
        await fetch(`${API_URL}?action=categories`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cat)
        });
    }
  }

  checkBudgetStatus(categoryId: string, addedAmount: number = 0) {
      const category = this.db.categories.find(c => c.id === categoryId);
      if (!category || category.type === 'income') return null;

      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const spent = this.getExpenses()
          .filter(e => e.categoryId === categoryId && e.date.startsWith(currentMonthStr))
          .reduce((sum, e) => sum + e.amount, 0);
      
      const totalAfter = spent + addedAmount;
      const percent = category.budgetLimit > 0 ? (totalAfter / category.budgetLimit) * 100 : 0;

      return {
          spent,
          totalAfter,
          limit: category.budgetLimit,
          percent,
          isNearLimit: percent >= 85 && percent <= 100,
          isOverLimit: percent > 100
      };
  }

  getNotifications(): Notification[] {
      const alerts: Notification[] = [];
      
      const expensesCats = this.db.categories.filter(c => c.type === 'expense' && c.budgetLimit > 0);
      expensesCats.forEach(cat => {
          const status = this.checkBudgetStatus(cat.id);
          if (status) {
              if (status.isOverLimit) {
                  alerts.push({
                      id: `alert_bud_${cat.id}`,
                      type: 'critical',
                      title: 'Budget Exceeded',
                      message: `Exceeded budget for ${cat.name} by ${((status.percent)-100).toFixed(0)}%.`,
                      date: new Date().toISOString()
                  });
              } else if (status.isNearLimit) {
                  alerts.push({
                      id: `alert_warn_${cat.id}`,
                      type: 'warning',
                      title: 'Budget Warning',
                      message: `Used ${status.percent.toFixed(0)}% of ${cat.name} budget.`,
                      date: new Date().toISOString()
                  });
              }
          }
      });

      const recentAudits = this.getAudits().slice(0, 5);
      recentAudits.forEach(audit => {
          alerts.push({
              id: `alert_aud_${audit.id}`,
              type: 'anomaly',
              title: 'Suspicious Activity',
              message: `Risk Score ${audit.riskScore}/10: ${audit.flagReason}`,
              date: audit.flagDate
          });
      });

      return alerts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async rerunAnomalyDetectionOnAllExpenses(
    progressCallback?: (processed: number, total: number, currentExpenseId?: string) => void
  ): Promise<{ processed: number; anomalies: number; auditLogs: AuditLog[] }> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot rerun anomaly detection");
    }

    console.log("🔄 Starting anomaly detection rerun on all expenses...");

    this.db.audit_logs = [];
    await fetch(`${API_URL}?action=audits`, { method: 'DELETE' });

    const allExpenses = this.getExpenses();
    const total = allExpenses.length;

    const auditLogs = runSequentialAudit(allExpenses, this.db.categories, 3);
    for (let i = 0; i < total; i++) {
      progressCallback?.(i + 1, total, allExpenses[i].id);
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    this.db.audit_logs = auditLogs;

    for (const log of auditLogs) {
      await fetch(`${API_URL}?action=audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    }

    console.log(`✅ Anomaly detection full rerun complete: ${total} checked, ${auditLogs.length} anomalies found`);
    return { processed: total, anomalies: auditLogs.length, auditLogs };

  }
}

export const db = new PEMDatabase();