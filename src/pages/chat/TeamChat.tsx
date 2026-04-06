import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Search,
  Plus,
  Users,
  MessageCircle,
  X,
  Hash,
  User as UserIcon,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { chatApi, type ConversationData, type MessageData } from "../../api/chatApi";
import { userApi } from "../../api/userApi";
import type { User } from "../../types";

/* ─── helpers ─── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTs(date: string): string {
  const now = Date.now();
  const d = new Date(date);
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMsgTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function senderName(senderId: MessageData["senderId"]): string {
  return typeof senderId === "string" ? "" : senderId.name;
}

function senderId(senderId: MessageData["senderId"]): string {
  return typeof senderId === "string" ? senderId : senderId._id;
}

/* ─── sub-components ─── */

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <div
      className={`${sz} flex-shrink-0 rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─── New Chat Modal ─── */

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDirect: (userId: string) => void;
  onCreateGroup: (name: string, members: string[]) => void;
  currentUserId: string;
}

function NewChatModal({ open, onClose, onSelectDirect, onCreateGroup, currentUserId }: NewChatModalProps) {
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    userApi
      .getAll({ limit: 200 })
      .then((r) => setUsers(r.data.data.filter((u) => u._id !== currentUserId && u.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setGroupName("");
      setSelected([]);
      setTab("direct");
    }
  }, [open]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleUser = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Chat</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setTab("direct")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "direct"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <UserIcon className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Direct Message
          </button>
          <button
            onClick={() => setTab("group")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "group"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            New Group
          </button>
        </div>

        {/* group name */}
        {tab === "group" && (
          <div className="px-5 pt-4">
            <input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}

        {/* search */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* user list */}
        <div className="mt-3 max-h-64 overflow-y-auto px-5 pb-4 space-y-1">
          {loading && <p className="text-sm text-gray-400 py-4 text-center">Loading users...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No users found</p>
          )}
          {filtered.map((u) => (
            <button
              key={u._id}
              onClick={() => (tab === "direct" ? onSelectDirect(u._id) : toggleUser(u._id))}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                tab === "group" && selected.includes(u._id)
                  ? "bg-indigo-50 dark:bg-indigo-500/15 ring-1 ring-indigo-400/40"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Avatar name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.department || u.email}</p>
              </div>
              {tab === "group" && selected.includes(u._id) && (
                <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">Selected</span>
              )}
            </button>
          ))}
        </div>

        {/* create group button */}
        {tab === "group" && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4">
            <button
              disabled={!groupName.trim() || selected.length < 1}
              onClick={() => onCreateGroup(groupName.trim(), selected)}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 text-sm font-medium transition-colors"
            >
              Create Group ({selected.length} member{selected.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main TeamChat Component ─── */

export default function TeamChat() {
  const { user } = useAuth();
  const myId = user?._id ?? "";

  // state
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [text, setText] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // active conversation object
  const activeConvo = conversations.find((c) => c._id === activeId) ?? null;

  /* ─ fetch conversations ─ */
  const fetchConversations = useCallback(() => {
    chatApi
      .getMyConversations()
      .then((r) => {
        if (r.data.data) setConversations(r.data.data);
      })
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    fetchConversations();
    const iv = setInterval(fetchConversations, 10000);
    return () => clearInterval(iv);
  }, [fetchConversations]);

  /* ─ fetch messages ─ */
  const fetchMessages = useCallback(
    (convoId: string) => {
      chatApi
        .getMessages(convoId, { limit: 100 })
        .then((r) => setMessages(r.data.data ?? []))
        .catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    chatApi
      .getMessages(activeId, { limit: 100 })
      .then((r) => {
        setMessages(r.data.data ?? []);
        chatApi.markAsRead(activeId).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));

    const iv = setInterval(() => fetchMessages(activeId), 5000);
    return () => clearInterval(iv);
  }, [activeId, fetchMessages]);

  /* ─ auto-scroll ─ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─ send message ─ */
  const handleSend = async () => {
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(activeId, text.trim());
      if (res.data.data) setMessages((prev) => [...prev, res.data.data!]);
      setText("");
      textareaRef.current?.focus();
      fetchConversations();
    } catch {
      /* interceptor */
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─ new chat handlers ─ */
  const handleDirectChat = async (userId: string) => {
    try {
      const res = await chatApi.getOrCreateDirect(userId);
      if (res.data.data) {
        setShowModal(false);
        fetchConversations();
        setActiveId(res.data.data._id);
        setMobileShowChat(true);
      }
    } catch {
      /* interceptor */
    }
  };

  const handleCreateGroup = async (name: string, members: string[]) => {
    try {
      const res = await chatApi.createGroup(name, members);
      if (res.data.data) {
        setShowModal(false);
        fetchConversations();
        setActiveId(res.data.data._id);
        setMobileShowChat(true);
      }
    } catch {
      /* interceptor */
    }
  };

  /* ─ select conversation ─ */
  const selectConvo = (id: string) => {
    setActiveId(id);
    setMobileShowChat(true);
    chatApi.markAsRead(id).catch(() => {});
  };

  /* ─ helpers ─ */
  function convoDisplayName(c: ConversationData): string {
    if (c.type === "group") return c.name || "Group Chat";
    const other = c.participants.find((p) => p._id !== myId);
    return other?.name ?? "Chat";
  }

  function lastMsgPreview(c: ConversationData): string {
    if (!c.lastMessage) return "No messages yet";
    const txt = c.lastMessage.text;
    return txt.length > 45 ? txt.slice(0, 45) + "..." : txt;
  }

  const filteredConvos = conversations.filter((c) =>
    convoDisplayName(c).toLowerCase().includes(searchQ.toLowerCase()),
  );

  /* ─── render ─── */

  const card = "rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-indigo-200">Stay connected</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <MessageCircle className="h-7 w-7" /> Team Chat
          </h1>
          <p className="mt-1 text-sm text-indigo-200">Message your teammates in real time</p>
        </div>
      </div>

      {/* Chat layout */}
      <div className={`${card} flex overflow-hidden`} style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
        {/* ─── LEFT SIDEBAR ─── */}
        <div
          className={`w-full md:w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* sidebar header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Messages</h2>
              <button
                onClick={() => setShowModal(true)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-2 transition-colors"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search conversations..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos && (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            )}
            {!loadingConvos && filteredConvos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a new chat to get going</p>
              </div>
            )}
            {filteredConvos.map((c) => {
              const isActive = c._id === activeId;
              const name = convoDisplayName(c);
              return (
                <button
                  key={c._id}
                  onClick={() => selectConvo(c._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800/50 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-500/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {/* avatar */}
                  <div className="relative flex-shrink-0">
                    {c.type === "group" ? (
                      <div className="h-10 w-10 rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Hash className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar name={name} />
                    )}
                  </div>

                  {/* content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {name}
                      </p>
                      {c.lastMessage && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                          {formatTs(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {lastMsgPreview(c)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div
          className={`flex-1 flex flex-col ${
            !mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {!activeConvo ? (
            /* placeholder */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="h-20 w-20 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select a conversation</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                Choose a conversation from the sidebar or start a new chat to begin messaging.
              </p>
            </div>
          ) : (
            <>
              {/* chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {activeConvo.type === "group" ? (
                  <div className="h-10 w-10 rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Hash className="h-5 w-5" />
                  </div>
                ) : (
                  <Avatar name={convoDisplayName(activeConvo)} />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {convoDisplayName(activeConvo)}
                  </h3>
                  {activeConvo.type === "group" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeConvo.participants.length} participant{activeConvo.participants.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {loadingMsgs && (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isOwn = senderId(msg.senderId) === myId;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const sameSenderAsPrev =
                    prevMsg && senderId(prevMsg.senderId) === senderId(msg.senderId);
                  const showSenderInfo = !isOwn && !sameSenderAsPrev;

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${
                        sameSenderAsPrev ? "mt-0.5" : "mt-3"
                      }`}
                    >
                      <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        {/* avatar */}
                        {!isOwn && (
                          <div className="flex-shrink-0 w-8">
                            {showSenderInfo ? (
                              <Avatar name={senderName(msg.senderId) || "?"} size="sm" />
                            ) : null}
                          </div>
                        )}

                        <div>
                          {/* sender name */}
                          {showSenderInfo && activeConvo.type === "group" && (
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                              {senderName(msg.senderId)}
                            </p>
                          )}
                          {/* bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-br-md"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                          {/* timestamp */}
                          <p
                            className={`text-[11px] mt-1 ${
                              isOwn ? "text-right text-gray-400" : "text-left text-gray-400"
                            }`}
                          >
                            {formatMsgTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* input bar */}
              <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none max-h-32"
                    style={{ minHeight: "42px" }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 128) + "px";
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 transition-colors flex-shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSelectDirect={handleDirectChat}
        onCreateGroup={handleCreateGroup}
        currentUserId={myId}
      />
    </div>
  );
}
