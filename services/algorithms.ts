import { Expense, AuditLog, MonthlyAggregate, Category } from '../types';
import { FORECAST_ALPHA, FORECAST_BETA, ANOMALY_IQR_MULTIPLIER, FREQUENCY_THRESHOLD, CURRENCY_SYMBOL } from '../constants';

export const generateForecast = (expenses: Expense[]): MonthlyAggregate[] => {
  const monthlyTotals: Record<string, number> = {};
  
  if (expenses.length === 0) return [];
  
  const dates = expenses.map(e => new Date(e.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date();

  const startYear = minDate.getFullYear();
  const startMonth = minDate.getMonth();
  const endYear = maxDate.getFullYear();
  const endMonth = maxDate.getMonth();

  let currentY = startYear;
  let currentM = startMonth;
  
  while (currentY < endYear || (currentY === endYear && currentM <= endMonth)) {
    const key = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;
    monthlyTotals[key] = 0;
    
    currentM++;
    if (currentM > 11) {
      currentM = 0;
      currentY++;
    }
  }

  expenses.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTotals[key] !== undefined) {
      monthlyTotals[key] += e.amount;
    }
  });

  const timeSeries = Object.entries(monthlyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));

  if (timeSeries.length < 2) return timeSeries;

  let lt = timeSeries[0].total;
  let tt = timeSeries[1].total - timeSeries[0].total;

  for (let i = 1; i < timeSeries.length; i++) {
    const yt = timeSeries[i].total;
    const prevLt = lt;
    
    lt = FORECAST_ALPHA * yt + (1 - FORECAST_ALPHA) * (prevLt + tt);
    tt = FORECAST_BETA * (lt - prevLt) + (1 - FORECAST_BETA) * tt;
  }

  const predictions: MonthlyAggregate[] = [];
  
  const lastParts = timeSeries[timeSeries.length - 1].month.split('-');
  let pYear = parseInt(lastParts[0]);
  let pMonth = parseInt(lastParts[1]) - 1;

  for (let h = 1; h <= 2; h++) {
    const forecastVal = lt + h * tt;
    
    pMonth++;
    if (pMonth > 11) {
      pMonth = 0;
      pYear++;
    }
    const nextKey = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;
    
    predictions.push({
      month: nextKey,
      total: Math.max(0, parseFloat(forecastVal.toFixed(2)))
    });
  }

  return predictions;
};


