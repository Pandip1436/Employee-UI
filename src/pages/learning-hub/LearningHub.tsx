import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Search, Plus, Clock, User, Users, CheckCircle2,
  GraduationCap, X, ExternalLink, Filter, ChevronDown, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CourseData, type LearnerData } from "../../api/learningApi";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = ["All", "Technical", "Soft Skills", "Management", "Design", "Data", "Security", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  Technical:    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Soft Skills":"bg-pink-500/10 text-pink-400 border-pink-500/30",
  Management:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Design:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Data:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Security:     "bg-red-500/10 text-red-400 border-red-500/30",
  Other:        "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const EMPTY_FORM = { title: "", description: "", category: "Technical", skill: "", duration: "", instructor: "", link: "" };

export default function LearningHub() {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const canViewLearners = isAdmin || isManager;
  const [tab, setTab] = useState<"courses" | "learners">(isAdmin ? "learners" : "courses");
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Learners tab state (admin/manager only)
  const [learners, setLearners] = useState<LearnerData[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [expandedLearner, setExpandedLearner] = useState<string | null>(null);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (category !== "All") params.category = category;
    if (search.trim()) params.skill = search.trim();
    learningApi
      .getCourses(params)
      .then((r) => setCourses(r.data.data ?? []))
      .catch(() => toast.error("Failed to load courses"))
      .finally(() => setLoading(false));
  }, [category, search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  useEffect(() => {
    if (tab === "learners" && canViewLearners) {
      setLearnersLoading(true);
      learningApi.getLearners()
        .then((r) => setLearners(r.data.data ?? []))
        .catch(() => toast.error("Failed to load learners"))
        .finally(() => setLearnersLoading(false));
    }
  }, [tab, canViewLearners]);

  const handleEnroll = async (id: string) => {
    try {
      await learningApi.enrollCourse(id);
      toast.success("Enrolled successfully!");
      fetchCourses();
    } catch { toast.error("Enrollment failed"); }
  };

  const handleComplete = async (id: string) => {
    try {
      await learningApi.completeCourse(id);
      toast.success("Course marked as complete!");
      fetchCourses();
    } catch { toast.error("Failed to mark complete"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSubmitting(true);
    try {
      await learningApi.createCourse(form);
      toast.success("Course created!");
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchCourses();
    } catch { toast.error("Failed to create course"); }
    finally { setSubmitting(false); }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors";

  const isEnrolled = (c: CourseData) => user ? c.enrolledUsers.includes(user._id) : false;
  const isCompleted = (c: CourseData) => user ? c.completedUsers.includes(user._id) : false;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-blue-200">Grow your career</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
              <GraduationCap className="h-7 w-7" /> Learning Hub
            </h1>
            <p className="mt-1 text-sm text-blue-200">Explore courses, build skills, earn certifications</p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4" /> Create Course
            </button>
          )}
        </div>
      </div>

      {/* Tabs (Courses / Learners) — admin sees only Learners, manager sees both */}
      {canViewLearners && (
        <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {!isAdmin && (
            <button
              onClick={() => setTab("courses")}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                tab === "courses"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <BookOpen className="inline h-4 w-4 mr-1.5" /> Courses
            </button>
          )}
          <button
            onClick={() => setTab("learners")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === "learners"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {/* <Users className="inline h-4 w-4 mr-1.5" /> Learners */}
          </button>
        </div>
      )}

      {/* Filters (courses tab — hidden from admin) */}
      {tab === "courses" && !isAdmin && (
      <>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                category === cat
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : courses.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No courses found. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const enrolled = isEnrolled(course);
            const completed = isCompleted(course);
            const catColor = CATEGORY_COLORS[course.category ?? "Other"] ?? CATEGORY_COLORS.Other;

            return (
              <div key={course._id} className={`${card} flex flex-col cursor-pointer`} onClick={() => navigate(`/learning/courses/${course._id}`)}>
                {/* Status badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {course.category && (
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${catColor}`}>
                      {course.category}
                    </span>
                  )}
                  {completed && (
                    <span className="inline-flex items-center gap-1 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-xs font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  )}
                  {enrolled && !completed && (
                    <span className="inline-flex items-center gap-1 rounded-lg border bg-indigo-500/10 text-indigo-400 border-indigo-500/30 px-2.5 py-1 text-xs font-semibold">
                      <BookOpen className="h-3 w-3" /> Enrolled
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                {course.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                )}

                {/* Meta */}
                <div className="mt-auto space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {course.duration && (
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
                    )}
                    {course.instructor && (
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{course.instructor}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.enrolledUsers.length} enrolled</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    {!enrolled && !completed && (
                      <button
                        onClick={() => handleEnroll(course._id)}
                        className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Enroll
                      </button>
                    )}
                    {enrolled && !completed && (
                      <button
                        onClick={() => handleComplete(course._id)}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        Mark Complete
                      </button>
                    )}
                    {course.link && (
                      <a
                        href={course.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* ───────── Learners Tab (admin/manager only) ───────── */}
      {tab === "learners" && canViewLearners && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search learners by name, email, or department..."
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
              className={`${inputCls} pl-10`}
            />
          </div>

          {learnersLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (() => {
            const q = learnerSearch.trim().toLowerCase();
            const filtered = q
              ? learners.filter((l) =>
                  l.name.toLowerCase().includes(q) ||
                  l.email.toLowerCase().includes(q) ||
                  (l.department || "").toLowerCase().includes(q))
              : learners;

            if (filtered.length === 0) {
              return (
                <div className={`${card} text-center py-16`}>
                  <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No learners found.</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map((l) => {
                  const isExpanded = expandedLearner === l._id;
                  return (
                    <div key={l._id} className={`${card} !p-0 overflow-hidden`}>
                      <button
                        onClick={() => setExpandedLearner(isExpanded ? null : l._id)}
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                          {l.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{l.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{l.email}{l.department ? ` · ${l.department}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center hidden sm:block">
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{l.inProgressCount}</p>
                            <p className="text-[10px] uppercase text-gray-400">In Progress</p>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{l.completedCount}</p>
                            <p className="text-[10px] uppercase text-gray-400">Completed</p>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{l.enrolledCount}</p>
                            <p className="text-[10px] uppercase text-gray-400">Total</p>
                          </div>
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                        </div>
                      </button>

                      {/* Mobile stats */}
                      <div className="sm:hidden grid grid-cols-3 gap-2 px-4 pb-3">
                        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 py-1.5 text-center">
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{l.inProgressCount}</p>
                          <p className="text-[9px] uppercase text-gray-400">In Progress</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 py-1.5 text-center">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{l.completedCount}</p>
                          <p className="text-[9px] uppercase text-gray-400">Completed</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-1.5 text-center">
                          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{l.enrolledCount}</p>
                          <p className="text-[9px] uppercase text-gray-400">Total</p>
                        </div>
                      </div>

                      {/* Expanded course list */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-4 space-y-4">
                          {l.inProgress.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                                <BookOpen className="inline h-3.5 w-3.5 mr-1" /> In Progress ({l.inProgress.length})
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {l.inProgress.map((c) => (
                                  <div
                                    key={c._id}
                                    onClick={() => navigate(`/learning/courses/${c._id}`)}
                                    className="cursor-pointer rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-white dark:bg-gray-900 p-3 hover:shadow-md transition-all"
                                  >
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.title}</p>
                                    <div className="flex gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                      {c.category && <span>{c.category}</span>}
                                      {c.duration && <span><Clock className="inline h-3 w-3 mr-0.5" />{c.duration}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {l.completed.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                                <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> Completed ({l.completed.length})
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {l.completed.map((c) => (
                                  <div
                                    key={c._id}
                                    onClick={() => navigate(`/learning/courses/${c._id}`)}
                                    className="cursor-pointer rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-gray-900 p-3 hover:shadow-md transition-all"
                                  >
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.title}</p>
                                    <div className="flex gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                      {c.category && <span>{c.category}</span>}
                                      {c.duration && <span><Clock className="inline h-3 w-3 mr-0.5" />{c.duration}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {l.enrolledCount === 0 && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No courses enrolled yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Course</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Skill</label>
                  <input className={inputCls} value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Duration</label>
                  <input className={inputCls} placeholder="e.g. 4 hours" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Instructor</label>
                  <input className={inputCls} value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Link</label>
                <input className={inputCls} placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
