export type TransactionType = 'expense' | 'income';

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

export interface ForecastData {
  month: string;
  predictedAmount: number;
  isForecast: boolean;
}

export interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'anomaly';
  title: string;
  message: string;
  date: string;
}