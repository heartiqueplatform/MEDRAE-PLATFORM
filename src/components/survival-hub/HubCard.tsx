import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
interface HubCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    count?: number;
}

export const HubCard = ({ title, description, icon: Icon, href, color, count }: HubCardProps) => {
    return (
        <Link
            to={href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
            <div className={`${color} mb-4 inline-flex rounded-lg p-3 text-white`}>
                <Icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>

            {count !== undefined && (
                <span className="mt-4 inline-block text-xs font-medium text-blue-600 dark:text-blue-400">
                    {count} locations listed →
                </span>
            )}
        </Link>
    );
};