# Database Data Generation Prompt

## Overview
This prompt provides SQL scripts to generate realistic test data for:
1. **transactions table** - Expense and Income records
2. **audit_logs table** - Anomaly detection logs based on transaction patterns

---

## Table Structures

### transactions Table
```sql
CREATE TABLE transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL,
  type ENUM('expense', 'income') NOT NULL,
  receipt_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### audit_logs Table
```sql
CREATE TABLE audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  expense_id VARCHAR(50) NOT NULL,
  risk_score INT CHECK (risk_score >= 1 AND risk_score <= 10),
  flag_reason VARCHAR(500),
  flag_date DATETIME,
  details VARCHAR(500),
  FOREIGN KEY (expense_id) REFERENCES transactions(id)
);
```

---

## Data Generation SQL Scripts

### 1. Income Transactions (6 months regular salary)
```sql
-- Generate salary income every 1st of month for past 6 months
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('inc_m6', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'income', NOW()),
('inc_m5', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 5 MONTH), 'income', NOW()),
('inc_m4', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 4 MONTH), 'income', NOW()),
('inc_m3', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 3 MONTH), 'income', NOW()),
('inc_m2', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 2 MONTH), 'income', NOW()),
('inc_m1', 'user_1', 'inc_1', 85000, 'Monthly Salary', DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'income', NOW()),
('inc_m0', 'user_1', 'inc_1', 85000, 'Monthly Salary', CURDATE(), 'income', NOW());
```

### 2. Fixed Expenses (Rent - Always 25000, 1st of month)
```sql
-- Generate rent payments for past 6 months
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('rent_m6', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 6 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m5', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m4', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 4 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m3', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 3 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m2', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 2 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m1', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), INTERVAL 1 DAY), 'expense', NOW()),
('rent_m0', 'user_1', 'cat_3', 25000, 'Rent Payment', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'expense', NOW());
```

### 3. Regular Food & Dining Expenses
```sql
-- Generate 40-60 NPR daily food expenses (normal range)
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('food_1', 'user_1', 'cat_1', 450, 'Breakfast at cafe', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'expense', NOW()),
('food_2', 'user_1', 'cat_1', 650, 'Lunch with friends', DATE_SUB(CURDATE(), INTERVAL 29 DAY), 'expense', NOW()),
('food_3', 'user_1', 'cat_1', 350, 'Late night snacks', DATE_SUB(CURDATE(), INTERVAL 28 DAY), 'expense', NOW()),
('food_4', 'user_1', 'cat_1', 1200, 'Groceries', DATE_SUB(CURDATE(), INTERVAL 27 DAY), 'expense', NOW()),
('food_5', 'user_1', 'cat_1', 550, 'Dinner at restaurant', DATE_SUB(CURDATE(), INTERVAL 26 DAY), 'expense', NOW()),
('food_6', 'user_1', 'cat_1', 320, 'Coffee break', DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'expense', NOW()),
('food_7', 'user_1', 'cat_1', 890, 'Grocery shopping', DATE_SUB(CURDATE(), INTERVAL 24 DAY), 'expense', NOW()),
('food_8', 'user_1', 'cat_1', 420, 'Lunch', DATE_SUB(CURDATE(), INTERVAL 23 DAY), 'expense', NOW()),
('food_9', 'user_1', 'cat_1', 500, 'Evening snacks', DATE_SUB(CURDATE(), INTERVAL 22 DAY), 'expense', NOW()),
('food_10', 'user_1', 'cat_1', 1100, 'Weekly groceries', DATE_SUB(CURDATE(), INTERVAL 21 DAY), 'expense', NOW());
```

### 4. Normal Transportation Expenses
```sql
-- Generate daily commute (100-300 NPR)
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('trans_1', 'user_1', 'cat_2', 150, 'Bus fare', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'expense', NOW()),
('trans_2', 'user_1', 'cat_2', 200, 'Taxi ride', DATE_SUB(CURDATE(), INTERVAL 19 DAY), 'expense', NOW()),
('trans_3', 'user_1', 'cat_2', 100, 'Local transport', DATE_SUB(CURDATE(), INTERVAL 18 DAY), 'expense', NOW()),
('trans_4', 'user_1', 'cat_2', 250, 'Ride sharing', DATE_SUB(CURDATE(), INTERVAL 17 DAY), 'expense', NOW()),
('trans_5', 'user_1', 'cat_2', 180, 'Bus pass', DATE_SUB(CURDATE(), INTERVAL 16 DAY), 'expense', NOW());
```

### 5. Utilities Expenses (Monthly, ~3000-4500)
```sql
-- Generate utilities (Electricity/Net)
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('util_1', 'user_1', 'cat_5', 3500, 'Electricity bill', DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'expense', NOW()),
('util_2', 'user_1', 'cat_5', 1500, 'Internet bill', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'expense', NOW()),
('util_3', 'user_1', 'cat_5', 800, 'Mobile recharge', DATE_SUB(CURDATE(), INTERVAL 13 DAY), 'expense', NOW());
```

### 6. Entertainment Expenses
```sql
-- Generate entertainment (movies, games, etc.)
INSERT INTO transactions (id, user_1', 'cat_4', 500, 'Movie tickets', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'expense', NOW()),
('ent_2', 'user_1', 'cat_4', 1200, 'Concert tickets', DATE_SUB(CURDATE(), INTERVAL 9 DAY), 'expense', NOW()),
('ent_3', 'user_1', 'cat_4', 300, 'Gaming subscription', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'expense', NOW()),
('ent_4', 'user_1', 'cat_4', 2500, 'Weekend trip', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'expense', NOW());
```

### 7. Normal Education Expenses
```sql
-- Generate education expenses
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('edu_1', 'user_1', 'cat_6', 2000, 'Course materials', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'expense', NOW()),
('edu_2', 'user_1', 'cat_6', 5000, 'Tuition payment', DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'expense', NOW());
```

### 8. ANOMALY: Unusually High Food Expense (Detection Test)
```sql
-- Single anomaly: massive food expense (5x normal, triggers anomaly detection)
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('food_anom_1', 'user_1', 'cat_1', 4500, 'Catering for party', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'expense', NOW());
```

### 9. ANOMALY: Unusually High Entertainment Expense
```sql
-- Another anomaly: expensive entertainment (3x normal limit)
INSERT INTO transactions (id, user_1', 'cat_4', 6700, 'Luxury resort stay', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'expense', NOW());
```

### 10. Recent Normal Transactions
```sql
-- Recent everyday expenses
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('food_today_1', 'user_1', 'cat_1', 320, 'Morning coffee', CURDATE(), 'expense', NOW()),
('food_today_2', 'user_1', 'cat_1', 450, 'Lunch', CURDATE(), 'expense', NOW()),
('trans_today_1', 'user_1', 'cat_2', 120, 'Commute', CURDATE(), 'expense', NOW());
```

---

## Audit Logs Generation

### Audit Log Entries (Based on Anomalies Detected)
```sql
-- Anomaly 1: Food spending 4500 NPR (5x normal baseline ~900)
INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES
('audit_anom_1', 'food_anom_1', 8, 
'Amount NPR 4500 exceeds robust upper fence NPR 2250 (trimmed IQR: Q1=NPR 450, Q3=NPR 900, IQR=NPR 450)',
NOW(),
'Category: cat_1, Signals: 1, Trimmed dataset used for robust statistics, Sequence: 35/50, History size: 34');

-- Anomaly 2: Entertainment spending 6700 NPR (2.2x budget of 3000)
INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES
('audit_anom_2', 'ent_anom_1', 7,
'Amount NPR 6700 exceeds robust upper fence NPR 4500 (trimmed IQR: Q1=NPR 500, Q3=NPR 1200, IQR=NPR 700)',
NOW(),
'Category: cat_4, Signals: 1, Trimmed dataset used for robust statistics, Sequence: 42/50, History size: 41');

-- Potential: Multiple transactions on same day (frequency check)
-- This would trigger if 10+ transactions occur on same date
INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES
('audit_freq_1', 'food_today_1', 5,
'High frequency: 3 transactions on [CURRENT_DATE]',
NOW(),
'Category: cat_1, Signals: 1, Trimmed dataset used for robust statistics');
```

---

## Sample Data Summary

### Transaction Counts by Category
| Category | Normal Count | Anomalies | Budget NPR |
|----------|-------------|-----------|-----------|
| Food & Dining | 11 | 1 (4500) | 15000 |
| Transportation | 5 | 0 | 5000 |
| Rent & Housing | 7 | 0 | 25000 |
| Entertainment | 4 | 1 (6700) | 8000 |
| Utilities | 3 | 0 | 4000 |
| Education | 2 | 0 | 10000 |
| Salary (Income) | 7 | 0 | 0 |

### Anomaly Detection Criteria Applied
1. **Upper Fence Check**: Amount > Q3 + (1.5 × IQR)
2. **Trimmed Dataset**: Top 10% of extreme values removed
3. **Frequency Check**: 10+ transactions per day
4. **Budget Threshold**: Only audit expenses > 50% of category budget
5. **Risk Score 1-10**: Based on severity and signal count

---

## Usage Instructions

### Step 1: Clear Old Data (Optional)
```sql
-- WARNING: This will delete all records
-- DELETE FROM audit_logs;
-- DELETE FROM transactions;
```

### Step 2: Execute All INSERT Statements
Run all the above INSERT scripts in sequence in your MySQL client.

### Step 3: Verify Data
```sql
-- Check total transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Check anomalies found
SELECT COUNT(*) as total_audits FROM audit_logs;

-- View anomalies with details
SELECT t.description, t.amount, a.risk_score, a.flag_reason 
FROM audit_logs a 
JOIN transactions t ON a.expense_id = t.id 
ORDER BY a.risk_score DESC;

-- Check distribution by category
SELECT c.name, COUNT(t.id) as count, SUM(t.amount) as total 
FROM transactions t 
JOIN categories c ON t.category_id = c.id 
WHERE t.type = 'expense'
GROUP BY c.id 
ORDER BY total DESC;
```

### Step 4: Test Sequential Audit
Backend will run `runSequentialAudit()` which will:
- Evaluate each transaction from 4th onwards
- Compare against all previous transactions in same category
- Flag anomalies that exceed robust statistical bounds AND meet budget threshold
- Generate audit log entries progressively

---

## Customization

### To Add More Anomalies
```sql
-- Template for custom anomaly
INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, created_at) VALUES
('custom_anom_1', 'user_1', 'cat_X', 999999, 'Extreme outlier', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'expense', NOW());
```

### To Adjust Budget Limits
```sql
-- Modify category budget (affects 50% threshold for anomaly detection)
UPDATE categories SET budget_limit = 20000 WHERE id = 'cat_1';
```

### To Test Specific Scenarios
- **High Frequency**: Insert 15+ transactions on same date in cat_1
- **Low Threshold**: Add expenses between 7500-15000 (50-100% of cat_1 budget)
- **Multi-Signal**: Create expense that is both high + same-day frequent

---

## Expected Results After Data Load

✅ **Total Transactions**: ~50 records (expenses + income)  
✅ **Anomalies Detected**: 2-3 flagged  
✅ **Average Risk Score**: 4-5 (with 2 high-risk at 7-8)  
✅ **Budget Compliance**: 95%+ normal, <5% exceeds  
✅ **Sequential Audit**: Progressive history growth on each evaluation  

---
