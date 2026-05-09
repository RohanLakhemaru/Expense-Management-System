import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { Reports } from './components/Reports';
import { AuditLog } from './components/AuditLog';
import { CategoryManager } from './components/CategoryManager';
import { CategoryDetail } from './components/CategoryDetail';
import { NotificationPage } from './components/NotificationPage';
import { TransactionModal } from './components/TransactionModal';
import { TransactionHistory } from './components/TransactionHistory';
import { SavingsPlanner } from './components/SavingsPlanner';
import { MonthlyReport } from './components/MonthlyReport';
import { Auth } from './components/Auth';
import { db } from './services/db';
import { User } from './types';

const App: React.FC = () => {
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const handleDataUpdate = () => setRefreshKey(prev => prev + 1);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;

    const initApp = async () => {
      try {
        console.log("🔄 [App] Checking session...");

        timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          'http://localhost/NewManagementSystem/Expense-Management-System/index.php?action=currentUser',
          {
            credentials: 'include',
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          }
        );

        console.log(`📊 [App] Session check status: ${response.status}`);

        if (response.status === 401) {
          console.log("ℹ️ [App] User not authenticated (401)");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          console.error(`❌ [App] Unexpected status: ${response.status}`);
          setLoading(false);
          return;
        }

        const user = await response.json().catch((e) => {
          console.error("❌ [App] Failed to parse user:", e);
          return null;
        });

        if (!user) {
          console.error("❌ [App] Invalid user response");
          setLoading(false);
          return;
        }

        console.log("✅ [App] User session valid, setting user:", user.username);
        setCurrentUser(user);

        // Initialize DB with retries
        try {
          console.log("🔄 [App] Initializing database...");
          await db.init();
          console.log("✅ [App] Database initialized, isConnected:", db.getStatus());
          setIsConnected(db.getStatus());

          // Ensure existing users have initial categories
          console.log("🔄 [App] Checking/migrating categories...");
          await db.migrateCategories();
        } catch (dbError: any) {
          console.error("❌ [App] Database initialization failed:", dbError.message);
          setInitError(dbError.message);
          // Don't set isConnected to false - let the user proceed with empty data
          setIsConnected(false);
        }

      } catch (error: any) {
        if (error.name === "AbortError") {
          console.error("⏱ [App] Request timeout");
        } else {
          console.error("❌ [App] Init error:", error.message);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    initApp();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleAuthSuccess = () => {
    console.log("✅ [App] Auth success, loading user data...");
    const user = db.getCurrentUser();
    console.log("✅ [App] Got user:", user?.username);
    setCurrentUser(user);
    setIsConnected(db.getStatus());
    handleDataUpdate();
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
  };

  const location = useLocation();
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/add') return 'Add Transaction';
    if (path.startsWith('/history')) return 'History';
    if (path === '/reports') return 'Financial Reports';
    if (path === '/categories') return 'Manage Categories';
    if (path === '/notifications') return 'Notifications';
    if (path === '/audit') return 'Audit Log';
    if (path === '/savings') return 'Savings Planner';
    if (path === '/monthly-report') return 'Monthly Report';
    if (path.startsWith('/category/')) return 'Category Details';
    return 'Pinnacle Manager';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800">Initializing System...</h2>
          <p className="text-slate-500 text-sm">Attempting MySQL Connection</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar onLogout={handleLogout} currentUser={currentUser} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {getHeaderTitle()}
          </h2>

          {isConnected ? (
            <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 flex items-center shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Online
            </span>
          ) : (
            <span className="text-sm text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 flex items-center shadow-sm">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Offline Mode
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard key={refreshKey} />} />
              <Route path="/add" element={<ExpenseForm />} />
              <Route path="/history" element={<TransactionHistory key={refreshKey} onTransactionClick={setSelectedTxnId} />} />
              <Route path="/history/:monthId" element={<TransactionHistory key={refreshKey} onTransactionClick={setSelectedTxnId} />} />
              <Route path="/reports" element={<Reports key={refreshKey} onTransactionClick={setSelectedTxnId} />} />
              <Route path="/categories" element={<CategoryManager key={refreshKey} />} />
              <Route path="/notifications" element={<NotificationPage key={refreshKey} />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/savings" element={<SavingsPlanner key={refreshKey} />} />
              <Route path="/monthly-report" element={<MonthlyReport key={refreshKey} />} />
              <Route
                path="/category/:categoryId"
                element={
                  <CategoryDetail
                    key={refreshKey}
                    onTransactionClick={setSelectedTxnId}
                    onUpdate={handleDataUpdate}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {selectedTxnId && (
        <TransactionModal
          transactionId={selectedTxnId}
          onClose={() => setSelectedTxnId(null)}
          onUpdate={handleDataUpdate}
        />
      )}
    </div>
  );
};

export default App;