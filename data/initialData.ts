import { Expense, AuditLog, Category, User } from '../types';

const getRelativeDate = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

const getRelativeMonthDate = (monthOffset: number, day: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(day);
  return d.toISOString().split('T')[0];
};

export const initialDatabase: {
  users: User[];
  categories: Category[];
  transactions: Expense[];
  audit_logs: AuditLog[];
} = {
  "users": [
    {
      "id": "user_1",
      "username": "student_admin",
      "email": "admin@college.edu"
    }
  ],
  "categories": [
    { "id": "cat_1", "name": "Food & Dining", "budgetLimit": 15000, "type": "expense" },
    { "id": "cat_2", "name": "Transportation", "budgetLimit": 5000, "type": "expense" },
    { "id": "cat_3", "name": "Rent & Housing", "budgetLimit": 25000, "type": "expense" },
    { "id": "cat_4", "name": "Entertainment", "budgetLimit": 8000, "type": "expense" },
    { "id": "cat_5", "name": "Utilities", "budgetLimit": 4000, "type": "expense" },
    { "id": "cat_6", "name": "Education", "budgetLimit": 10000, "type": "expense" },
    { "id": "inc_1", "name": "Salary", "budgetLimit": 0, "type": "income" },
    { "id": "inc_2", "name": "Freelance", "budgetLimit": 0, "type": "income" }
  ],
  "transactions": [
    { id: 'inc_0', userId: 'user_1', categoryId: 'inc_1', amount: 85000, description: 'Salary', date: getRelativeMonthDate(0, 1), type: 'income', createdAt: new Date().toISOString() },
    { id: 'inc_1', userId: 'user_1', categoryId: 'inc_1', amount: 85000, description: 'Salary', date: getRelativeMonthDate(-1, 1), type: 'income', createdAt: new Date().toISOString() },
    { id: 'inc_2', userId: 'user_1', categoryId: 'inc_1', amount: 85000, description: 'Salary', date: getRelativeMonthDate(-2, 1), type: 'income', createdAt: new Date().toISOString() },
    { id: 'inc_3', userId: 'user_1', categoryId: 'inc_1', amount: 85000, description: 'Salary', date: getRelativeMonthDate(-3, 1), type: 'income', createdAt: new Date().toISOString() },
    { id: 'inc_5', userId: 'user_1', categoryId: 'inc_1', amount: 85000, description: 'Salary', date: getRelativeMonthDate(-4, 1), type: 'income', createdAt: new Date().toISOString() },

    { id: 'rent_0', userId: 'user_1', categoryId: 'cat_3', amount: 25000, description: 'Rent', date: getRelativeMonthDate(0, 2), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'rent_1', userId: 'user_1', categoryId: 'cat_3', amount: 25000, description: 'Rent', date: getRelativeMonthDate(-1, 2), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'rent_2', userId: 'user_1', categoryId: 'cat_3', amount: 25000, description: 'Rent', date: getRelativeMonthDate(-2, 2), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'rent_3', userId: 'user_1', categoryId: 'cat_3', amount: 25000, description: 'Rent', date: getRelativeMonthDate(-3, 2), type: 'expense', createdAt: new Date().toISOString() },

    { id: 'tx_cur_1', userId: 'user_1', categoryId: 'cat_1', amount: 1250, description: 'Grocery Haul', date: getRelativeDate(-2), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'tx_cur_2', userId: 'user_1', categoryId: 'cat_1', amount: 450, description: 'Lunch with friends', date: getRelativeDate(-5), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'tx_cur_3', userId: 'user_1', categoryId: 'cat_5', amount: 3200, description: 'Electricity Bill', date: getRelativeDate(-10), type: 'expense', createdAt: new Date().toISOString() },
    
    { id: 'anom_iqr', userId: 'user_1', categoryId: 'cat_4', amount: 18000, description: 'VIP Concert Tickets (IQR Outlier)', date: getRelativeDate(-3), type: 'expense', createdAt: new Date().toISOString() },

    { id: 'freq_1', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 1', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_2', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 2', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_3', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 3', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_4', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 4', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_5', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 5', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_6', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 6', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_7', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 7', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_8', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 8', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_9', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 9', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
    { id: 'freq_10', userId: 'user_1', categoryId: 'cat_2', amount: 150, description: 'Uber Ride 10', date: getRelativeDate(-1), type: 'expense', createdAt: new Date().toISOString() },
  ],
  "audit_logs": [
    { 
        id: 'aud_1', 
        expenseId: 'anom_iqr', 
        riskScore: 9, 
        flagReason: 'Amount 18000 exceeds upper fence (IQR Analysis)', 
        flagDate: new Date().toISOString(), 
        details: 'Category: Entertainment' 
    },
    { 
        id: 'aud_2', 
        expenseId: 'freq_10', 
        riskScore: 6, 
        flagReason: 'High frequency: 10 transactions detected today', 
        flagDate: new Date().toISOString(), 
        details: 'Category: Transportation' 
    }
  ]
};