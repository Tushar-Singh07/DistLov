import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, Send } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const msg = await requestPasswordReset(email);
      setMessage(msg);
      setSubmitted(true);
    } catch (err: any) {
      setMessage('If an account exists for this email, password reset instructions have been sent.');
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-dark-bg">
      <div className="w-full max-w-md space-y-6">
        <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center mx-auto shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs text-center space-y-3 border border-emerald-200 dark:border-emerald-900">
              <p className="font-semibold">Reset Link Dispatched</p>
              <p>{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Registered Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} icon={<Send className="w-4 h-4" />}>
                Send Password Reset Link
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
            <Link to="/login" className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
