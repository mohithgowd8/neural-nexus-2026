import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import {
  HelpCircle,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  X,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';

interface QuestionItem {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  image_url?: string | null;
  category: string;
  is_active: number;
  created_at: string;
}

export const AdminQuestionsPage: React.FC = () => {
  const { token } = useAdminAuth();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    points: 10,
    image_url: '',
    category: 'AI & Data Science',
    is_active: 1
  });

  // JSON Upload text
  const [jsonText, setJsonText] = useState('');

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/admin/questions', window.location.origin);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      if (selectedCategory && selectedCategory !== 'all') url.searchParams.append('category', selectedCategory);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Fetch questions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [searchTerm, selectedCategory]);

  // One-click Load 100 Competition Questions
  const handleLoad100 = async () => {
    const confirmLoad = window.confirm(
      'Load the 100 official AI & Data Science competition questions into the Question Bank?\n\nThis will populate Q001 through Q100.'
    );
    if (!confirmLoad) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/questions/load-100', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotification(data.message || 'Successfully loaded 100 competition questions!');
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to load 100 questions');
      }
    } catch (err) {
      console.error('Load 100 failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle question active status
  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/questions/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, is_active: q.is_active ? 0 : 1 } : q))
        );
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Delete question
  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete question ${id}?`)) return;

    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setNotification(`Question ${id} deleted.`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Purge all questions
  const handlePurge = async () => {
    if (!window.confirm('Are you sure you want to PURGE ALL QUESTIONS?\n\nThis will remove all questions from the bank.')) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/questions/purge', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuestions([]);
        setNotification('All questions purged. Question bank is now empty.');
      }
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormData({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      points: q.points || 10,
      image_url: q.image_url || '',
      category: q.category || 'AI & Data Science',
      is_active: q.is_active
    });
    setShowAddModal(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      id: '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      points: 10,
      image_url: '',
      category: 'AI & Data Science',
      is_active: 1
    });
    setShowAddModal(true);
  };

  // Handle Form Submit (Add or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingQuestion;
      const endpoint = isEdit ? `/api/admin/questions/${editingQuestion.id}` : '/api/admin/questions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNotification(`Question ${isEdit ? 'updated' : 'created'} successfully!`);
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to save question');
      }
    } catch (err) {
      console.error('Save question error:', err);
    }
  };

  // Handle Bulk JSON Upload
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        alert('Invalid JSON: Must be an array of questions');
        return;
      }

      setLoading(true);
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions: parsed })
      });

      const data = await res.json();
      if (res.ok) {
        setShowUploadModal(false);
        setJsonText('');
        setNotification(data.message || 'Questions uploaded successfully!');
        fetchQuestions();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert('JSON Parse Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = questions.filter((q) => q.is_active === 1).length;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Question Bank</h2>
          <p className="text-xs text-slate-400">
            {questions.length} Total Questions &bull;{' '}
            <span className="text-amber-400 font-bold">{activeCount} Active</span> (Target: 100 questions)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleLoad100}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load 100 AI/DS Questions</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          <button
            onClick={handlePurge}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
            title="Purge all questions"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-amber-400 font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions or ID (Q001)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-xs text-slate-400">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={fetchQuestions}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Question Cards / Table */}
      {questions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Question Bank is Empty</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform starts with 0 questions. Click below to load the official 100 AI &amp; Data Science competition questions with 1 click!
          </p>
          <button
            onClick={handleLoad100}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Load 100 Questions Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`bg-slate-900 border rounded-2xl p-5 space-y-3 transition-all ${
                q.is_active
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-slate-800/40 opacity-50 bg-slate-950/60'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                    {q.id}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                    {q.category}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 font-mono">
                    Correct: Option {q.correct_answer}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(q.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                      q.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {q.is_active ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => openEditModal(q)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <h4 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {q.question_text}
              </h4>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                    q.correct_answer === 'A'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-black text-slate-400">A.</span>
                  <span>{q.option_a}</span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                    q.correct_answer === 'B'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-black text-slate-400">B.</span>
                  <span>{q.option_b}</span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                    q.correct_answer === 'C'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-black text-slate-400">C.</span>
                  <span>{q.option_c}</span>
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                    q.correct_answer === 'D'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-black text-slate-400">D.</span>
                  <span>{q.option_d}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingQuestion ? `Edit Question ${editingQuestion.id}` : 'Add New Question'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-medium">Question ID (optional)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="e.g. Q001"
                    disabled={!!editingQuestion}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Question Text *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question description..."
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Option A *</label>
                  <input
                    type="text"
                    required
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Option B *</label>
                  <input
                    type="text"
                    required
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Option C *</label>
                  <input
                    type="text"
                    required
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Option D *</label>
                  <input
                    type="text"
                    required
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-slate-400 font-medium">Correct Answer *</label>
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value, 10) || 10 })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Active Status</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value, 10) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer uppercase tracking-wider"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Import Questions via JSON</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a JSON array containing question objects with: <code className="text-amber-400 font-mono">id, question_text, option_a, option_b, option_c, option_d, correct_answer ('A'|'B'|'C'|'D')</code>.
            </p>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <textarea
                required
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{"id":"Q001","question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"B"}]'
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Import Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
