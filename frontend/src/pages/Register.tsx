import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { HardDrive } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await register({ username, email, password, full_name: fullName });
      toast.success('Registration successful!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light flex flex-col justify-center items-center p-4 selection:bg-lime">
      <div className="w-full max-w-md bg-white rounded-3xl border border-subtle-border p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-ink-primary flex items-center justify-center text-white mb-3 shadow-sm">
            <HardDrive className="w-6 h-6 text-lime" />
          </div>
          <h2 className="text-xl font-bold text-ink-primary">Create Researcher Account</h2>
          <p className="text-xs text-ink-secondary mt-1">
            Access the Intelligent Cloud Storage Environment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alan Turing"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-sm focus:outline-none focus:border-ink-primary transition-colors bg-canvas-light/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. aturing"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-sm focus:outline-none focus:border-ink-primary transition-colors bg-canvas-light/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aturing@university.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-sm focus:outline-none focus:border-ink-primary transition-colors bg-canvas-light/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-sm focus:outline-none focus:border-ink-primary transition-colors bg-canvas-light/30"
              required
            />
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Register Account
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-subtle-border text-center text-xs text-ink-secondary">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-ink-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

