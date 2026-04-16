import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";


import { useAuth } from "../../context/AuthContext";
import { useCompany } from "../../context/CompanyContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const { companyName } = useCompany();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(userId, password, stayLoggedIn);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-xl object-contain dark:invert" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{companyName}</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Sign in with your user ID and password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">User ID</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={inputCls}
                placeholder="Your user ID"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Enter your password" />
            </div>

            {/* Stay logged in */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Stay logged in</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Accounts are created by your administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
