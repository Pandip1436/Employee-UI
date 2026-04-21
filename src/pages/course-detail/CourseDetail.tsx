import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Clock, User, Users, CheckCircle2,
  GraduationCap, ExternalLink, Loader2, Pencil, Trash2, X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CourseDetailData } from "../../api/learningApi";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = ["Technical", "Soft Skills", "Management", "Design", "Data", "Security", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  Technical:    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Soft Skills":"bg-pink-500/10 text-pink-400 border-pink-500/30",
  Management:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Design:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Data:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Security:     "bg-red-500/10 text-red-400 border-red-500/30",
  Other:        "bg-gray-500/10 text-gray-400 border-gray-500/30",
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
    try {
      await learningApi.enrollCourse(id);
      toast.success("Enrolled successfully!");
      fetchCourse();
    } catch { toast.error("Enrollment failed"); }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await learningApi.completeCourse(id);
      toast.success("Course marked as complete!");
      fetchCourse();
    } catch { toast.error("Failed to mark complete"); }
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

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`${card} text-center py-16`}>
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Course not found.</p>
        <button onClick={() => navigate("/learning")} className="mt-4 text-sm text-indigo-500 hover:underline">
          Back to Learning Hub
        </button>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[course.category ?? "Other"] ?? CATEGORY_COLORS.Other;

  // Status label
  const status = isCompleted
    ? { label: "Completed", bg: "bg-emerald-400/20 border-emerald-300/30 text-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
    : isEnrolled
    ? { label: "In Progress", bg: "bg-amber-400/20 border-amber-300/30 text-amber-200", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> }
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/learning")}
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Learning Hub
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.category && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                {course.category}
              </span>
            )}
            {status && (
              <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${status.bg}`}>
                {status.icon} {status.label}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> {course.title}
          </h1>
          {course.description && (
            <p className="mt-2 text-sm text-blue-200 max-w-2xl">{course.description}</p>
          )}

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-200">
            {course.instructor && (
              <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {course.instructor}</span>
            )}
            {course.duration && (
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {course.duration}</span>
            )}
            {course.skill && (
              <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {course.skill}</span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isAdmin && !isEnrolled && !isCompleted && (
              <button
                onClick={handleEnroll}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition-all"
              >
                <BookOpen className="h-4 w-4" /> Enroll Now
              </button>
            )}
            {!isAdmin && isEnrolled && !isCompleted && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Complete
              </button>
            )}
            {course.link && (
              <a
                href={course.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Open Course
              </a>
            )}
            {isOwner && (
              <>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-400/20 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-400/30 transition-colors"
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
        {/* Status — different for admin vs user */}
        {isAdmin ? (
          <>
            <div className={card}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                  <Users className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{course.enrolledUsers.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enrolled</p>
                </div>
              </div>
            </div>
            <div className={card}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {course.enrolledUsers.filter((u) => !course.completedUsers.some((c) => c._id === u._id)).length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
                </div>
              </div>
            </div>
            <div className={card}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{course.completedUsers.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={card}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isCompleted ? "bg-emerald-500/10" : isEnrolled ? "bg-amber-500/10" : "bg-gray-500/10"
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isEnrolled ? (
                  <Clock className="h-5 w-5 text-amber-500" />
                ) : (
                  <BookOpen className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  isCompleted ? "text-emerald-600 dark:text-emerald-400" : isEnrolled ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"
                }`}>
                  {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Not Enrolled"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your Status</p>
              </div>
            </div>
          </div>
        )}

        {/* Duration */}
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{course.duration || "—"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <User className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{course.instructor || "—"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Instructor</p>
            </div>
          </div>
        </div>

        {/* Skill / Category */}
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${catColor.split(" ")[0]}`}>
              <GraduationCap className={`h-5 w-5 ${catColor.split(" ")[1]}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{course.skill || course.category || "General"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Skill / Category</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Description */}
      {course.description && (
        <div className={card}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">About this course</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{course.description}</p>
        </div>
      )}

      {/* Admin: Enrolled Users with Status */}
      {isAdmin && course.enrolledUsers.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" /> Enrolled Users ({course.enrolledUsers.length})
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {course.enrolledUsers.map((u) => {
              const completed = course.completedUsers.some((c) => c._id === u._id);
              return (
                <div key={u._id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {u.email}{u.department ? ` · ${u.department}` : ""}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    completed
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    {completed ? (
                      <><CheckCircle2 className="h-3 w-3" /> Completed</>
                    ) : (
                      <><Clock className="h-3 w-3" /> In Progress</>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && course.enrolledUsers.length === 0 && (
        <div className={`${card} text-center py-8`}>
          <Users className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No users enrolled in this course yet.</p>
        </div>
      )}

      {/* Delete Course Modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <h2 id="delete-course-title" className="text-base font-bold text-gray-900 dark:text-white">
                  Delete course?
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{course.title}</span> will be removed along with its enrolments. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Delete course</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEdit && (() => {
        const inputCls = "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Course</h2>
                <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                  <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <textarea rows={3} className={inputCls} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Category</label>
                    <select className={inputCls} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Skill</label>
                    <input className={inputCls} value={editForm.skill} onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Duration</label>
                    <input className={inputCls} placeholder="e.g. 4 hours" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Instructor</label>
                    <input className={inputCls} value={editForm.instructor} onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Link</label>
                  <input className={inputCls} placeholder="https://..." value={editForm.link} onChange={(e) => setEditForm({ ...editForm, link: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEdit(false)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {submitting ? "Saving..." : "Update Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
