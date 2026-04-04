import { useState, useEffect, useRef } from "react";
import { Upload, Download, Trash2, File, FileText, Image, FolderOpen, Search, X } from "lucide-react";
import { documentApi } from "../../api/documentApi";
import { useAuth } from "../../context/AuthContext";
import type { DocumentFile, Pagination } from "../../types";
import toast from "react-hot-toast";

const categoryLabels: Record<string, string> = {
  "hr-docs": "HR Documents",
  policies: "Policies",
  "employee-files": "Employee Files",
  templates: "Templates",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  "hr-docs": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  policies: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "employee-files": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  templates: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const categoryDotColors: Record<string, string> = {
  "hr-docs": "bg-blue-500",
  policies: "bg-purple-500",
  "employee-files": "bg-emerald-500",
  templates: "bg-amber-500",
  other: "bg-gray-400 dark:bg-gray-500",
};

const getFileIcon = (mime: string) => {
  if (mime.startsWith("image/")) return <Image className="h-5 w-5 text-pink-500" />;
  if (mime.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
};

const getFileIconBg = (mime: string) => {
  if (mime.startsWith("image/")) return "bg-pink-50 dark:bg-pink-900/20";
  if (mime.includes("pdf")) return "bg-red-50 dark:bg-red-900/20";
  return "bg-gray-50 dark:bg-gray-800";
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Documents() {
  const { isAdmin } = useAuth();
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadAccess, setUploadAccess] = useState("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocs = () => {
    const params: Record<string, string | number> = { page, limit: 12 };
    if (category) params.category = category;
    documentApi.getAll(params).then((res) => {
      setDocs(res.data.data);
      setPagination(res.data.pagination);
    }).catch(() => {});
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
    if (!confirm("Delete this document?")) return;
    try {
      await documentApi.delete(id);
      toast.success("Document deleted.");
      fetchDocs();
    } catch { /* interceptor */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Documents & Resources
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and access company documents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="overflow-x-auto scrollbar-hide rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => { setCategory(""); setPage(1); }}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              !category
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            All
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setCategory(key); setPage(1); }}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                category === key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Document Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
          <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-4">
            <FolderOpen className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            No documents found
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Upload a document to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <div
              key={doc._id}
              className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md dark:hover:shadow-gray-800/30"
            >
              {/* File Icon + Info */}
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 rounded-xl p-2.5 ${getFileIconBg(doc.mimeType)}`}>
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {formatSize(doc.size)}
                  </p>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mt-3.5 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    categoryColors[doc.category] || categoryColors.other
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      categoryDotColors[doc.category] || categoryDotColors.other
                    }`}
                  />
                  {categoryLabels[doc.category] || doc.category}
                </span>

                {/* Hover Actions */}
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {(isAdmin || doc.uploadedBy?._id === localStorage.getItem("userId")) && (
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Author + Date */}
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                by {doc.uploadedBy?.name || "Unknown"} &middot;{" "}
                {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl dark:shadow-gray-950/50">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Upload Document
              </h2>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Document Name
                </label>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Employee Handbook 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Access
                  </label>
                  <select
                    value={uploadAccess}
                    onChange={(e) => setUploadAccess(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Employees</option>
                    <option value="admin">Admin Only</option>
                    <option value="hr">HR Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  File
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-900/40 file:px-3 file:py-1 file:text-sm file:font-medium file:text-indigo-600 dark:file:text-indigo-400 file:cursor-pointer"
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Max 10MB. PDF, images, docs.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
