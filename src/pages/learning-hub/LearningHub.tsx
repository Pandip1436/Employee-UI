import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Search, Plus, Clock, User, Users, CheckCircle2,
  GraduationCap, X, ExternalLink, Filter, ChevronDown, ChevronRight,
  Sparkles, Award, Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CourseData, type LearnerData } from "../../api/learningApi";
import { useAuth } from "../../context/AuthContext";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
const paletteFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

const CATEGORIES = ["All", "Technical", "Soft Skills", "Management", "Design", "Data", "Security", "Other"] as const;

const categoryConfig: Record<string, { gradient: string; badge: string; dot: string }> = {
  Technical: {
    gradient: "from-sky-500 to-indigo-600",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500",
  },
  "Soft Skills": {
    gradient: "from-pink-500 to-rose-600",
    badge: "bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-500/20 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-400/20",
    dot: "bg-pink-500",
  },
  Management: {
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  Design: {
    gradient: "from-purple-500 to-fuchsia-600",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20",
    dot: "bg-purple-500",
  },
  Data: {
    gradient: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  Security: {
    gradient: "from-rose-500 to-red-600",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500",
  },
  Other: {
    gradient: "from-gray-500 to-gray-600",
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    dot: "bg-gray-400",
  },
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

  const isEnrolled = (c: CourseData) => user ? c.enrolledUsers.includes(user._id) : false;
  const isCompleted = (c: CourseData) => user ? c.completedUsers.includes(user._id) : false;

  const totalCourses = courses.length;
  const enrolledCount = courses.filter(isEnrolled).length;
  const completedCount = courses.filter(isCompleted).length;

  return (
    <div className="space-y-6">
      {/* ── Hero (with masked grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <GraduationCap className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Grow your career
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Learning <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Hub</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Explore courses, build skills, earn certifications</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isAdmin && (
              <>
                <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Completed</p>
                  <p className="text-xl font-bold tracking-tight">
                    {completedCount}<span className="text-sm font-normal text-indigo-200/60"> / {enrolledCount || totalCourses}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
                >
                  <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </span>
                  Create Course
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs (only for managers who can see both) ── */}
      {canViewLearners && !isAdmin && (
        <div className="inline-flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          {([
            { id: "courses", label: "Courses", icon: BookOpen },
            { id: "learners", label: "Learners", icon: Users },
          ] as const).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as "courses" | "learners")}
                className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                <t.icon
                  className={`h-3.5 w-3.5 transition-colors ${
                    active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                  }`}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Courses tab ── */}
      {tab === "courses" && !isAdmin && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} pl-10 ${search ? "pr-9" : ""}`}
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
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
              <Filter className="ml-1.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const cfg = cat !== "All" ? categoryConfig[cat] : null;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                      active
                        ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                        : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                    }`}
                  >
                    {cfg && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
              <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                <BookOpen className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No courses found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Try a different filter or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const enrolled = isEnrolled(course);
                const completed = isCompleted(course);
                const cfg = categoryConfig[course.category ?? "Other"] || categoryConfig.Other;

                return (
                  <div
                    key={course._id}
                    onClick={() => navigate(`/learning/courses/${course._id}`)}
                    className={`${cardCls} group relative flex cursor-pointer flex-col overflow-hidden p-5 hover:-translate-y-0.5`}
                  >
                    {/* Status left strip when enrolled/completed */}
                    {(enrolled || completed) && (
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${
                          completed ? "from-emerald-400 to-teal-500" : "from-indigo-400 to-purple-500"
                        }`}
                      />
                    )}

                    {/* Category icon + name + status */}
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${cfg.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {course.category && (
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {course.category}
                          </span>
                        )}
                      </div>
                      {completed && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      )}
                      {enrolled && !completed && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                          <BookOpen className="h-3 w-3" /> Enrolled
                        </span>
                      )}
                    </div>

                    <h3 className="mb-1 text-base font-bold tracking-tight text-gray-900 dark:text-white">{course.title}</h3>
                    {course.description && (
                      <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{course.description}</p>
                    )}

                    <div className="mt-auto space-y-3 border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {course.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {course.duration}
                          </span>
                        )}
                        {course.instructor && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            {course.instructor}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          {course.enrolledUsers.length} enrolled
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!enrolled && !completed && (
                          <button
                            onClick={() => handleEnroll(course._id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98]"
                          >
                            <BookOpen className="h-3.5 w-3.5" /> Enroll Now
                          </button>
                        )}
                        {enrolled && !completed && (
                          <button
                            onClick={() => handleComplete(course._id)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                          </button>
                        )}
                        {completed && (
                          <div className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                            <Award className="h-3.5 w-3.5" /> Completed
                          </div>
                        )}
                        {course.link && (
                          <a
                            href={course.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open course"
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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

      {/* ── Learners Tab (admin/manager) ── */}
      {tab === "learners" && canViewLearners && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search learners by name, email, or department..."
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
              className={`${inputCls} pl-10 ${learnerSearch ? "pr-9" : ""}`}
            />
            {learnerSearch && (
              <button
                onClick={() => setLearnerSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {learnersLoading ? (
            <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading learners...</p>
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
                <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
                  <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                    <Inbox className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No learners found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Try a different search</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map((l) => {
                  const isExpanded = expandedLearner === l._id;
                  const init = l.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={l._id} className={`${cardCls} overflow-hidden p-0`}>
                      <button
                        onClick={() => setExpandedLearner(isExpanded ? null : l._id)}
                        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(l.name)} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                          {init}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{l.name}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {l.email}{l.department ? ` · ${l.department}` : ""}
                          </p>
                        </div>
                        <div className="hidden shrink-0 items-center gap-3 sm:flex">
                          <div className="text-center">
                            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{l.inProgressCount}</p>
                            <p className={labelCls}>In Progress</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{l.completedCount}</p>
                            <p className={labelCls}>Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-gray-600 dark:text-gray-300">{l.enrolledCount}</p>
                            <p className={labelCls}>Total</p>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-md bg-gray-100 p-1 dark:bg-gray-800">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Mobile stats tiles */}
                      <div className="grid grid-cols-3 gap-2 px-4 pb-3 sm:hidden">
                        <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/60 py-1.5 text-center dark:border-indigo-500/20 dark:bg-indigo-500/10">
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{l.inProgressCount}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">In Progress</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 py-1.5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{l.completedCount}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Completed</p>
                        </div>
                        <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 py-1.5 text-center dark:border-gray-700/70 dark:bg-gray-800/60">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{l.enrolledCount}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-gray-200/70 bg-gray-50/40 px-4 py-4 dark:border-gray-800/80 dark:bg-gray-800/20">
                          {l.inProgress.length > 0 && (
                            <div>
                              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                <BookOpen className="h-3 w-3" /> In Progress ({l.inProgress.length})
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {l.inProgress.map((c) => {
                                  const cat = categoryConfig[c.category ?? "Other"] || categoryConfig.Other;
                                  return (
                                    <div
                                      key={c._id}
                                      onClick={() => navigate(`/learning/courses/${c._id}`)}
                                      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-indigo-200/60 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-500/20 dark:bg-gray-900"
                                    >
                                      <div className={`rounded-lg bg-gradient-to-br ${cat.gradient} p-1.5 shadow-sm ring-1 ring-white/10`}>
                                        <BookOpen className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.title}</p>
                                        <div className="mt-0.5 flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                                          {c.category && <span>{c.category}</span>}
                                          {c.duration && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{c.duration}</span>}
                                        </div>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {l.completed.length > 0 && (
                            <div>
                              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Completed ({l.completed.length})
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {l.completed.map((c) => {
                                  const cat = categoryConfig[c.category ?? "Other"] || categoryConfig.Other;
                                  return (
                                    <div
                                      key={c._id}
                                      onClick={() => navigate(`/learning/courses/${c._id}`)}
                                      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200/60 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-500/20 dark:bg-gray-900"
                                    >
                                      <div className={`rounded-lg bg-gradient-to-br ${cat.gradient} p-1.5 shadow-sm ring-1 ring-white/10`}>
                                        <Award className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.title}</p>
                                        <div className="mt-0.5 flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                                          {c.category && <span>{c.category}</span>}
                                          {c.duration && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{c.duration}</span>}
                                        </div>
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {l.enrolledCount === 0 && (
                            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">No courses enrolled yet.</p>
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

      {/* ── Create Course Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Create Course</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Share knowledge with the team</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="max-h-[calc(90vh-5rem)] space-y-4 overflow-y-auto p-5">
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Intro to TypeScript" />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Description</label>
                <textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will learners get out of this?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Category</label>
                  <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Skill</label>
                  <input className={inputCls} value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} placeholder="e.g. TypeScript" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Duration</label>
                  <input className={inputCls} placeholder="e.g. 4 hours" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Instructor</label>
                  <input className={inputCls} value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="Name" />
                </div>
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Link</label>
                <input className={inputCls} placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200/70 pt-4 dark:border-gray-800/80">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
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