const calculateRobustIQR = (amounts: number[]): { q1: number; q3: number; iqr: number; upperFence: number } | null => {
  if (amounts.length < 5) return null;

  const sorted = [...amounts].sort((a, b) => a - b);

  const trimPercent = 0.1;
  const trimCount = Math.floor(sorted.length * trimPercent);
  const trimmedAmounts = sorted.slice(0, sorted.length - trimCount);
  const q1 = trimmedAmounts[Math.floor(trimmedAmounts.length * 0.25)];
  const q3 = trimmedAmounts[Math.floor(trimmedAmounts.length * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + (ANOMALY_IQR_MULTIPLIER * iqr);

  return { q1, q3, iqr, upperFence };
};

const calculateRobustLowerBound = (amounts: number[]): number | null => {
  if (amounts.length < 5) return null;

  const sorted = [...amounts].sort((a, b) => a - b);

  const trimPercent = 0.1;
  const trimCount = Math.floor(sorted.length * trimPercent);
  const trimmedAmounts = sorted.slice(trimCount);

  const q1 = trimmedAmounts[Math.floor(trimmedAmounts.length * 0.25)];
  const iqr = trimmedAmounts[Math.floor(trimmedAmounts.length * 0.75)] - q1;
  const lowerFence = q1 - (ANOMALY_IQR_MULTIPLIER * iqr);

  return lowerFence;
};

export const detectAnomaly = (
  newExpense: Expense,
  allExpenses: Expense[],
  categoryBudgetMap: Record<string, number> | null = null
): { isAnomaly: boolean; log?: AuditLog } => {
  if (categoryBudgetMap) {
    const budgetLimit = categoryBudgetMap[newExpense.categoryId];
    if (budgetLimit && newExpense.amount <= budgetLimit * 0.5) {
      return { isAnomaly: false };
    }
  }

  const history = allExpenses.filter(e => e.categoryId === newExpense.categoryId && e.id !== newExpense.id);
  const amounts = history.map(e => e.amount);

  let isFlagged = false;
  let riskScore = 0;
  let reasons: string[] = [];
  let anomalySignals = 0;

  const sameDayTxns = allExpenses.filter(e => e.date === newExpense.date && e.id !== newExpense.id).length;
  if (sameDayTxns >= FREQUENCY_THRESHOLD) {
    isFlagged = true;
    anomalySignals++;
    riskScore += 3;
    reasons.push(`High frequency: ${sameDayTxns + 1} transactions on ${newExpense.date}`);
  }

  const iqrStats = calculateRobustIQR(amounts);
  if (iqrStats) {
    const { q1, q3, iqr, upperFence } = iqrStats;

    if (newExpense.amount > upperFence) {
      isFlagged = true;
      anomalySignals++;

      const severity = newExpense.amount / upperFence;
      let iqrRiskContribution = 0;

      if (severity < 1.2) iqrRiskContribution = 2;
      else if (severity < 1.5) iqrRiskContribution = 4;
      else if (severity < 2.0) iqrRiskContribution = 5;
      else iqrRiskContribution = 7;

      riskScore += iqrRiskContribution;
      reasons.push(`Amount ${CURRENCY_SYMBOL}${newExpense.amount} exceeds robust upper fence ${CURRENCY_SYMBOL}${upperFence.toFixed(2)} (trimmed IQR: Q1=${CURRENCY_SYMBOL}${q1.toFixed(2)}, Q3=${CURRENCY_SYMBOL}${q3.toFixed(2)}, IQR=${CURRENCY_SYMBOL}${iqr.toFixed(2)})`);
    }
  }

  const lowerBound = calculateRobustLowerBound(amounts);
  if (lowerBound !== null && newExpense.amount < lowerBound) {
    isFlagged = true;
    anomalySignals++;

    const severity = lowerBound / Math.max(newExpense.amount, 1);
    let lowerRiskContribution = 0;

    if (severity > 1.5) lowerRiskContribution = 3;
    else if (severity > 2.0) lowerRiskContribution = 5;
    else lowerRiskContribution = 2;

    riskScore += lowerRiskContribution;
    reasons.push(`Amount ${CURRENCY_SYMBOL}${newExpense.amount} below robust lower bound ${CURRENCY_SYMBOL}${lowerBound.toFixed(2)} (unusually low for category)`);
  }

  if (anomalySignals > 1) {
    riskScore += 2;
  }

  riskScore = Math.max(1, Math.min(10, riskScore));

  if (isFlagged) {
    return {
      isAnomaly: true,
      log: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expenseId: newExpense.id,
        riskScore,
        flagReason: reasons.join('; '),
        flagDate: new Date().toISOString(),
        details: `Category: ${newExpense.categoryId}, Signals: ${anomalySignals}, Trimmed dataset used for robust statistics`
      }
    };
  }

  return { isAnomaly: false };
};

export const runSequentialAudit = (
  expenses: Expense[],
  categories: Category[] | null = null,
  minHistoryThreshold: number = 3
): AuditLog[] => {
  const auditLogs: AuditLog[] = [];

  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const categoryBudgetMap: Record<string, number> = {};
  if (categories?.length) {
    categories.forEach(category => {
      categoryBudgetMap[category.id] = category.budgetLimit;
    });
  }

  for (let i = minHistoryThreshold; i < sortedExpenses.length; i++) {
    const history = sortedExpenses.slice(0, i);
    const currentExpense = sortedExpenses[i];

    const result = detectAnomaly(currentExpense, history, categoryBudgetMap);

    if (result.isAnomaly && result.log) {
      const enhancedLog: AuditLog = {
        ...result.log,
        details: `${result.log.details}, Sequence: ${i + 1}/${sortedExpenses.length}, History size: ${history.length}`
      };
      auditLogs.push(enhancedLog);
    }
  }

  return auditLogs;
};