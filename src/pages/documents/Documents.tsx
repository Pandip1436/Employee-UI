import { useState, useEffect, useRef } from "react";
import {
  Upload, Download, Trash2, File, FileText, Image, FolderOpen, Search, X,
  Sparkles, ChevronLeft, ChevronRight, UserCircle, CalendarDays, Loader2,
  Tag, Shield, FilePlus,
} from "lucide-react";
import { documentApi } from "../../api/documentApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { DocumentFile, Pagination } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

const categoryLabels: Record<string, string> = {
  "hr-docs": "HR Documents",
  policies: "Policies",
  "employee-files": "Employee Files",
  templates: "Templates",
  other: "Other",
};

const categoryConfig: Record<string, { gradient: string; badge: string; dot: string }> = {
  "hr-docs": {
    gradient: "from-sky-500 to-indigo-600",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500",
  },
  policies: {
    gradient: "from-purple-500 to-fuchsia-600",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20",
    dot: "bg-purple-500",
  },
  "employee-files": {
    gradient: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  templates: {
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  other: {
    gradient: "from-gray-500 to-gray-600",
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    dot: "bg-gray-400",
  },
};

const getFileIcon = (mime: string) => {
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf")) return FileText;
  return File;
};

const getFileGradient = (mime: string) => {
  if (mime.startsWith("image/")) return "from-pink-500 to-rose-600";
  if (mime.includes("pdf")) return "from-rose-500 to-red-600";
  if (mime.includes("word") || mime.includes("doc")) return "from-sky-500 to-blue-600";
  if (mime.includes("sheet") || mime.includes("excel")) return "from-emerald-500 to-teal-600";
  return "from-gray-500 to-gray-600";
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documents() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadAccess, setUploadAccess] = useState("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocs = () => {
    const params: Record<string, string | number> = { page, limit: 12 };
    if (category) params.category = category;
    documentApi.getAll(params)
      .then((res) => { setDocs(res.data.data); setPagination(res.data.pagination); })
      .catch(() => {});
  };

  useEffect(() => { fetchDocs(); }, [page, category]);

  const filtered = search
    ? docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : docs;

  const handleUpload = async () => {
    if (!selectedFile || !uploadName) {
      toast.error("Please provide a name and select a file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", uploadName);
      formData.append("category", uploadCategory);
      formData.append("access", uploadAccess);
      await documentApi.upload(formData);
      toast.success("Document uploaded!");
      setShowUpload(false);
      setUploadName(""); setSelectedFile(null); setUploadCategory("other"); setUploadAccess("all");
      fetchDocs();
    } catch { /* interceptor */ } finally { setUploading(false); }
  };

  const handleDownload = async (doc: DocumentFile) => {
    try {
      const res = await documentApi.download(doc._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* interceptor */ }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete document?", description: "This document will be removed and can no longer be downloaded.", confirmLabel: "Delete" }))) return;
    try {
      await documentApi.delete(id);
      toast.success("Document deleted.");
      fetchDocs();
    } catch { /* interceptor */ }
  };

  const total = pagination?.total ?? docs.length;
  // Counts on this page only (server pagination — true global counts need a stats endpoint)
  const countBy: Record<string, number> = {};
  for (const d of docs) countBy[d.category] = (countBy[d.category] ?? 0) + 1;

  // Drag & drop state for the upload drawer
  const [dragActive, setDragActive] = useState(false);
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setSelectedFile(f);
      if (!uploadName) setUploadName(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + KPI chips */}
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
                <FolderOpen className="h-10 w-10 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Company resources
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Documents & <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Resources</span>
                </h1>
                <p className="mt-1 text-sm text-indigo-200/70">Manage and access company documents</p>
              </div>
            </div>

            {/* Hero KPI chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                  <FolderOpen className="h-3.5 w-3.5 text-indigo-200" />
                  <span className="text-indigo-200/80">Total</span>
                  <span className="font-mono font-semibold tabular-nums">{total}</span>
                </span>
                {Object.entries(categoryLabels).slice(0, 4).map(([key, label]) => {
                  const v = countBy[key] || 0;
                  if (v === 0) return null;
                  const cfg = categoryConfig[key];
                  return (
                    <span key={key} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-indigo-200/80">{label}</span>
                      <span className="font-mono font-semibold tabular-nums">{v}</span>
                    </span>
                  );
                })}
              </div>
          </div>

          {/* RIGHT: action stack */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:flex-col">
            <button
              onClick={() => setShowUpload(true)}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <Upload className="h-3.5 w-3.5 text-white" />
              </span>
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter tabs + Search ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          <button
            onClick={() => { setCategory(""); setPage(1); }}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
              !category
                ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
            }`}
          >
            All
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const active = category === key;
            const cfg = categoryConfig[key];
            return (
              <button
                key={key}
                onClick={() => { setCategory(key); setPage(1); }}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9 ${search ? "pr-8" : ""}`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Document Grid ── */}
      {filtered.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-20 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FolderOpen className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No documents found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {search ? "Try a different search term" : "Upload a document to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => {
            const cfg = categoryConfig[doc.category] || categoryConfig.other;
            const FileIcon = getFileIcon(doc.mimeType);
            const fileGrad = getFileGradient(doc.mimeType);
            const canDelete = isAdmin || doc.uploadedBy?._id === localStorage.getItem("userId");
            return (
              <div key={doc._id} className={`${cardCls} group relative overflow-hidden p-4`}>
                {/* File icon header */}
                <div className="mb-3 flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${fileGrad} shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                    <FileIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatSize(doc.size)}</p>
                  </div>
                </div>

                {/* Category */}
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {categoryLabels[doc.category] || doc.category}
                </span>

                {/* Meta row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-gray-200/70 pt-3 text-[11px] text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <UserCircle className="h-3 w-3 text-gray-400" />
                    {doc.uploadedBy?.name || "Unknown"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-gray-400" />
                    {new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                {/* Hover actions */}
                <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => handleDownload(doc)}
                    title="Download"
                    className="rounded-md bg-white/90 p-1.5 text-gray-500 shadow-sm ring-1 ring-gray-200/70 backdrop-blur-sm transition-colors hover:text-indigo-600 dark:bg-gray-900/90 dark:text-gray-400 dark:ring-gray-700/70 dark:hover:text-indigo-400"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc._id)}
                      title="Delete"
                      className="rounded-md bg-white/90 p-1.5 text-rose-500 shadow-sm ring-1 ring-rose-200/70 backdrop-blur-sm transition-colors hover:text-rose-600 dark:bg-gray-900/90 dark:ring-rose-500/30 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Upload Drawer (premium) ── */}
      {showUpload && (() => {
        const previewCfg = categoryConfig[uploadCategory] || categoryConfig.other;
        const previewFileGrad = selectedFile ? getFileGradient(selectedFile.type) : "from-gray-400 to-gray-500";
        const PreviewFileIcon = selectedFile ? getFileIcon(selectedFile.type) : FilePlus;
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
              onClick={() => setShowUpload(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-xl sm:rounded-l-3xl"
            >
              {/* Left stripe — recolors with selected category */}
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${previewCfg.gradient}`} />

              {/* Header */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`rounded-2xl bg-gradient-to-br ${previewCfg.gradient} p-3 shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                        <Sparkles className="h-3 w-3" />
                        New document
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        Upload Document
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Share with your organisation
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpload(false)}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                {/* Drag-and-drop zone */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600/70 dark:text-indigo-400/70">
                    <FilePlus className="h-3 w-3" />
                    File
                  </p>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-500/10 dark:ring-indigo-400/30"
                        : selectedFile
                          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/5"
                          : "border-gray-300 bg-gray-50/60 hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/5"
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setSelectedFile(f);
                        if (f && !uploadName) setUploadName(f.name.replace(/\.[^.]+$/, ""));
                      }}
                      className="hidden"
                      id="doc-file-input"
                    />
                    <label htmlFor="doc-file-input" className="block cursor-pointer">
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className={`rounded-xl bg-gradient-to-br ${getFileGradient(selectedFile.type)} p-3 shadow-md ring-1 ring-white/10`}>
                            <PreviewFileIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{selectedFile.name}</p>
                            <p className="font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">{formatSize(selectedFile.size)}</p>
                            <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                              Click to change · or drag a new file
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className={`rounded-full bg-gradient-to-br ${dragActive ? "from-indigo-500 to-purple-600 scale-110" : "from-indigo-500 to-purple-600"} p-3 shadow-md ring-1 ring-white/10 transition-transform`}>
                            <Upload className="h-5 w-5 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {dragActive ? "Drop file here" : "Click or drag to upload"}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Max 10MB · PDF, images, docs
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Document details */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600/70 dark:text-emerald-400/70">
                    <FileText className="h-3 w-3" />
                    Details
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                        <FileText className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        Document name
                      </label>
                      <input
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Employee Handbook 2026"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                          <Tag className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                          Category
                        </label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className={inputCls}
                        >
                          {Object.entries(categoryLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                          <Shield className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                          Access
                        </label>
                        <select
                          value={uploadAccess}
                          onChange={(e) => setUploadAccess(e.target.value)}
                          className={inputCls}
                        >
                          <option value="all">All Employees</option>
                          <option value="admin">Admin Only</option>
                          <option value="hr">HR Only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:from-gray-800/40 dark:to-gray-900/40 dark:ring-white/[0.02]">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
                  <span aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${previewCfg.gradient} opacity-15 blur-2xl`} />
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                    <Sparkles className="h-3 w-3" />
                    Live preview
                  </p>
                  <div className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-sm dark:border-gray-700/70 dark:bg-gray-900">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${previewFileGrad} shadow-md ring-1 ring-white/10`}>
                        <PreviewFileIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {uploadName || <span className="text-gray-400 dark:text-gray-500">Document name…</span>}
                        </p>
                        <p className="mt-0.5 font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">
                          {selectedFile ? formatSize(selectedFile.size) : "—"}
                        </p>
                      </div>
                    </div>
                    <span className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${previewCfg.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${previewCfg.dot}`} />
                      {categoryLabels[uploadCategory] || uploadCategory}
                    </span>
                    <div className="mt-3 flex items-center gap-2.5 border-t border-gray-200/70 pt-2.5 text-[10px] text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        {uploadAccess === "all" ? "All employees" : uploadAccess === "admin" ? "Admin only" : "HR only"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-2.5 w-2.5" />
                        Just now
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUpload(false)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !uploadName}
                    className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {uploading
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                        : <><Upload className="h-4 w-4" />Upload</>}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
