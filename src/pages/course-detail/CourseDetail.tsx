import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Clock, User, Users, CheckCircle2,
  GraduationCap, ExternalLink, Mail, Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type CourseDetailData, type CourseUser } from "../../api/learningApi";
import { useAuth } from "../../context/AuthContext";

const CATEGORY_COLORS: Record<string, string> = {
  Technical:    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Soft Skills":"bg-pink-500/10 text-pink-400 border-pink-500/30",
  Management:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Design:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Data:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Security:     "bg-red-500/10 text-red-400 border-red-500/30",
  Other:        "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

type Tab = "enrolled" | "completed";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("enrolled");

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

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
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
  const activeList: CourseUser[] = tab === "enrolled" ? course.enrolledUsers : course.completedUsers;

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
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.category && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                {course.category}
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/30 bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </span>
            )}
            {isEnrolled && !isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold">
                <BookOpen className="h-3 w-3" /> Enrolled
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
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {course.enrolledUsers.length} enrolled</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {course.completedUsers.length} completed</span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isEnrolled && !isCompleted && (
              <button
                onClick={handleEnroll}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition-all"
              >
                <BookOpen className="h-4 w-4" /> Enroll Now
              </button>
            )}
            {isEnrolled && !isCompleted && (
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
          </div>
        </div>
      </div>

      {/* Course Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{course.enrolledUsers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enrolled Users</p>
            </div>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{course.completedUsers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed Users</p>
            </div>
          </div>
        </div>
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

      {/* Tabs: Enrolled / Completed */}
      <div className={card}>
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 mb-4">
          <button
            onClick={() => setTab("enrolled")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === "enrolled"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Enrolled ({course.enrolledUsers.length})
            </span>
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === "completed"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Completed ({course.completedUsers.length})
            </span>
          </button>
        </div>

        {activeList.length === 0 ? (
          <div className="text-center py-10">
            <Users className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tab === "enrolled" ? "No users enrolled yet." : "No users have completed this course yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeList.map((u) => (
              <div key={u._id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {u.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {u.email && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
                    )}
                    {u.department && (
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{u.department}</span>
                    )}
                  </div>
                </div>
                {tab === "enrolled" && course.completedUsers.some((c) => c._id === u._id) && (
                  <span className="inline-flex items-center gap-1 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
