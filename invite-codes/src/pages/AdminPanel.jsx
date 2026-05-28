/**
 * Admin Panel Page
 *
 * Complete invite code management dashboard.
 * Features:
 * - Generate new invite codes with optional expiration
 * - View all codes with pagination
 * - Search and filter codes
 * - Copy code to clipboard
 * - Manual invalidation
 * - Real-time status indicators
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

export default function AdminPanel() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [codes, setCodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterUsed, setFilterUsed] = useState(undefined); // undefined = all, true/false

  // Generate code form
  const [showGenerate, setShowGenerate] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState('');
  const [codeLabel, setCodeLabel] = useState('');
  const [generating, setGenerating] = useState(false);

  // Invalidation
  const [invalidatingId, setInvalidatingId] = useState(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  /**
   * Fetch invite codes from backend
   */
  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.listCodes({
        page,
        limit: PAGE_SIZE,
        used: filterUsed,
        search,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      setCodes(response.data.codes);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar códigos');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterUsed]);

  // Fetch codes on mount and when filters change
  useEffect(() => {
    if (isAdmin) {
      fetchCodes();
    }
  }, [fetchCodes, isAdmin]);

  // Check admin access
  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
    }
  }, [isAdmin, navigate]);

  /**
   * Generate new invite code
   */
  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const data = {};
      if (expiresInHours) data.expiresInHours = parseInt(expiresInHours, 10);
      if (codeLabel) data.label = codeLabel;

      const response = await adminApi.generateCode(data);
      const newCode = response.data;

      toast.success('Código gerado com sucesso!');
      setShowGenerate(false);
      setExpiresInHours('');
      setCodeLabel('');

      // Refresh list and go to first page
      setPage(1);
      await fetchCodes();

      // Auto-copy the new code
      await navigator.clipboard.writeText(newCode.code);
      toast.success(`Código ${newCode.code} copiado!`);
    } catch (err) {
      toast.error(err.message || 'Erro ao gerar código');
    } finally {
      setGenerating(false);
    }
  }

  /**
   * Copy code to clipboard
   */
  async function copyCode(code, id) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success('Código copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  }

  /**
   * Invalidate a code
   */
  async function invalidateCode(id) {
    if (!window.confirm('Tem certeza que deseja invalidar este código?')) return;

    setInvalidatingId(id);
    try {
      await adminApi.invalidateCode(id);
      toast.success('Código invalidado com sucesso');
      await fetchCodes();
    } catch (err) {
      toast.error(err.message || 'Erro ao invalidar código');
    } finally {
      setInvalidatingId(null);
    }
  }

  /**
   * Handle logout
   */
  function handleLogout() {
    logout();
    navigate('/login');
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  /**
   * Determine code status
   */
  function getCodeStatus(code) {
    if (code.used) return { label: 'Usado', color: 'bg-yellow-500/20 text-yellow-400' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: 'Expirado', color: 'bg-red-500/20 text-red-400' };
    }
    return { label: 'Ativo', color: 'bg-emerald-500/20 text-emerald-400' };
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation Bar */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white">Painel Admin</h1>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/50">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-sm text-white/50 mb-1">Total de Códigos</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-sm text-white/50 mb-1">Ativos</p>
            <p className="text-2xl font-bold text-emerald-400">
              {codes.filter((c) => !c.used && (!c.expires_at || new Date(c.expires_at) > new Date())).length}
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-sm text-white/50 mb-1">Utilizados</p>
            <p className="text-2xl font-bold text-yellow-400">
              {codes.filter((c) => c.used).length}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar código..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                       transition-all duration-200"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter */}
          <select
            value={filterUsed === undefined ? '' : filterUsed.toString()}
            onChange={(e) => {
              const val = e.target.value;
              setFilterUsed(val === '' ? undefined : val === 'true');
              setPage(1);
            }}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                     transition-all duration-200"
          >
            <option value="" className="bg-gray-900">Todos</option>
            <option value="false" className="bg-gray-900">Ativos</option>
            <option value="true" className="bg-gray-900">Utilizados</option>
          </select>

          {/* Generate Button */}
          <button
            onClick={() => setShowGenerate(!showGenerate)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl
                     hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200
                     shadow-lg shadow-emerald-500/25 flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Gerar Código
          </button>
        </div>

        {/* Generate Code Form */}
        {showGenerate && (
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10 mb-6 animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Expira em (horas) - opcional
                </label>
                <input
                  type="number"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  placeholder="Deixe vazio para não expirar"
                  min="1"
                  max="8760"
                  disabled={generating}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                           transition-all duration-200 disabled:opacity-50"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Identificação (label) - opcional
                </label>
                <input
                  type="text"
                  value={codeLabel}
                  onChange={(e) => setCodeLabel(e.target.value)}
                  placeholder="Ex: Marketing, Parceiros"
                  maxLength={100}
                  disabled={generating}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                           transition-all duration-200 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={generating}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl
                         hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200
                         shadow-lg shadow-emerald-500/25 disabled:opacity-50 whitespace-nowrap"
              >
                {generating ? 'Gerando...' : 'Gerar'}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerate(false)}
                disabled={generating}
                className="px-4 py-2.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
            </form>
          </div>
        )}

        {/* Codes Table */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Código</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Label</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Criado em</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Expira em</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Usado por</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-white/50">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <LoadingSpinner text="Carregando códigos..." />
                    </td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-white/30">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium mb-1">Nenhum código encontrado</p>
                        <p className="text-sm">Clique em "Gerar Código" para criar o primeiro</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <tr key={code.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        {/* Code */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-white tracking-wider">
                              {code.code}
                            </span>
                            <button
                              onClick={() => copyCode(code.code, code.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                              title="Copiar código"
                            >
                              {copiedId === code.id ? (
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-white/40 hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>

                        {/* Label */}
                        <td className="px-6 py-4 text-sm text-white/60">
                          {code.label || '-'}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4 text-sm text-white/60">
                          {formatDate(code.created_at)}
                        </td>

                        {/* Expires At */}
                        <td className="px-6 py-4 text-sm text-white/60">
                          {code.expires_at ? formatDate(code.expires_at) : 'Nunca'}
                        </td>

                        {/* Used By */}
                        <td className="px-6 py-4 text-sm text-white/60">
                          {code.used_by ? (
                            <span className="font-mono text-xs">{code.used_by.slice(0, 8)}...</span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {!code.used && (
                            <button
                              onClick={() => invalidateCode(code.id)}
                              disabled={invalidatingId === code.id}
                              className="px-3 py-1.5 text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                            >
                              {invalidatingId === code.id ? '...' : 'Invalidar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <p className="text-sm text-white/40">
                Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-30"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-white/50">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-30"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}