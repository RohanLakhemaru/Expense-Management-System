import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentChartBarIcon, 
  PlusCircleIcon, 
  ExclamationTriangleIcon,
  TagIcon,
  BellIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { User } from '../types';

interface SidebarProps {
  onLogout: () => void;
  currentUser: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, currentUser }) => {
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: HomeIcon, end: true },
    { path: '/add', label: 'Transactions', icon: PlusCircleIcon, end: false },
    { path: '/history', label: 'History', icon: CalendarDaysIcon, end: false },
    { path: '/reports', label: 'Reports', icon: DocumentChartBarIcon, end: false },
    { path: '/categories', label: 'Manage Categories', icon: TagIcon, end: false },
    { path: '/notifications', label: 'Notifications', icon: BellIcon, end: false },
    { path: '/audit', label: 'Audit Log', icon: ExclamationTriangleIcon, end: false },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">Pinnacle<span className="text-white">Manager</span></h1>
        <p className="text-xs text-slate-400 mt-1">College Project Edition</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium">{currentUser?.username || 'Student Admin'}</p>
              <p className="text-xs text-slate-500 truncate max-w-[100px]">{currentUser?.email || 'PHP/MySQL Mode'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};