import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Calendar, Save,  CheckCircle2, Clock, XCircle } from "lucide-react";
import { performanceApi, type PIPData } from "../../api/performanceApi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  "not-started": { dot: "bg-gray-400",    bg: "bg-gray-500/10",    text: "text-gray-400",    label: "Not Started" },
  "in-progress": { dot: "bg-blue-400",    bg: "bg-blue-500/10",    text: "text-blue-400",    label: "In Progress" },
  completed:     { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Completed" },
  missed:        { dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-400",     label: "Missed" },
  active:        { dot: "bg-blue-400",    bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Active" },
  closed:        { dot: "bg-gray-400",    bg: "bg-gray-500/10",    text: "text-gray-400",    label: "Closed" },
  extended:      { dot: "bg-amber-400",   bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Extended" },
};

export default function PIPDetail() {
  const { isManager, isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pip, setPip] = useState<PIPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable state
  const [goalStatuses, setGoalStatuses] = useState<string[]>([]);
  const [goalComments, setGoalComments] = useState<string[]>([]);
  const [managerNotes, setManagerNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    performanceApi
      .getPIP(id)
      .then((r) => {
        const data = r.data.data!;
        setPip(data);
        setGoalStatuses(data.goals.map((g) => g.status));
        setGoalComments(data.goals.map((g) => g.managerComment || ""));
        setManagerNotes(data.managerNotes || "");
      })
      .catch(() => toast.error("Failed to load PIP"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !pip) return;
    setSaving(true);
    try {
      const updatedGoals = pip.goals.map((g, i) => ({
        title: g.title,
        targetDate: g.targetDate,
        status: goalStatuses[i],
        managerComment: goalComments[i],
      }));
      await performanceApi.updatePIP(id, { goals: updatedGoals, managerNotes });
      toast.success("PIP updated");
      setEditing(false);
      // Refresh
      const r = await performanceApi.getPIP(id);
      setPip(r.data.data!);
    } catch {
      toast.error("Failed to update PIP");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!pip) {
    return (
      <div className={`${card} max-w-lg mx-auto text-center py-12`}>
        <p className="text-gray-500 dark:text-gray-400">PIP not found</p>
      </div>
    );
  }

  const pipStatus = STATUS_CFG[pip.status] || STATUS_CFG["active"];
  const canEdit = isManager || isAdmin;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Performance Improvement Plan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pip.employeeId.name}</p>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            Edit
          </button>
        )}
      </div>

      {/* Employee Info + Status */}
      <div className={card}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employee</p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {pip.employeeId.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{pip.employeeId.name}</p>
                <p className="text-xs text-gray-400">{pip.employeeId.email}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Manager</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{pip.managerId.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date Range</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {new Date(pip.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {new Date(pip.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pipStatus.bg} ${pipStatus.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${pipStatus.dot}`} />
              {pipStatus.label}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{pip.reason}</p>
        </div>
      </div>

      {/* Goals Timeline */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Improvement Goals</h2>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-6">
            {pip.goals.map((goal, idx) => {
              const gCfg = STATUS_CFG[goal.status] || STATUS_CFG["not-started"];
              const StatusIcon = goal.status === "completed" ? CheckCircle2 : goal.status === "missed" ? XCircle : Clock;
              return (
                <div key={idx} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-1 h-5 w-5 rounded-full border-2 border-white dark:border-gray-900 ${gCfg.dot} flex items-center justify-center`}>
                    <StatusIcon className="h-3 w-3 text-white" />
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{goal.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        {editing ? (
                          <select
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                            value={goalStatuses[idx]}
                            onChange={(e) => setGoalStatuses((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))}
                          >
                            <option value="not-started">Not Started</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="missed">Missed</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${gCfg.bg} ${gCfg.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${gCfg.dot}`} />
                            {gCfg.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Manager Comment */}
                    {editing ? (
                      <input
                        className={input}
                        placeholder="Manager comment..."
                        value={goalComments[idx]}
                        onChange={(e) => setGoalComments((prev) => prev.map((c, i) => (i === idx ? e.target.value : c)))}
                      />
                    ) : (
                      goal.managerComment && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">{goal.managerComment}</p>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manager Notes */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Manager Notes</h2>
        {editing ? (
          <textarea
            className={`${input} min-h-[100px] resize-y`}
            rows={3}
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            placeholder="Add notes about this PIP..."
          />
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {pip.managerNotes || "No notes added."}
          </p>
        )}
      </div>

      {/* Save / Cancel for edit mode */}
      {editing && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setEditing(false);
              setGoalStatuses(pip.goals.map((g) => g.status));
              setGoalComments(pip.goals.map((g) => g.managerComment || ""));
              setManagerNotes(pip.managerNotes || "");
            }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
