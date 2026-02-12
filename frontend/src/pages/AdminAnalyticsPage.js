import React, { useState, useEffect } from 'react';
import { BarChart, Users, TrendingUp, Calendar } from 'lucide-react';
import { getVisitorStats } from '../utils/analytics';
import { toast } from 'sonner';

const AdminAnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getVisitorStats(days);
      setStats(data);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalUniqueVisitors = stats?.daily_stats?.reduce((sum, day) => sum + day.unique_visitors, 0) || 0;
  const avgVisitsPerDay = stats?.total_visits ? (stats.total_visits / stats.period_days).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-oswald text-4xl font-bold mb-2">Website Analytics</h1>
          <p className="text-zinc-600">Visitor statistics (excluding admin visits)</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setDays(7)}
            className={`px-4 py-2 rounded-lg ${days === 7 ? 'bg-primary text-white' : 'bg-zinc-100'}`}
            data-testid="filter-7days"
          >
            7 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-4 py-2 rounded-lg ${days === 30 ? 'bg-primary text-white' : 'bg-zinc-100'}`}
            data-testid="filter-30days"
          >
            30 Days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-4 py-2 rounded-lg ${days === 90 ? 'bg-primary text-white' : 'bg-zinc-100'}`}
            data-testid="filter-90days"
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
          <div>
            <p className="text-zinc-600 text-sm mb-1">Total Visits</p>
            <p className="text-3xl font-bold">{stats?.total_visits || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <div>
            <p className="text-zinc-600 text-sm mb-1">Unique Visitors</p>
            <p className="text-3xl font-bold">{totalUniqueVisitors}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart className="text-purple-600" size={24} />
            </div>
          </div>
          <div>
            <p className="text-zinc-600 text-sm mb-1">Avg. Visits/Day</p>
            <p className="text-3xl font-bold">{avgVisitsPerDay}</p>
          </div>
        </div>
      </div>

      {/* Daily Stats Table */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="font-oswald text-2xl font-bold flex items-center gap-2">
            <Calendar size={24} />
            Daily Breakdown
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left p-4 font-semibold">Date</th>
                <th className="text-right p-4 font-semibold">Total Visits</th>
                <th className="text-right p-4 font-semibold">Unique Visitors</th>
                <th className="text-right p-4 font-semibold">Visits per Visitor</th>
              </tr>
            </thead>
            <tbody>
              {stats?.daily_stats?.slice().reverse().map((day, index) => {
                const visitsPerVisitor = day.unique_visitors > 0 
                  ? (day.total_visits / day.unique_visitors).toFixed(1) 
                  : 0;
                
                return (
                  <tr key={index} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="p-4">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-4 text-right font-mono">{day.total_visits}</td>
                    <td className="p-4 text-right font-mono">{day.unique_visitors}</td>
                    <td className="p-4 text-right font-mono">{visitsPerVisitor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Admin and super admin visits are excluded from these statistics. 
          Only regular user and guest visits are tracked.
        </p>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
