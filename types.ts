export type TransactionType = 'expense' | 'income';
export type ExpenseType = 'recurring' | 'irregular';

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Added for local auth
}

export interface Category {
  id: string;
  userId?: string; // Added for multi-user support
  name: string;
  budgetLimit: number;
  type: TransactionType;
  isDurable?: boolean; // NEW: Flag for durable goods (appliances, electronics, etc)
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  date: string; // ISO Date string
  amount: number;
  description: string;
  receiptPath?: string; // Simulated path
  createdAt: string;
  type: TransactionType;
  expenseType?: ExpenseType; // NEW: 'recurring' or 'irregular'
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  startDate: string;
}

export interface AuditLog {
  id: string;
  expenseId: string;
  riskScore: number; // 1-10
  flagReason: string;
  flagDate: string;
  details: string;
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  total: number;
}

export type CategoryForecastMap = Record<string, MonthlyAggregate[]>;

export interface ForecastData {
  month: string;
  predictedAmount: number;
  isForecast: boolean;
}

export interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'anomaly' | 'saving_goal';
  title: string;
  message: string;
  date: string;
}

export interface SavingGoal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  deadline: string; // ISO Date string
  type: 'purchase' | 'general'; // Type of saving goal
  status: 'active' | 'completed' | 'failed'; // Status
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SavingProgress {
  id: string;
  goalId: string;
  month: string; // YYYY-MM
  amountSaved: number;
  createdAt: string;
}

export interface SmartSuggestion {
  recommendedMonthlyAmount: number;
  recommendedDeadline: string;
  feasibilityScore: number; // 0-100
  monthlyCapacity: number;
  reasoning: string;
}