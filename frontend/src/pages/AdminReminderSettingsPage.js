import React, { useState, useEffect } from 'react';
import { Clock, Mail, Bell, Save, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getReminderSettings, updateReminderSettings, getReminderStatus } from '../utils/api';
import { toast } from 'sonner';

const AdminReminderSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState({
    enabled: true,
    reminder_days: [3, 7, 14],
    send_time_hour: 9,
    send_time_minute: 0,
    email_subject_prefix: '[Reminder]',
    max_reminders: 3
  });
  const [newDay, setNewDay] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        getReminderSettings(),
        getReminderStatus()
      ]);
      setSettings(settingsRes.data);
      setStatus(statusRes.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReminderSettings(settings);
      toast.success('Settings saved successfully!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addReminderDay = () => {
    const day = parseInt(newDay);
    if (!day || day < 1 || day > 90) {
      toast.error('Enter a valid day (1-90)');
      return;
    }
    if (settings.reminder_days.includes(day)) {
      toast.error('This day already exists');
      return;
    }
    setSettings({
      ...settings,
      reminder_days: [...settings.reminder_days, day].sort((a, b) => a - b)
    });
    setNewDay('');
  };

  const removeReminderDay = (day) => {
    if (settings.reminder_days.length <= 1) {
      toast.error('At least one reminder day is required');
      return;
    }
    setSettings({
      ...settings,
      reminder_days: settings.reminder_days.filter(d => d !== day)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-red-600" />
          Quote Reminder Settings
        </h1>
        <p className="text-gray-600 mt-1">Configure automated email reminders for unpaid quotes</p>
      </div>

      {/* Status Card */}
      {status && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-600" />
            Current Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{status.total_pending_quotes}</p>
              <p className="text-sm text-gray-600">Pending Quotes</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{status.reminders_sent?.['3_day'] || 0}</p>
              <p className="text-sm text-gray-600">3-Day Sent</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{status.reminders_sent?.['7_day'] || 0}</p>
              <p className="text-sm text-gray-600">7-Day Sent</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{status.reminders_sent?.['14_day'] || 0}</p>
              <p className="text-sm text-gray-600">14-Day Sent</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {status.scheduler_running ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle size={16} /> Scheduler Running
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle size={16} /> Scheduler Stopped
              </span>
            )}
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-900">Enable Reminders</h3>
            <p className="text-sm text-gray-600">Turn automated quote reminders on or off</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        {/* Reminder Days */}
        <div>
          <label className="block font-semibold text-gray-900 mb-2">
            <Clock size={16} className="inline mr-2" />
            Reminder Days
          </label>
          <p className="text-sm text-gray-600 mb-3">Send reminders X days after quote creation</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.reminder_days.map(day => (
              <span key={day} className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Day {day}
                <button
                  onClick={() => removeReminderDay(day)}
                  className="hover:bg-red-200 rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="number"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
              placeholder="Enter day (1-90)"
              min="1"
              max="90"
              className="px-3 py-2 border rounded-lg w-40 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button
              onClick={addReminderDay}
              className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Plus size={18} /> Add Day
            </button>
          </div>
        </div>

        {/* Send Time */}
        <div>
          <label className="block font-semibold text-gray-900 mb-2">
            <Mail size={16} className="inline mr-2" />
            Daily Send Time
          </label>
          <p className="text-sm text-gray-600 mb-3">When to check and send reminder emails daily</p>
          
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hour (0-23)</label>
              <input
                type="number"
                value={settings.send_time_hour}
                onChange={(e) => setSettings({ ...settings, send_time_hour: parseInt(e.target.value) || 0 })}
                min="0"
                max="23"
                className="px-3 py-2 border rounded-lg w-20 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <span className="text-2xl font-bold text-gray-400 mt-5">:</span>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Minute (0-59)</label>
              <input
                type="number"
                value={settings.send_time_minute}
                onChange={(e) => setSettings({ ...settings, send_time_minute: parseInt(e.target.value) || 0 })}
                min="0"
                max="59"
                className="px-3 py-2 border rounded-lg w-20 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <span className="text-gray-500 mt-5">(Server time: UTC)</span>
          </div>
        </div>

        {/* Email Subject Prefix */}
        <div>
          <label className="block font-semibold text-gray-900 mb-2">Email Subject Prefix</label>
          <p className="text-sm text-gray-600 mb-3">Text added before the quote number in email subjects</p>
          <input
            type="text"
            value={settings.email_subject_prefix}
            onChange={(e) => setSettings({ ...settings, email_subject_prefix: e.target.value })}
            placeholder="[Reminder]"
            className="px-3 py-2 border rounded-lg w-full max-w-xs focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Preview: "{settings.email_subject_prefix} Your Quote QT-0226-XXXXXX from Temaruco"
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Reminders Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The system checks for unpaid quotes daily at the configured time</li>
          <li>• Quotes receive reminders only once per configured day interval</li>
          <li>• Only quotes with status "draft" or "pending" receive reminders</li>
          <li>• Paid or cancelled quotes are excluded from reminders</li>
          <li>• Each quote tracks which reminders have been sent</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminReminderSettingsPage;
