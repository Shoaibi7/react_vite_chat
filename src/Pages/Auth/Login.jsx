import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(form); // ✅ this calls the one from AuthContext
      // Redirect will happen via useEffect
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white shadow-md rounded-xl p-6 space-y-5"
      >
        <h1 className="text-2xl font-bold text-center">Login</h1>

        {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</div>}

        <input
          type="email"
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          type="password"
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition"
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>

        <p className="text-sm text-center">
          Don’t have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
