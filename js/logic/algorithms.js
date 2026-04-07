import { CONFIG } from '../config.js';


// Simple Holt's Linear Trend method for forecasting
export const Forecaster = {
    predict(expenses) {
        const monthlyTotals = {};
        
        if (expenses.length === 0) return [];
        
        const dates = expenses.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(); 

        let currentY = minDate.getFullYear();
        let currentM = minDate.getMonth();
        const endY = maxDate.getFullYear();
        const endM = maxDate.getMonth();

        while (currentY < endY || (currentY === endY && currentM <= endM)) {
            const key = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;
            monthlyTotals[key] = 0;
            currentM++;
            if (currentM > 11) { currentM = 0; currentY++; }
        }

        expenses.forEach(e => {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyTotals[key] !== undefined) monthlyTotals[key] += parseFloat(e.amount);
        });

        const timeSeries = Object.entries(monthlyTotals)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, total]) => ({ month, total }));

        if (timeSeries.length < 2) return timeSeries.map(t => ({...t, type: 'Actual'}));

        let lt = timeSeries[0].total;
        let tt = timeSeries[1].total - timeSeries[0].total;
        const alpha = CONFIG.FORECAST_ALPHA;
        const beta = CONFIG.FORECAST_BETA;

        for (let i = 1; i < timeSeries.length; i++) {
            const yt = timeSeries[i].total;
            const prevLt = lt;
            
            lt = alpha * yt + (1 - alpha) * (prevLt + tt);
            tt = beta * (lt - prevLt) + (1 - beta) * tt;
        }

        const results = timeSeries.map(t => ({...t, type: 'Actual'}));
        
        let pYear = parseInt(timeSeries[timeSeries.length - 1].month.split('-')[0]);
        let pMonth = parseInt(timeSeries[timeSeries.length - 1].month.split('-')[1]) - 1;

        for (let h = 1; h <= 2; h++) {
            const forecastVal = lt + h * tt;
            
            pMonth++;
            if (pMonth > 11) { pMonth = 0; pYear++; }
            const nextKey = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;
            
            results.push({
                month: nextKey,
                total: Math.max(0, parseFloat(forecastVal.toFixed(2))),
                type: 'Forecast'
            });
        }

        return results;
    }
};


// Basic anomaly detection using frequency and amount outliers
export const AnomalyDetector = {
    check(newExpense, allExpenses) {
        let isFlagged = false;
        let riskScore = 0;
        let reasons = [];

        const history = allExpenses.filter(e => 
            e.category_id === newExpense.category_id && 
            e.expense_id !== newExpense.expense_id
        );
        const amounts = history.map(e => parseFloat(e.amount)).sort((a, b) => a - b);

        const sameDayCount = allExpenses.filter(e => 
            e.date === newExpense.date && 
            e.expense_id !== newExpense.expense_id
        ).length;

        if (sameDayCount >= CONFIG.FREQUENCY_THRESHOLD) {
            isFlagged = true;
            riskScore = Math.max(riskScore, 5);
            reasons.push(`High Frequency: ${sameDayCount + 1} txns on ${newExpense.date}`);
        }

        if (amounts.length >= 4) {
            const q1 = amounts[Math.floor(amounts.length * 0.25)];
            const q3 = amounts[Math.floor(amounts.length * 0.75)];
            const iqr = q3 - q1;
            const upperFence = q3 + (CONFIG.ANOMALY_IQR_MULTIPLIER * iqr);
            
            if (newExpense.amount > upperFence) {
                isFlagged = true;
                
                const ratio = newExpense.amount / upperFence;
                let score = 5;
                if (ratio > 2.0) score = 10;
                else if (ratio > 1.5) score = 8;
                else if (ratio > 1.2) score = 7;
                
                riskScore = Math.max(riskScore, score);
                reasons.push(`Amount ${CONFIG.CURRENCY}${newExpense.amount} > Limit ${CONFIG.CURRENCY}${upperFence.toFixed(2)} (IQR Analysis)`);
            }
        }

        return {
            isAnomaly: isFlagged,
            auditLog: isFlagged ? {
                audit_id: `aud_${Date.now()}`,
                expense_id: newExpense.expense_id,
                risk_score: riskScore,
                flag_reason: reasons.join('; '),
                flag_date: new Date().toISOString(),
                amount: newExpense.amount,
                category_name: newExpense.category_name
            } : null
        };
    }
};