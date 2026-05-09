import { Category, Expense, AuditLog, User, TransactionType, Notification, SavingGoal, SavingProgress } from '../types';
import { detectAnomaly, runSequentialAudit, generateSmartForecast, getCombinedForecast } from './algorithms';

const API_URL = 'http://localhost/NewManagementSystem/Expense-Management-System/index.php';
const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: 'include'
};

interface DatabaseSchema {
  users: User[];
  categories: Category[];
  transactions: Expense[];
  audit_logs: AuditLog[];
  saving_goals: SavingGoal[];
  saving_progress: SavingProgress[];
}

class PEMDatabase {
  private db: DatabaseSchema = {
      users: [],
      categories: [],
      transactions: [],
      audit_logs: [],
      saving_goals: [],
      saving_progress: []
  };
  
  private isConnected = false;
  private currentUser: User | null = null;

  constructor() {}

  async init(): Promise<void> {
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const [catsRes, txnsRes, auditsRes, goalsRes, progressRes] = await Promise.all([
              fetch(`${API_URL}?action=categories`, { ...DEFAULT_FETCH_OPTIONS, signal: controller.signal }),
              fetch(`${API_URL}?action=transactions`, { ...DEFAULT_FETCH_OPTIONS, signal: controller.signal }),
              fetch(`${API_URL}?action=audits`, { ...DEFAULT_FETCH_OPTIONS, signal: controller.signal }),
              fetch(`${API_URL}?action=saving_goals`, { ...DEFAULT_FETCH_OPTIONS, signal: controller.signal }),
              fetch(`${API_URL}?action=saving_progress`, { ...DEFAULT_FETCH_OPTIONS, signal: controller.signal })
          ]);
          clearTimeout(timeoutId);

          // Log status codes - 401 means user not authenticated
          console.log("📊 API Response Status:", {
              categories: catsRes.status,
              transactions: txnsRes.status,
              audits: auditsRes.status,
              goals: goalsRes.status,
              progress: progressRes.status
          });

          // If any endpoint returns 401, user is not authenticated
          if (catsRes.status === 401 || txnsRes.status === 401 || auditsRes.status === 401) {
              console.error("❌ API returned 401 - Not authenticated");
              this.isConnected = false;
              throw new Error("User session expired - please login again");
          }

          // Try to parse responses, default to empty arrays if JSON parsing fails
          try {
              const catData = catsRes.ok ? await catsRes.json() : [];
              console.log("✅ Categories fetched:", catData.length, "items");
              this.db.categories = catData;
          } catch (e) {
              console.warn("⚠️ Failed to parse categories:", e);
              this.db.categories = [];
          }

          try {
              const txnData = txnsRes.ok ? await txnsRes.json() : [];
              console.log("✅ Transactions fetched:", txnData.length, "items");
              this.db.transactions = txnData;
          } catch (e) {
              console.warn("⚠️ Failed to parse transactions:", e);
              this.db.transactions = [];
          }

          try {
              const auditData = auditsRes.ok ? await auditsRes.json() : [];
              console.log("✅ Audits fetched:", auditData.length, "items");
              this.db.audit_logs = auditData;
          } catch (e) {
              console.warn("⚠️ Failed to parse audits:", e);
              this.db.audit_logs = [];
          }

          try {
              const goalsData = goalsRes.ok ? await goalsRes.json() : [];
              console.log("✅ Saving goals fetched:", goalsData.length, "items");
              this.db.saving_goals = goalsData;
          } catch (e) {
              console.warn("⚠️ Failed to parse goals:", e);
              this.db.saving_goals = [];
          }

          try {
              const progressData = progressRes.ok ? await progressRes.json() : [];
              console.log("✅ Saving progress fetched:", progressData.length, "items");
              this.db.saving_progress = progressData;
          } catch (e) {
              console.warn("⚠️ Failed to parse progress:", e);
              this.db.saving_progress = [];
          }
          
          this.db.categories.forEach(c => {
            c.budgetLimit = Number(c.budgetLimit);
            c.isDurable = Boolean(c.isDurable);
          });
          this.db.transactions.forEach(t => t.amount = Number(t.amount));
          this.db.audit_logs.forEach(a => a.riskScore = Number(a.riskScore));
          this.db.saving_goals.forEach(g => g.targetAmount = Number(g.targetAmount));
          this.db.saving_progress.forEach(p => p.amountSaved = Number(p.amountSaved));

          this.isConnected = true;
          console.log("✅ Connected to MySQL Database - loaded", {
              categories: this.db.categories.length,
              transactions: this.db.transactions.length,
              audits: this.db.audit_logs.length,
              goals: this.db.saving_goals.length,
              progress: this.db.saving_progress.length
          });

      } catch (error) {
          console.error("❌ Database initialization failed:", error.message);
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
      userId: this.currentUser?.id || '',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    this.db.transactions.push(newTxn);
    await fetch(`${API_URL}?action=transactions`, {
        ...DEFAULT_FETCH_OPTIONS,
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
          ...DEFAULT_FETCH_OPTIONS,
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
    
    await fetch(`${API_URL}?action=transactions&id=${id}`, { ...DEFAULT_FETCH_OPTIONS, method: 'DELETE' });
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
        ...DEFAULT_FETCH_OPTIONS,
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
            ...DEFAULT_FETCH_OPTIONS,
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

  // === SAVING GOALS METHODS ===

  getSavingGoals(): SavingGoal[] {
    return this.db.saving_goals.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  getSavingGoalById(id: string): SavingGoal | undefined {
    return this.db.saving_goals.find(g => g.id === id);
  }

  getSavingProgress(goalId?: string): SavingProgress[] {
    if (goalId) {
      return this.db.saving_progress.filter(p => p.goalId === goalId).sort((a, b) => b.month.localeCompare(a.month));
    }
    return this.db.saving_progress.sort((a, b) => b.month.localeCompare(a.month));
  }

  async addSavingGoal(data: Omit<SavingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingGoal> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot add saving goal");
    }

    const newGoal: SavingGoal = {
      ...data,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.saving_goals.push(newGoal);
    await fetch(`${API_URL}?action=saving_goals`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal)
    });

    return newGoal;
  }

  async updateSavingGoal(id: string, updates: Partial<SavingGoal>): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot update saving goal");
    }

    const goal = this.db.saving_goals.find(g => g.id === id);
    if (!goal) throw new Error("Saving goal not found");

    const updated: SavingGoal = {
      ...goal,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const index = this.db.saving_goals.findIndex(g => g.id === id);
    this.db.saving_goals[index] = updated;

    await fetch(`${API_URL}?action=saving_goals`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  }

  async deleteSavingGoal(id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot delete saving goal");
    }

    this.db.saving_goals = this.db.saving_goals.filter(g => g.id !== id);
    this.db.saving_progress = this.db.saving_progress.filter(p => p.goalId !== id);

    await fetch(`${API_URL}?action=saving_goals&id=${id}`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'DELETE'
    });
  }

