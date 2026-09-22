import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import {
  Settings,
  Save,
  Clock,
  HelpCircle,
  Zap,
  Eye,
  CheckCircle2,
  Sliders,
  RotateCcw
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { token } = useAdminAuth();
  const [settings, setSettings] = useState({
    total_questions: 100,
    question_time_seconds: 120,
    max_points: 10,
    speed_scoring_enabled: 1,
    leaderboard_visible: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        setNotification('Settings saved successfully!');
        setTimeout(() => setNotification(null), 3000);
      } else {
        alert(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Quiz Engine Configuration</h2>
        <p className="text-xs text-slate-400">
          Configure question time limits, speed-scoring multipliers, and global quiz parameters.
        </p>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Total Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Total Questions Per Team</span>
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={settings.total_questions}
              onChange={(e) => setSettings({ ...settings, total_questions: parseInt(e.target.value, 10) || 100 })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Each team receives this number of randomized questions (Default: 100).
            </p>
          </div>

          {/* Question Time (Seconds) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Time Limit Per Question (Seconds)</span>
            </label>
            <input
              type="number"
              min={10}
              max={600}
              value={settings.question_time_seconds}
              onChange={(e) => setSettings({ ...settings, question_time_seconds: parseInt(e.target.value, 10) || 120 })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Strict server-authoritative timer for each question (Default: 120 seconds = 02:00).
            </p>
          </div>
        </div>

        {/* Max Points */}
        <div className="border-t border-slate-800 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Maximum Points Per Question</span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.max_points}
              onChange={(e) => setSettings({ ...settings, max_points: parseInt(e.target.value, 10) || 10 })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Base points awarded for a correct answer (Default: 10).
            </p>
          </div>

          {/* Speed Scoring Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Fast Answer Scoring Mode</span>
            </label>
            <select
              value={settings.speed_scoring_enabled}
              onChange={(e) => setSettings({ ...settings, speed_scoring_enabled: parseInt(e.target.value, 10) })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value={1}>Enabled (Graduated: 0-20s: 10pts, 21-40s: 9pts, etc.)</option>
              <option value={0}>Disabled (Flat Points for correct answers)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Rewards participants based on rapid response time.
            </p>
          </div>
        </div>

        {/* Leaderboard Visibility */}
        <div className="border-t border-slate-800 pt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Public Leaderboard Visibility to Participants</span>
          </label>
          <select
            value={settings.leaderboard_visible}
            onChange={(e) => setSettings({ ...settings, leaderboard_visible: parseInt(e.target.value, 10) })}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value={0}>Hidden during quiz (Revealed only after completion)</option>
            <option value={1}>Always Publicly Visible</option>
          </select>
          <p className="text-[11px] text-slate-500">
            Per competition guidelines, standings should remain hidden from participants during active answering.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'SAVING...' : 'SAVE SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
