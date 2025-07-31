import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      nav('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || Object.values(data?.errors || {})[0]?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white shadow-md rounded-xl p-6 space-y-5"
      >
        <h1 className="text-2xl font-bold text-center">Register</h1>

        {error && <div className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</div>}

        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
        />

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={form.password_confirmation}
          onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
          required
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition"
          disabled={loading}
        >
          {loading ? 'Registering…' : 'Register'}
        </button>

        <p className="text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