  async addSavingProgress(goalId: string, month: string, amountSaved: number): Promise<SavingProgress> {
    if (!this.isConnected) {
      throw new Error("MySQL not connected - cannot add saving progress");
    }

    const newProgress: SavingProgress = {
      id: `prog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      goalId,
      month,
      amountSaved,
      createdAt: new Date().toISOString()
    };

    this.db.saving_progress.push(newProgress);
    await fetch(`${API_URL}?action=saving_progress`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProgress)
    });

    return newProgress;
  }

  getSmartForecastByCategory() {
    const expenses = this.getExpenses();
    return generateSmartForecast(expenses, this.db.categories);
  }

  getCombinedSmartForecast() {
    const forecastByCategory = this.getSmartForecastByCategory();
    return getCombinedForecast(forecastByCategory);
  }

  async login(username: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}?action=login`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const user = await response.json();
    // Clear previous user's data
    this.db = {
      users: [],
      categories: [],
      transactions: [],
      audit_logs: [],
      saving_goals: [],
      saving_progress: []
    };
    this.currentUser = user;
    this.isConnected = true;
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}?action=register`, {
      ...DEFAULT_FETCH_OPTIONS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const user = await response.json();
    // Clear any previous data and set new user
    this.db = {
      users: [],
      categories: [],
      transactions: [],
      audit_logs: [],
      saving_goals: [],
      saving_progress: []
    };
    this.currentUser = user;
    this.isConnected = true;
  }

  logout(): void {
    this.currentUser = null;
    this.db = {
      users: [],
      categories: [],
      transactions: [],
      audit_logs: [],
      saving_goals: [],
      saving_progress: []
    };
    // Optional: call backend to clear session
    fetch(`${API_URL}?action=logout`, { ...DEFAULT_FETCH_OPTIONS, method: 'POST' }).catch(() => {});
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async migrateCategories(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}?action=migrate_categories`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'GET'
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          console.log("✅ Categories migrated:", result.categories_created, "created");
          // Reload categories
          await this.init();
        } else if (result.status === 'already_has_categories') {
          console.log("ℹ️ User already has", result.count, "categories");
        }
      }
    } catch (e) {
      console.warn("⚠️ Migration failed:", e);
    }
  }
}

export const db = new PEMDatabase();