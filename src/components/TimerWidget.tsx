import { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { timerApi } from "../api/timerApi";
import { projectApi } from "../api/projectApi";
import type { Timer, Project } from "../types";
import toast from "react-hot-toast";

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function TimerWidget() {
  const [running, setRunning] = useState<Timer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshRunning = () =>
    timerApi
      .getRunning()
      .then((res) => setRunning(res.data.data ?? null))
      .catch(() => {});

  useEffect(() => {
    refreshRunning();
    projectApi.getAll({ limit: 100 }).then((res) => setProjects(res.data.data)).catch(() => {});
  }, []);

  // Re-sync with the server when the tab regains focus or becomes visible —
  // covers the case where the timer was stopped from another tab/device.
  useEffect(() => {
    const onFocus = () => refreshRunning();
    const onVisible = () => { if (document.visibilityState === "visible") refreshRunning(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const start = new Date(running.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!projectId || !description) { toast.error("Select a project and enter a description."); return; }
    setLoading(true);
    try {
      const res = await timerApi.start({ projectId, description });
      setRunning(res.data.data!);
      setDescription("");
      toast.success("Timer started!");
    } catch (err: unknown) {
      // If a timer is already running (e.g. started from another tab), pull it in
      // so the user sees the correct running state instead of staying on the start screen.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) await refreshRunning();
    } finally { setLoading(false); }
  };

  const handleStop = async () => {
    if (!running) return;
    setLoading(true);
    try {
      await timerApi.stop(running._id);
      setRunning(null);
      toast.success("Timer stopped! Timesheet entry created.");
    } catch (err: unknown) {
      // Server says it's already stopped / not found — our state is stale (e.g. another tab stopped it).
      // Re-sync and clear so the UI doesn't get stuck.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 404) {
        await refreshRunning();
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-colors">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Timer</h3>

      {running ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold text-indigo-600 dark:text-indigo-400">{formatTime(elapsed)}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{running.description}</p>
          </div>
          <button onClick={handleStop} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            <Square className="h-4 w-4" /> Stop Timer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
            <option value="">Select project</option>
            {projects.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
          </select>
          <input type="text" placeholder="What are you working on?" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          <button onClick={handleStart} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            <Play className="h-4 w-4" /> Start Timer
          </button>
        </div>
      )}
    </div>
  );
}
