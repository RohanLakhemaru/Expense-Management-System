import React, { useState, useEffect } from 'react';
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
import { Auth } from './components/Auth';
import { db } from './services/db';
import { User } from './types';

const App: React.FC = () => {
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Helper to force re-render components when DB updates
  const [refreshKey, setRefreshKey] = useState(0);
  const handleDataUpdate = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Check if user is already authenticated
        const response = await fetch('http://localhost/Expense-Management-System/index.php?action=currentUser', {
          credentials: 'include'
        });
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
          // Load data for authenticated user
          await db.init();
          setIsConnected(db.getStatus());
        } else {
          // Not authenticated
        }
      } catch (error) {
        // API unavailable or not authenticated
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const handleAuthSuccess = () => {
    setCurrentUser(db.getCurrentUser());
    handleDataUpdate();
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
  };

  // Dynamic Header Title Logic
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
    if (path.startsWith('/category/')) return 'Category Details';
    return 'Pinnacle Manager';
  };

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-50">
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar onLogout={handleLogout} currentUser={currentUser} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
            <div>
                <h2 className="text-xl font-bold text-slate-800 capitalize">
                    {getHeaderTitle()}
                </h2>
            </div>
            <div className="flex items-center space-x-4">
                {isConnected ? (
                    <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 flex items-center shadow-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        MySQL Connected
                    </span>
                ) : (
                    <span className="text-sm text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 flex items-center shadow-sm" title="Server unreachable. Data not available.">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                        Offline Mode
                    </span>
                )}
            </div>
        </header>

        {/* Main Content Area */}
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
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </main>
      </div>

      {/* Global Transaction Modal */}
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