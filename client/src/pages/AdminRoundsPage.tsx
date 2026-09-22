import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { Layers, Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Round } from '../types/index.js';

export const AdminRoundsPage: React.FC = () => {
  const { token } = useAdminAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    description: '',
    type: 'MCQ',
    duration_minutes: 15,
    question_count: 10,
    marks_per_question: 10,
    negative_marking: 0,
    status: 'READY',
    is_final_round: 0
  });

  const fetchRounds = async () => {
    try {
      const res = await fetch('/api/admin/rounds', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.rounds) setRounds(data.rounds);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [token]);

  const handleOpenCreate = () => {
    setEditingRound(null);
    setFormData({
      name: '',
      subtitle: '',
      description: '',
      type: 'MCQ',
      duration_minutes: 15,
      question_count: 10,
      marks_per_question: 10,
      negative_marking: 0,
      status: 'READY',
      is_final_round: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (round: Round) => {
    setEditingRound(round);
    setFormData({
      name: round.name,
      subtitle: round.subtitle || '',
      description: round.description || '',
      type: round.type,
      duration_minutes: round.duration_minutes,
      question_count: round.question_count,
      marks_per_question: round.marks_per_question,
      negative_marking: round.negative_marking,
      status: round.status,
      is_final_round: round.is_final_round
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRound) {
        await fetch(`/api/admin/rounds/${editingRound.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/admin/rounds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchRounds();
    } catch (e) {
      alert('Failed to save round');
    }
  };

  const handleDelete = async (roundId: string) => {
    if (!window.confirm('Delete this round and all its questions and submissions?')) return;
    try {
      await fetch(`/api/admin/rounds/${roundId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRounds();
    } catch (e) {
      alert('Failed to delete round');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">ROUND SYSTEM CONFIGURATION</h1>
          <p className="text-xs text-slate-400">Configure round types, timers, marks, and penalties.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE NEW ROUND</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rounds.map((round: any) => (
          <div
            key={round.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  round.status === 'LIVE'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : round.status === 'READY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {round.status}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {round.type}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">{round.name}</h3>
                <p className="text-xs text-amber-400/80 font-semibold">{round.subtitle}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{round.description}</p>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 text-[10px] uppercase block">Duration</span>
                  <span className="font-mono font-bold text-amber-400">{round.duration_minutes} min</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 text-[10px] uppercase block">Questions</span>
                  <span className="font-mono font-bold text-white">{round.totalQuestions || round.question_count} Qs</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 text-[10px] uppercase block">Marks</span>
                  <span className="font-mono font-bold text-emerald-400">+{round.marks_per_question}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 text-[10px] uppercase block">Penalty</span>
                  <span className="font-mono font-bold text-red-400">-{round.negative_marking}</span>
                </div>
              </div>

              {round.is_final_round === 1 && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold text-center">
                  Finalist-Only Round
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => handleOpenEdit(round)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Edit Round"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(round.id)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                title="Delete Round"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Round Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white">
              {editingRound ? 'Edit Round Configuration' : 'Create New Round'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase">Round Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Round 1: THE SCAN"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g. Online Prelims"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Round Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-sm outline-none cursor-pointer"
                  >
                    <option value="MCQ">MCQ (Multiple Choice)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="IMAGE">Image / Vision Round</option>
                    <option value="RAPID_FIRE">Rapid Fire</option>
                    <option value="BUZZER">Buzzer Round</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 uppercase">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Duration (Mins)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2.5 text-white text-sm font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Target Q Count</label>
                  <input
                    type="number"
                    value={formData.question_count}
                    onChange={(e) => setFormData({ ...formData, question_count: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2.5 text-white text-sm font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Marks / Q</label>
                  <input
                    type="number"
                    value={formData.marks_per_question}
                    onChange={(e) => setFormData({ ...formData, marks_per_question: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2.5 text-white text-sm font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 uppercase">Negative Penalty</label>
                  <input
                    type="number"
                    value={formData.negative_marking}
                    onChange={(e) => setFormData({ ...formData, negative_marking: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-2.5 text-white text-sm font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="finalRoundCheck"
                  checked={formData.is_final_round === 1}
                  onChange={(e) => setFormData({ ...formData, is_final_round: e.target.checked ? 1 : 0 })}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500"
                />
                <label htmlFor="finalRoundCheck" className="text-slate-300 font-semibold cursor-pointer">
                  Finalist-Only Round (Only qualified finalists can enter)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
                >
                  Save Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
