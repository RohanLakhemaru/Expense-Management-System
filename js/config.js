export const CONFIG = {
    FORECAST_ALPHA: 0.3,
    FORECAST_BETA: 0.1,
    
    ANOMALY_IQR_MULTIPLIER: 1.5,
    FREQUENCY_THRESHOLD: 10,

    CURRENCY: 'NPR ',
    APP_NAME: 'Pinnacle Expense Manager',
    VERSION: '1.0.0 (CLG-Edition)',
    
    INITIAL_CATEGORIES: [
        { id: 'cat_1', name: 'Food & Dining', budget_limit: 500 },
        { id: 'cat_2', name: 'Transportation', budget_limit: 300 },
        { id: 'cat_3', name: 'Housing', budget_limit: 1200 },
        { id: 'cat_4', name: 'Entertainment', budget_limit: 200 },
        { id: 'cat_5', name: 'Utilities', budget_limit: 150 },
        { id: 'cat_6', name: 'Travel', budget_limit: 1000 },
    ]
};