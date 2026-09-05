"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.login({ email, password });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res));
      window.location.href = "/dashboard";
    } catch { setError("Ungültige Anmeldedaten"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="brand-logo text-3xl text-primary">Gentle Suite<sup>®</sup></h1>
          <p className="text-muted mt-2">Agentur-Management System</p>
        </div>
        <form onSubmit={handleLogin} className="bg-surface rounded-xl border border-border p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Anmelden</h2>
          {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">E-Mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ihre@email.de" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Passwort</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort" className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors">Anmelden</button>
          </div>
          <div className="text-center mt-4">
            <a href="/forgot-password" className="text-sm text-muted hover:text-primary">Passwort vergessen?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
