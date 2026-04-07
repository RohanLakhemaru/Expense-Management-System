import React from 'react';
import { db } from '../services/db';
import { BellIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

export const NotificationPage: React.FC = () => {
    const notifications = db.getNotifications();

    const getTypeStyles = (type: string) => {
        switch(type) {
            case 'critical': return 'bg-red-50 border-red-200 text-red-800';
            case 'anomaly': return 'bg-orange-50 border-orange-200 text-orange-800';
            default: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Notifications & Alerts</h2>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                    {notifications.length} New
                </span>
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">All Caught Up!</h3>
                    <p className="text-slate-500">You have no active alerts or warnings.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((note) => (
                        <div key={note.id} className={`p-4 rounded-xl border flex items-start space-x-4 shadow-sm ${getTypeStyles(note.type)}`}>
                            <div className="flex-shrink-0 mt-1">
                                {note.type === 'critical' ? (
                                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                                ) : note.type === 'anomaly' ? (
                                    <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                                ) : (
                                    <BellIcon className="w-6 h-6 text-yellow-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm uppercase tracking-wide opacity-90">{note.title}</h4>
                                <p className="mt-1 text-sm">{note.message}</p>
                                <p className="mt-2 text-xs opacity-60">{new Date(note.date).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};