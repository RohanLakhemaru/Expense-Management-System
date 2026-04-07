
export const FORECAST_ALPHA = 0.3;
export const FORECAST_BETA = 0.1;
export const ANOMALY_IQR_MULTIPLIER = 1.5;
export const FREQUENCY_THRESHOLD = 10;
export const BUDGET_WARNING_THRESHOLD = 0.85;

export const CURRENCY_SYMBOL = 'NPR ';

export const INITIAL_CATEGORIES = [
  { id: 'cat_1', name: 'Food & Dining', budgetLimit: 15000, type: 'expense' },
  { id: 'cat_2', name: 'Transportation', budgetLimit: 5000, type: 'expense' },
  { id: 'cat_3', name: 'Rent & Housing', budgetLimit: 25000, type: 'expense' },
  { id: 'cat_4', name: 'Entertainment', budgetLimit: 8000, type: 'expense' },
  { id: 'cat_5', name: 'Utilities (Electricity/Net)', budgetLimit: 4000, type: 'expense' },
  { id: 'cat_6', name: 'Education/College', budgetLimit: 10000, type: 'expense' },
  { id: 'inc_1', name: 'Salary', budgetLimit: 0, type: 'income' },
  { id: 'inc_2', name: 'Freelance', budgetLimit: 0, type: 'income' },
  { id: 'inc_3', name: 'Allowance', budgetLimit: 0, type: 'income' },
];
