import { useState, useEffect, useCallback } from "react";
import {
  Award, Plus, Download, Calendar, Building2, X, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CertData } from "../../api/learningApi";

const EMPTY_FORM = { name: "", issuer: "", completedDate: "", expiryDate: "" };

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isExpired(d?: string) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

export default function MyCertifications() {
  const [certs, setCerts] = useState<CertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchCerts = useCallback(() => {
    setLoading(true);
    learningApi
      .getMyCertifications()
      .then((r) => setCerts(r.data.data ?? []))
      .catch(() => toast.error("Failed to load certifications"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Certification name is required");
    setSubmitting(true);
    try {
      await learningApi.addCertification(form);
      toast.success("Certification added!");
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchCerts();
    } catch { toast.error("Failed to add certification"); }
    finally { setSubmitting(false); }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-200">Track your achievements</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
              <ShieldCheck className="h-7 w-7" /> My Certifications
            </h1>
            <p className="mt-1 text-sm text-emerald-200">{certs.length} certification{certs.length !== 1 ? "s" : ""} earned</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" /> Add Certification
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : certs.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <Award className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No certifications yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((cert) => {
            const expired = isExpired(cert.expiryDate);

            return (
              <div key={cert._id} className={card}>
                {/* Icon & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-emerald-400" />
                  </div>
                  {expired ? (
                    <span className="rounded-lg border bg-red-500/10 text-red-400 border-red-500/30 px-2.5 py-1 text-xs font-semibold">
                      Expired
                    </span>
                  ) : cert.expiryDate ? (
                    <span className="rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-xs font-semibold">
                      Active
                    </span>
                  ) : null}
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{cert.name}</h3>
                {cert.courseId && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-2">Course: {cert.courseId.title}</p>
                )}

                {/* Details */}
                <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {cert.issuer && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{cert.issuer}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Completed: {fmtDate(cert.completedDate)}</span>
                  </div>
                  {cert.expiryDate && (
                    <div className={`flex items-center gap-2 text-xs ${expired ? "text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Expires: {fmtDate(cert.expiryDate)}</span>
                    </div>
                  )}
                </div>

                {/* Download */}
                {cert.certificatePath && (
                  <a
                    href={cert.certificatePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Certificate
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Certification Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Certification</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AWS Solutions Architect" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Issuer</label>
                <input className={inputCls} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="Amazon Web Services" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Completed Date</label>
                  <input type="date" className={inputCls} value={form.completedDate} onChange={(e) => setForm({ ...form, completedDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Expiry Date</label>
                  <input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Adding..." : "Add Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
