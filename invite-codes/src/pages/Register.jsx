/**
 * Register Page
 *
 * User registration with invite code validation.
 * Features:
 * - Invite code input with validation
 * - Secure password requirements
 * - Glassmorphism design
 * - Loading states and error handling
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    code: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  /**
   * Update form field value
   */
  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const { name, email, password, code } = form;

    // Client-side validation
    if (!name || !email || !password || !code) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (name.length < 2) {
      toast.error('Nome deve ter no mínimo 2 caracteres');
      return;
    }

    if (password.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error('Código de convite deve ter exatamente 6 dígitos');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password, code);
      toast.success('Conta criada com sucesso!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Handle paste event for invite code (auto-fill)
   */
  function handleCodePaste(e) {
    const pasted = e.clipboardData.getData('text').trim();
    // Auto-fill if it looks like a 6-digit code
    if (/^\d{6}$/.test(pasted)) {
      e.preventDefault();
      updateField('code', pasted);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950 flex items-center justify-center p-4">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Register Card */}
      <div className="relative w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 shadow-2xl border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/25">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
            <p className="text-white/50 mt-2">Use seu código de convite para se cadastrar</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1.5">
                Nome
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                disabled={submitting}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                         transition-all duration-200 disabled:opacity-50"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={submitting}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                         transition-all duration-200 disabled:opacity-50"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Mínimo 8 caracteres, maiúscula, minúscula e número"
                autoComplete="new-password"
                disabled={submitting}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                         transition-all duration-200 disabled:opacity-50"
              />
              {/* Password requirements indicator */}
              <div className="mt-2 flex gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${form.password.length >= 8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                  8+ caracteres
                </span>
                <span className={`px-2 py-0.5 rounded-full ${/[A-Z]/.test(form.password) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                  Maiúscula
                </span>
                <span className={`px-2 py-0.5 rounded-full ${/[a-z]/.test(form.password) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                  Minúscula
                </span>
                <span className={`px-2 py-0.5 rounded-full ${/\d/.test(form.password) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                  Número
                </span>
              </div>
            </div>

            {/* Invite Code Field */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-white/70 mb-1.5">
                Código de Convite
              </label>
              <div className="relative">
                <input
                  id="code"
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    // Only allow digits
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    updateField('code', val);
                  }}
                  onPaste={handleCodePaste}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="off"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-white/20
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                           transition-all duration-200 disabled:opacity-50"
                />
                {/* Character count dots */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        form.code.length > i
                          ? 'bg-emerald-400 scale-125'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl
                       hover:from-emerald-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 mt-6"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando conta...
                </span>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/40 text-sm">
              Já tem conta?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}