import { useState, useEffect } from "react";
import { Pencil, Trash2, X, ShieldCheck, ShieldAlert, User as UserIcon } from "lucide-react";
import { userApi } from "../../api/userApi";
import type { User, Pagination, UserRole } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useConfirm } from "../../context/ConfirmContext";

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  employee: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const roleIcon = (role: string) => {
  if (role === "admin") return <ShieldCheck className="h-4 w-4" />;
  if (role === "manager") return <ShieldAlert className="h-4 w-4" />;
  return <UserIcon className="h-4 w-4" />;
};

const statusDot = (active: boolean) => (
  <span
    className={clsx(
      "inline-block h-2 w-2 rounded-full",
      active ? "bg-emerald-500" : "bg-red-500"
    )}
  />
);

const roleDot = (role: string) => (
  <span
    className={clsx(
      "inline-block h-2 w-2 rounded-full",
      role === "admin"
        ? "bg-purple-500"
        : role === "manager"
          ? "bg-blue-500"
          : "bg-gray-400"
    )}
  />
);

export default function Users() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  // Edit modal
  const [editing, setEditing] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("employee");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchUsers = () => {
    userApi.getAll({ page, limit: 10 }).then((res) => {
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const openEdit = (u: User) => {
    setEditing(u);
    setEditRole(u.role);
    setEditActive(u.isActive);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await userApi.update(editing._id, { role: editRole, isActive: editActive } as any);
      toast.success("User updated!");
      setEditing(null);
      fetchUsers();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete user?", description: "The user will be permanently removed along with their access. This cannot be undone.", confirmLabel: "Delete user" }))) return;
    try {
      await userApi.delete(id);
      toast.success("User deleted.");
      fetchUsers();
    } catch {
      // handled
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        User Management
      </h1>

      {/* ───────── Desktop Table ───────── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
            <tr>
              {["User", "Role", "Status", "Joined", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => (
              <tr
                key={u._id}
                className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                {/* Avatar + Name + Email */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role Badge with dot + icon */}
                <td className="px-5 py-4">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      roleBadge[u.role]
                    )}
                  >
                    {roleDot(u.role)}
                    {roleIcon(u.role)}
                    {u.role}
                  </span>
                </td>

                {/* Status Badge with dot */}
                <td className="px-5 py-4">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      u.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    )}
                  >
                    {statusDot(u.isActive)}
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* Joined Date */}
                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Mobile Cards ───────── */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div
            key={u._id}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Top row: avatar + name/email left, role badge right */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {u.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {u.email}
                  </p>
                </div>
              </div>
              <span
                className={clsx(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  roleBadge[u.role]
                )}
              >
                {roleIcon(u.role)}
                {u.role}
              </span>
            </div>

            {/* 3-column mini-chip grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Role
                </p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                  {roleDot(u.role)}
                  {u.role}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Status
                </p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {statusDot(u.isActive)}
                  {u.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Joined
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Edit / Delete buttons */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => openEdit(u)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(u._id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ───────── Pagination ───────── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3.5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Page{" "}
            <span className="text-gray-900 dark:text-white">{pagination.page}</span>{" "}
            of{" "}
            <span className="text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ───────── Edit Modal ───────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4 transition-opacity">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit User
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info */}
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                {editing.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900 dark:text-white">
                  {editing.name}
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {editing.email}
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Status
                </label>
                <label className="flex items-center gap-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800"
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
