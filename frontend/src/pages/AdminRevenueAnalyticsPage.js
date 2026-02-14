import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Package, Users, Calendar, RefreshCw, Download 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const COLORS = ['#D90429', '#2B2D42', '#8D99AE', '#EF233C', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];

// CSV Export Helper
const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  toast.success(`${filename} exported successfully`);
};

const AdminRevenueAnalyticsPage = () => {
  const [revenueData, setRevenueData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const [revenueRes, productRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/analytics/revenue?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/admin/analytics/products?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setRevenueData(revenueRes.data);
      setProductData(productRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-NG').format(value);
  };

  // Calculate growth percentage
  const calculateGrowth = () => {
    if (!revenueData?.daily_data || revenueData.daily_data.length < 2) return 0;
    
    const midPoint = Math.floor(revenueData.daily_data.length / 2);
    const firstHalf = revenueData.daily_data.slice(0, midPoint);
    const secondHalf = revenueData.daily_data.slice(midPoint);
    
    const firstRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
    const secondRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
    
    if (firstRevenue === 0) return secondRevenue > 0 ? 100 : 0;
    return ((secondRevenue - firstRevenue) / firstRevenue * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const growth = calculateGrowth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="revenue-analytics-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-oswald text-3xl font-bold mb-2">Revenue Analytics</h1>
          <p className="text-zinc-600">Business performance and insights</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
              data-testid={`filter-${d}days`}
            >
              {d} Days
            </Button>
          ))}
          <Button variant="outline" onClick={loadAnalytics} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportToCSV(revenueData?.daily_data, 'revenue_report')}
            data-testid="export-revenue-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Revenue
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportToCSV(productData?.top_products, 'products_report')}
            data-testid="export-products-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Products
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="total-revenue-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData?.total_revenue || 0)}</div>
            <div className={`text-sm flex items-center ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(growth)}% vs previous period
            </div>
          </CardContent>
        </Card>

        <Card data-testid="total-orders-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(revenueData?.total_orders || 0)}</div>
            <p className="text-sm text-zinc-500">In the last {days} days</p>
          </CardContent>
        </Card>

        <Card data-testid="avg-order-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Avg. Order Value</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData?.avg_order_value || 0)}</div>
            <p className="text-sm text-zinc-500">Per order</p>
          </CardContent>
        </Card>

        <Card data-testid="products-sold-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Products Sold</CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(productData?.total_products_sold || 0)}</div>
            <p className="text-sm text-zinc-500">Total items</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="mb-8" data-testid="revenue-chart-card">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData?.daily_data || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D90429" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D90429" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-NG', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#D90429" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Order Type Breakdown */}
        <Card data-testid="order-type-chart-card">
          <CardHeader>
            <CardTitle>Revenue by Order Type</CardTitle>
            <CardDescription>Distribution across different services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueData?.type_breakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="type"
                  >
                    {(revenueData?.type_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card data-testid="orders-chart-card">
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
            <CardDescription>Number of orders per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData?.daily_data?.slice(-14) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [value, 'Orders']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-NG')}
                  />
                  <Bar dataKey="orders" fill="#2B2D42" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Selling Products */}
      <Card data-testid="top-products-card">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performers in the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          {productData?.top_products?.length > 0 ? (
            <div className="space-y-4">
              {productData.top_products.slice(0, 10).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-zinc-500">{formatNumber(product.quantity)} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              No product sales data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Status Distribution */}
      {revenueData?.status_breakdown && Object.keys(revenueData.status_breakdown).length > 0 && (
        <Card className="mt-8" data-testid="status-breakdown-card">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Current status of all orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(revenueData.status_breakdown).map(([status, count], index) => (
                <div 
                  key={status} 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}
                >
                  <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                    {formatNumber(count)}
                  </p>
                  <p className="text-sm text-zinc-600 capitalize">{status.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminRevenueAnalyticsPage;
