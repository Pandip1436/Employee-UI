import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { notificationApi, type Notification } from "../../api/notificationApi";

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(
    async (p = 1, only = unreadOnly) => {
      setLoading(true);
      try {
        const res = await notificationApi.list({ page: p, limit: 20, unread: only });
        setItems(res.data);
        setPages(res.pagination.pages || 1);
        setUnread(res.unread);
        setPage(res.pagination.page);
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly]
  );

  useEffect(() => {
    load(1, unreadOnly);
  }, [unreadOnly, load]);

  const handleOpen = async (n: Notification) => {
    if (!n.isRead) {
      await notificationApi.markRead(n._id);
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    toast.success("All notifications marked as read");
    load(page, unreadOnly);
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationApi.remove(id);
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              unreadOnly
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {unreadOnly ? "Showing unread" : "All"}
          </button>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">No notifications</p>
        ) : (
          items.map((n) => (
            <button
              key={n._id}
              onClick={() => handleOpen(n)}
              className={`group flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors last:border-0 dark:border-gray-800 ${
                n.isRead
                  ? "hover:bg-gray-50 dark:hover:bg-gray-800"
                  : "bg-indigo-50/40 hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                </div>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                onClick={(e) => handleRemove(e, n._id)}
                className="cursor-pointer rounded-md p-1 text-gray-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </span>
            </button>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1, unreadOnly)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1, unreadOnly)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
