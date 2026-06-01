import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Clock, User, Users, CheckCircle2,
  GraduationCap, ExternalLink, Loader2, Pencil, Trash2, X,
  AlertTriangle, Send, Sparkles, Award,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CourseDetailData } from "../../api/learningApi";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/Avatar";

const CATEGORIES = ["Technical", "Soft Skills", "Management", "Design", "Data", "Security", "Other"];

/* ── Shared tokens (match LearningHub) ── */
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

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "Technical", skill: "", duration: "", instructor: "", link: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchCourse = useCallback(() => {
    if (!id) return;
    setLoading(true);
    learningApi
      .getCourseById(id)
      .then((r) => setCourse(r.data.data ?? null))
      .catch(() => toast.error("Failed to load course details"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const isEnrolled = user && course ? course.enrolledUsers.some((u) => u._id === user._id) : false;
  const isCompleted = user && course ? course.completedUsers.some((u) => u._id === user._id) : false;

  const handleEnroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await learningApi.enrollCourse(id);
      toast.success("Enrolled successfully!");
      fetchCourse();
    } catch { toast.error("Enrollment failed"); } finally { setEnrolling(false); }
  };

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      await learningApi.completeCourse(id);
      toast.success("Course marked as complete!");
      fetchCourse();
    } catch { toast.error("Failed to mark complete"); } finally { setCompleting(false); }
  };

  const isOwner = user && course?.createdBy && (course.createdBy as any)._id === user._id;

  const openEdit = () => {
    if (!course) return;
    setEditForm({
      title: course.title || "",
      description: course.description || "",
      category: course.category || "Technical",
      skill: course.skill || "",
      duration: course.duration || "",
      instructor: course.instructor || "",
      link: course.link || "",
    });
    setShowEdit(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editForm.title.trim()) return toast.error("Title is required");
    setSubmitting(true);
    try {
      await learningApi.updateCourse(id, editForm);
      toast.success("Course updated!");
      setShowEdit(false);
      fetchCourse();
    } catch { toast.error("Failed to update course"); }
    finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await learningApi.deleteCourse(id);
      toast.success("Course deleted!");
      navigate("/learning");
    } catch {
      toast.error("Failed to delete course");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`${cardCls} flex flex-col items-center gap-3 py-20 text-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
        <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
          <BookOpen className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Course not found</p>
        <button onClick={() => navigate("/learning")} className="mt-2 text-xs font-semibold text-indigo-500 hover:underline">
          ← Back to Learning Hub
        </button>
      </div>
    );
  }

  const catCfg = categoryConfig[course.category ?? "Other"] || categoryConfig.Other;

  // Status pill
  const status = isCompleted
    ? { label: "Completed", bg: "bg-emerald-400/20 ring-1 ring-emerald-300/30 text-emerald-100", icon: <CheckCircle2 className="h-3 w-3" /> }
    : isEnrolled
    ? { label: "In Progress", bg: "bg-amber-400/20 ring-1 ring-amber-300/30 text-amber-100", icon: <Clock className="h-3 w-3" /> }
    : null;

  const inProgressCount = course.enrolledUsers.filter((u) => !course.completedUsers.some((c) => c._id === u._id)).length;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/learning")}
        className="group inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-indigo-500 dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Learning Hub
      </button>

      {/* ── Premium Hero ── */}
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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={`shrink-0 rounded-2xl bg-gradient-to-br ${catCfg.gradient} p-3 shadow-lg shadow-black/30 ring-1 ring-white/15`}>
              <GraduationCap className="h-9 w-9 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Course
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
              {course.description && (
                <p className="mt-1 max-w-2xl text-sm text-indigo-200/70">{course.description}</p>
              )}

              {/* Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {course.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/15 backdrop-blur-sm">
                    <span className={`h-1.5 w-1.5 rounded-full ${catCfg.dot}`} />
                    {course.category}
                  </span>
                )}
                {status && (
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${status.bg}`}>
                    {status.icon}
                    {status.label}
                  </span>
                )}
                {course.skill && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-100 ring-1 ring-white/15 backdrop-blur-sm">
                    <GraduationCap className="h-3 w-3" />
                    {course.skill}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-indigo-200/80">
                {course.instructor && (
                  <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {course.instructor}</span>
                )}
                {course.duration && (
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> <span className="font-mono tabular-nums">{course.enrolledUsers.length}</span> enrolled
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-start gap-3">
            {!isAdmin && !isEnrolled && !isCompleted && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/30 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/40 disabled:opacity-60"
              >
                <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-indigo-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                <span className="relative inline-flex items-center gap-2">
                  <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                    {enrolling ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <BookOpen className="h-3.5 w-3.5 text-white" />}
                  </span>
                  {enrolling ? "Enrolling…" : "Enroll Now"}
                </span>
              </button>
            )}
            {!isAdmin && isEnrolled && !isCompleted && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/15 transition-all hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-60"
              >
                <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                <span className="relative inline-flex items-center gap-2">
                  {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {completing ? "Saving…" : "Mark Complete"}
                </span>
              </button>
            )}
            {!isAdmin && isCompleted && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 backdrop-blur-sm">
                <Award className="h-4 w-4" /> Completed
              </span>
            )}
            {course.link && (
              <a
                href={course.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ExternalLink className="h-4 w-4" /> Open Course
              </a>
            )}
            {isOwner && (
              <>
                <button
                  onClick={openEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-400/20 px-4 py-2.5 text-sm font-semibold text-rose-100 backdrop-blur-sm transition-colors hover:bg-rose-400/30"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course Details Cards */}
      <div className={`grid grid-cols-1 gap-4 ${isAdmin ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {isAdmin ? (
          <>
            {[
              { label: "Enrolled", value: course.enrolledUsers.length, icon: Users, gradient: "from-indigo-500 to-purple-600" },
              { label: "In Progress", value: inProgressCount, icon: Clock, gradient: "from-amber-500 to-orange-600" },
              { label: "Completed", value: course.completedUsers.length, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600" },
            ].map((s) => (
              <div key={s.label} className={`${cardCls} group relative overflow-hidden p-4`}>
                <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`} />
                <div className="relative flex items-center gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className={labelCls}>{s.label}</p>
                    <p className="font-mono text-xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className={`${cardCls} group relative overflow-hidden p-4`}>
            <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${
              isCompleted ? "from-emerald-500 to-teal-600" : isEnrolled ? "from-amber-500 to-orange-600" : "from-gray-400 to-gray-600"
            } opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`} />
            <div className="relative flex items-center gap-3">
              <div className={`rounded-xl bg-gradient-to-br ${
                isCompleted ? "from-emerald-500 to-teal-600" : isEnrolled ? "from-amber-500 to-orange-600" : "from-gray-400 to-gray-600"
              } p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-white" />
                  : isEnrolled ? <Clock className="h-4 w-4 text-white" />
                  : <BookOpen className="h-4 w-4 text-white" />}
              </div>
              <div className="min-w-0">
                <p className={labelCls}>Your Status</p>
                <p className={`text-sm font-bold ${
                  isCompleted ? "text-emerald-600 dark:text-emerald-400" : isEnrolled ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-300"
                }`}>
                  {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Not Enrolled"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Duration */}
        <div className={`${cardCls} group relative overflow-hidden p-4`}>
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className={labelCls}>Duration</p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{course.duration || "—"}</p>
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className={`${cardCls} group relative overflow-hidden p-4`}>
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className={labelCls}>Instructor</p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{course.instructor || "—"}</p>
            </div>
          </div>
        </div>

        {/* Skill / Category */}
        <div className={`${cardCls} group relative overflow-hidden p-4`}>
          <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${catCfg.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`} />
          <div className="relative flex items-center gap-3">
            <div className={`rounded-xl bg-gradient-to-br ${catCfg.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className={labelCls}>Skill / Category</p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{course.skill || course.category || "General"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Description */}
      {course.description && (
        <div className={`${cardCls} p-5`}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-indigo-500" /> About this course
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-400">{course.description}</p>
        </div>
      )}

      {/* Admin: Enrolled Users with Status */}
      {isAdmin && course.enrolledUsers.length > 0 && (
        <div className={`${cardCls} p-5`}>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Users className="h-4 w-4 text-indigo-500" />
            Enrolled Users (<span className="font-mono tabular-nums">{course.enrolledUsers.length}</span>)
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {course.enrolledUsers.map((u) => {
              const completed = course.completedUsers.some((c) => c._id === u._id);
              return (
                <div key={u._id} className="flex items-center gap-3 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <Avatar
                    name={u.name}
                    photo={u.profilePhotoUrl}
                    gradient={paletteFor(u.name || "?")}
                    className="h-10 w-10 shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900"
                    textClassName="text-[11px] font-semibold"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {u.email}{u.department ? ` · ${u.department}` : ""}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    completed
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20"
                      : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {completed ? "Completed" : "In Progress"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && course.enrolledUsers.length === 0 && (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No users enrolled yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Enrolments will appear here once learners join</p>
        </div>
      )}

      {/* Delete Course Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm animate-backdrop-fade"
            onClick={() => !deleting && setShowDelete(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-modal-enter dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
          >
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-gray-800/80 dark:from-rose-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-400/25 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-lg shadow-rose-500/30 ring-1 ring-white/10">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600/80 dark:text-rose-400/80">Danger zone</p>
                  <h2 id="delete-course-title" className="text-base font-bold text-gray-900 dark:text-white">Delete course?</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{course.title}</span> will be removed along with its enrolments. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl hover:shadow-rose-500/40 disabled:opacity-60"
              >
                <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting…" : "Delete course"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Drawer */}
      {showEdit && (() => {
        const previewCfg = categoryConfig[editForm.category] || categoryConfig.Other;
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm animate-backdrop-fade"
              onClick={() => !submitting && setShowEdit(false)}
            />
            <form
              onSubmit={handleUpdate}
              className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-drawer-slide-right dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
            >
              {/* Status stripe */}
              <div aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${previewCfg.gradient}`} />

              {/* Header */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-400/25 blur-2xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                      <Pencil className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">Update course</p>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Course</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Refine the title, category, or details</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    disabled={submitting}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5">
                {/* Live preview */}
                <div>
                  <p className={`${labelCls} mb-1.5`}>Live Preview</p>
                  <div className={`${cardCls} relative overflow-hidden p-4`}>
                    <span aria-hidden className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${previewCfg.gradient}`} />
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 rounded-xl bg-gradient-to-br ${previewCfg.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${previewCfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${previewCfg.dot}`} />
                          {editForm.category}
                        </span>
                        <h3 className="mt-1.5 truncate text-sm font-bold text-gray-900 dark:text-white">
                          {editForm.title || <span className="text-gray-400">Course title…</span>}
                        </h3>
                        {editForm.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{editForm.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {editForm.duration && (
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-gray-400" />{editForm.duration}</span>
                          )}
                          {editForm.instructor && (
                            <span className="inline-flex items-center gap-1"><User className="h-3 w-3 text-gray-400" />{editForm.instructor}</span>
                          )}
                          {editForm.skill && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                              {editForm.skill}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Title *</label>
                  <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="e.g. Intro to TypeScript" />
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Description</label>
                  <textarea rows={3} className={`${inputCls} resize-none`} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="What will learners get out of this?" />
                </div>

                {/* Category cards */}
                <div>
                  <label className={`${labelCls} mb-2 block`}>Category</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORIES.map((c) => {
                      const cfg = categoryConfig[c] || categoryConfig.Other;
                      const active = editForm.category === c;
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setEditForm({ ...editForm, category: c })}
                          className={`group relative flex items-center gap-2 overflow-hidden rounded-xl border p-2.5 text-left transition-all ${
                            active
                              ? "border-indigo-300 bg-gradient-to-br from-indigo-50 to-white shadow-sm ring-1 ring-indigo-500/20 dark:border-indigo-500/40 dark:from-indigo-500/10 dark:to-gray-900 dark:ring-indigo-400/25"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                          }`}
                        >
                          <div className={`rounded-lg bg-gradient-to-br ${cfg.gradient} p-1.5 shadow-sm ring-1 ring-white/10`}>
                            <BookOpen className="h-3 w-3 text-white" />
                          </div>
                          <span className={`text-[12px] font-semibold ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                            {c}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Skill</label>
                  <input className={inputCls} value={editForm.skill} onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })} placeholder="e.g. TypeScript" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>Duration</label>
                    <input className={inputCls} placeholder="e.g. 4 hours" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className={`${labelCls} mb-1.5 block`}>Instructor</label>
                    <input className={inputCls} value={editForm.instructor} onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })} placeholder="Name" />
                  </div>
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Link</label>
                  <input className={inputCls} placeholder="https://..." value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} />
                </div>
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 flex gap-3 border-t border-gray-200/70 bg-white/95 p-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? "Saving…" : "Update Course"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
}
