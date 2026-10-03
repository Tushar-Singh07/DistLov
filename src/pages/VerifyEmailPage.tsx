import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryEmail = searchParams.get('email');

  const { user, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (token) {
      setVerifying(true);
      setError('');
      verifyEmail(token)
        .then(() => {
          setVerifiedSuccess(true);
          setTimeout(() => navigate('/dashboard'), 2500);
        })
        .catch(err => {
          setError(err.message || 'Verification token invalid or expired.');
        })
        .finally(() => setVerifying(false));
    }
  }, [token]);

  const handleResend = () => {
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-dark-bg">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="glass-panel p-8 rounded-3xl shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center mx-auto shadow-inner">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verify your email address</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We sent a verification link to{' '}
              <strong className="text-gray-900 dark:text-gray-200">
                {queryEmail || user?.email || 'your registered email'}
              </strong>.
            </p>
          </div>

          {verifying && (
            <div className="p-3 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 text-xs font-semibold animate-pulse">
              Verifying email token...
            </div>
          )}

          {verifiedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-4 h-4" /> Email verified! Redirecting to Dashboard...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={countdown > 0}
              onClick={handleResend}
              icon={<RefreshCw className={`w-4 h-4 ${countdown > 0 ? 'animate-spin' : ''}`} />}
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend Verification Email'}
            </Button>

            <Link to="/login" className="block">
              <Button variant="primary" className="w-full">
                Proceed to Sign In
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
            <Link to="/login" className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
            <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
              Change email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
