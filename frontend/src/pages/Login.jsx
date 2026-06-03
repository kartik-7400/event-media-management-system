import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex justify-center items-center px-6">
      <div className="w-full max-w-[440px] glass-card animate-fade-in-up">
        <h2 className="text-2xl font-extrabold text-center mb-1" style={{ letterSpacing: '-0.02em' }}>Welcome Back</h2>
        <p className="text-sm text-text-secondary text-center mb-8">Access your event-driven media library</p>

        {error && (
          <div className="mb-5 p-3 rounded-md bg-error-muted border border-error/15 text-error text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input 
              id="login-email"
              type="email" 
              className="form-control" 
              placeholder="name@club.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input 
              id="login-password"
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-2 py-3"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-bold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
