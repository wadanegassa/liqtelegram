"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import {
  chapterStartParam,
  courseStartParam,
  departmentStartParam,
  examStartParam,
  shareLink,
} from "@/lib/links";
import { slugify } from "@/lib/slug";
import type { Chapter, Course, Department, Exam } from "@/lib/types";
import type { BotSettings } from "@/lib/bot-settings";
import { DEFAULT_BOT_SETTINGS } from "@/lib/bot-settings";

type Tab =
  | "analytics"
  | "courses"
  | "chapters"
  | "exams"
  | "departments"
  | "bot";

export function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("analytics");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [setupHint, setSetupHint] = useState<string | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const refresh = useCallback(async () => {
    const [cRes, dRes] = await Promise.all([
      fetch("/api/admin/courses", { credentials: "same-origin" }),
      fetch("/api/admin/departments", { credentials: "same-origin" }),
    ]);
    if (cRes.status === 401 || dRes.status === 401) {
      setAuthed(false);
      return;
    }
    if (!cRes.ok || !dRes.ok) {
      setMessage("Could not load courses/departments. Refresh and try again.");
      return;
    }
    const cJson = await cRes.json();
    const dJson = await dRes.json();
    setCourses(cJson.courses || []);
    setDepartments(dJson.departments || []);
    if (!selectedCourseId && cJson.courses?.[0]?.id) {
      setSelectedCourseId(cJson.courses[0].id);
    }
  }, [selectedCourseId]);

  const refreshCourseContent = useCallback(async (courseId: string) => {
    if (!courseId) {
      setChapters([]);
      setExams([]);
      return;
    }
    const [chRes, exRes] = await Promise.all([
      fetch(`/api/admin/chapters?course_id=${courseId}`, {
        credentials: "same-origin",
      }),
      fetch(`/api/admin/exams?course_id=${courseId}`, {
        credentials: "same-origin",
      }),
    ]);
    const chJson = await chRes.json().catch(() => ({}));
    const exJson = await exRes.json().catch(() => ({}));
    setChapters(chJson.chapters || []);
    setExams(exJson.exams || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    fetch("/api/setup", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ready)
          setSetupHint(data.setup || data.error || "Database not ready");
      })
      .catch(() => {
        if (!cancelled)
          setSetupHint(
            "Could not reach the server. Check your connection, then refresh."
          );
      });

    fetch("/api/admin/me", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return;
        setAuthed(Boolean(data.authenticated));
        if (data.authenticated) await refresh();
      })
      .catch(() => {
        if (!cancelled) {
          setAuthed(false);
          setLoginError(
            "Could not check login session. Refresh the page or try again in a minute."
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  useEffect(() => {
    if (authed && selectedCourseId) {
      refreshCourseContent(selectedCourseId);
    }
  }, [authed, selectedCourseId, refreshCourseContent]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(json.error || "Wrong password");
        return;
      }
      setAuthed(true);
      setPassword("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setAuthed(false);
  }

  async function api(
    url: string,
    method: string,
    body?: Record<string, unknown>
  ) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setAuthed(false);
        setMessage("Session expired — please log in again, then save.");
        return false;
      }
      if (!res.ok) {
        setMessage(
          [json.error, json.hint].filter(Boolean).join(" — ") ||
            "Request failed"
        );
        return false;
      }
      setMessage("Saved");
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <AppShell title="Admin" subtitle="Checking session…">
        <p className="text-sm text-[var(--tg-hint)]">Loading…</p>
      </AppShell>
    );
  }

  if (!authed) {
    return (
      <AppShell
        title="Admin login"
        subtitle="Password-protected content dashboard."
        backHref="/"
      >
        <form onSubmit={onLogin} className="card-liq max-w-md space-y-3">
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="input-liq mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {loginError ? (
            <p className="text-sm text-red-700">{loginError}</p>
          ) : null}
          <button className="btn-liq" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Content admin"
      subtitle="Payments analytics, courses, and bot texts. Revenue counts approved proofs only."
      backHref="/"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["analytics", "Analytics"],
            ["courses", "Courses"],
            ["chapters", "Chapters"],
            ["exams", "Exams"],
            ["departments", "Departments"],
            ["bot", "Bot texts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`border border-black px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-black text-white"
                : "bg-white text-black"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="btn-ghost ml-auto" onClick={onLogout}>
          Log out
        </button>
      </div>

      {setupHint ? (
        <div className="card-liq mb-4 text-sm text-amber-900">
          <strong>Database setup needed:</strong> {setupHint}
        </div>
      ) : null}

      {message ? (
        <p className="mb-3 text-sm text-[var(--liq-accent)]">{message}</p>
      ) : null}

      {tab === "analytics" ? <AnalyticsAdmin /> : null}

      {tab === "courses" ? (
        <CoursesAdmin
          courses={courses}
          busy={busy}
          onCreate={async (payload) => {
            const ok = await api("/api/admin/courses", "POST", payload);
            if (ok) await refresh();
          }}
          onUpdate={async (id, payload) => {
            const ok = await api(`/api/admin/courses/${id}`, "PATCH", payload);
            if (ok) await refresh();
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this course and all its chapters/exams?"))
              return;
            const ok = await api(`/api/admin/courses/${id}`, "DELETE");
            if (ok) await refresh();
          }}
        />
      ) : null}

      {tab === "chapters" ? (
        <ChaptersAdmin
          courses={courses}
          chapters={chapters}
          selectedCourseId={selectedCourseId}
          selectedCourse={selectedCourse}
          busy={busy}
          onSelectCourse={setSelectedCourseId}
          onCreate={async (payload) => {
            const ok = await api("/api/admin/chapters", "POST", payload);
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
          onUpdate={async (id, payload) => {
            const ok = await api(`/api/admin/chapters/${id}`, "PATCH", payload);
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this chapter?")) return;
            const ok = await api(`/api/admin/chapters/${id}`, "DELETE");
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
        />
      ) : null}

      {tab === "exams" ? (
        <ExamsAdmin
          courses={courses}
          exams={exams}
          selectedCourseId={selectedCourseId}
          selectedCourse={selectedCourse}
          busy={busy}
          onSelectCourse={setSelectedCourseId}
          onCreate={async (payload) => {
            const ok = await api("/api/admin/exams", "POST", payload);
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
          onUpdate={async (id, payload) => {
            const ok = await api(`/api/admin/exams/${id}`, "PATCH", payload);
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this exam?")) return;
            const ok = await api(`/api/admin/exams/${id}`, "DELETE");
            if (ok) await refreshCourseContent(selectedCourseId);
          }}
        />
      ) : null}

      {tab === "departments" ? (
        <DepartmentsAdmin
          departments={departments}
          busy={busy}
          onCreate={async (payload) => {
            const ok = await api("/api/admin/departments", "POST", payload);
            if (ok) await refresh();
          }}
          onUpdate={async (id, payload) => {
            const ok = await api(
              `/api/admin/departments/${id}`,
              "PATCH",
              payload
            );
            if (ok) await refresh();
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this department?")) return;
            const ok = await api(`/api/admin/departments/${id}`, "DELETE");
            if (ok) await refresh();
          }}
        />
      ) : null}

      {tab === "bot" ? (
        <BotSettingsAdmin
          busy={busy}
          onSave={async (payload) => {
            const ok = await api("/api/admin/bot-settings", "PUT", payload);
            return ok;
          }}
        />
      ) : null}
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--tg-hint)]">{label}</span>
      {children}
    </label>
  );
}

type AnalyticsSummary = {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  paying_users: number;
  unique_submitters: number;
  payment_amount_etb: number;
  revenue_etb: number;
};

type AnalyticsDay = {
  date: string;
  approved: number;
  rejected: number;
  pending: number;
};

type AnalyticsRecent = {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  estimated_amount_etb: number;
};

function analyticsDisplayName(row: AnalyticsRecent) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  if (name && row.username) return `${name} (@${row.username})`;
  if (name) return name;
  if (row.username) return `@${row.username}`;
  return `ID ${row.telegram_user_id}`;
}

function formatEtb(n: number) {
  return `${n.toLocaleString()} ETB`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function BarChart({
  title,
  days,
  field,
  color,
}: {
  title: string;
  days: AnalyticsDay[];
  field: "approved" | "rejected" | "pending";
  color: string;
}) {
  const max = Math.max(1, ...days.map((d) => d[field]));
  return (
    <div className="card-liq">
      <h4 className="mb-3 font-semibold">{title}</h4>
      <div className="flex h-36 items-end gap-0.5">
        {days.map((d) => {
          const value = d[field];
          const height = Math.max(2, Math.round((value / max) * 100));
          return (
            <div
              key={`${field}-${d.date}`}
              className="relative flex min-w-0 flex-1 flex-col justify-end"
              title={`${d.date}: ${value}`}
            >
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${height}%`, background: color }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[var(--tg-hint)]">
        <span>{days[0]?.date?.slice(5) || ""}</span>
        <span>Last 30 days</span>
        <span>{days[days.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function StatusPie({
  approved,
  rejected,
  pending,
}: {
  approved: number;
  rejected: number;
  pending: number;
}) {
  const total = Math.max(1, approved + rejected + pending);
  const a = (approved / total) * 100;
  const r = (rejected / total) * 100;
  return (
    <div className="card-liq">
      <h4 className="mb-3 font-semibold">Status mix</h4>
      <div
        className="mx-auto h-40 w-40 rounded-full"
        style={{
          background: `conic-gradient(#15803d 0 ${a}%, #b91c1c ${a}% ${a + r}%, #ca8a04 ${a + r}% 100%)`,
        }}
        title={`Approved ${approved} · Rejected ${rejected} · Pending ${pending}`}
      />
      <ul className="mt-4 space-y-1 text-sm">
        <li>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-700" />
          Approved: <strong>{approved}</strong>
        </li>
        <li>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-700" />
          Rejected: <strong>{rejected}</strong>
        </li>
        <li>
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-yellow-600" />
          Pending: <strong>{pending}</strong>
        </li>
      </ul>
    </div>
  );
}

function AnalyticsAdmin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [byDay, setByDay] = useState<AnalyticsDay[]>([]);
  const [recent, setRecent] = useState<AnalyticsRecent[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "rejected" | "pending"
  >("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics", {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          [json.error, json.hint].filter(Boolean).join(" — ") ||
            "Could not load analytics"
        );
        return;
      }
      setSummary(json.summary || null);
      setByDay(json.by_day || []);
      setRecent(json.recent || []);
      setNote(json.note || "");
    } catch {
      setError("Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return recent;
    return recent.filter((r) => r.status === statusFilter);
  }, [recent, statusFilter]);

  if (loading) {
    return <p className="text-sm text-[var(--tg-hint)]">Loading analytics…</p>;
  }

  if (error) {
    return (
      <div className="card-liq space-y-3 text-sm">
        <p className="text-red-700">{error}</p>
        <button type="button" className="btn-liq" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="text-sm text-[var(--tg-hint)]">No analytics data yet.</p>
    );
  }

  const cards: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: "Revenue (approved)",
      value: formatEtb(summary.revenue_etb),
      hint: `${formatEtb(summary.payment_amount_etb)} × ${summary.approved} approvals`,
    },
    {
      label: "Paying users",
      value: String(summary.paying_users),
      hint: "Unique users with ≥1 approved proof",
    },
    {
      label: "Approved",
      value: String(summary.approved),
    },
    {
      label: "Rejected",
      value: String(summary.rejected),
    },
    {
      label: "Pending",
      value: String(summary.pending),
    },
    {
      label: "All proofs",
      value: String(summary.total_requests),
      hint: `${summary.unique_submitters} unique submitters`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold">Payments overview</h3>
        <button
          type="button"
          className="btn-ghost ml-auto text-sm"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      {note ? (
        <p className="text-sm text-[var(--tg-hint)]">{note}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card-liq">
            <p className="text-xs uppercase tracking-wide text-[var(--tg-hint)]">
              {card.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {card.value}
            </p>
            {card.hint ? (
              <p className="mt-1 text-xs text-[var(--tg-hint)]">{card.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChart
            title="Approved proofs / day"
            days={byDay}
            field="approved"
            color="#15803d"
          />
        </div>
        <StatusPie
          approved={summary.approved}
          rejected={summary.rejected}
          pending={summary.pending}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BarChart
          title="Rejected / day"
          days={byDay}
          field="rejected"
          color="#b91c1c"
        />
        <BarChart
          title="New pending / day"
          days={byDay}
          field="pending"
          color="#ca8a04"
        />
      </div>

      <div className="card-liq space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">Recent payment proofs</h4>
          <select
            className="input-liq ml-auto w-auto py-1 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "approved" | "rejected" | "pending"
              )
            }
          >
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--tg-text)] text-xs uppercase tracking-wide text-[var(--tg-hint)]">
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="py-2 pr-3 font-medium">Telegram ID</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Submitted</th>
                <th className="py-2 pr-3 font-medium">Reviewed</th>
                <th className="py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-[var(--tg-hint)]"
                  >
                    No payment proofs yet.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--tg-code-border)]"
                  >
                    <td className="py-2 pr-3">{analyticsDisplayName(row)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {row.telegram_user_id}
                    </td>
                    <td className="py-2 pr-3 capitalize">{row.status}</td>
                    <td className="py-2 pr-3 text-xs text-[var(--tg-hint)]">
                      {formatWhen(row.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[var(--tg-hint)]">
                      {formatWhen(row.reviewed_at)}
                    </td>
                    <td className="py-2">
                      {row.status === "approved"
                        ? formatEtb(row.estimated_amount_etb)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CoursesAdmin({
  courses,
  busy,
  onCreate,
  onUpdate,
  onDelete,
}: {
  courses: Course[];
  busy: boolean;
  onCreate: (p: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, p: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Course | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="card-liq space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const payload = {
            title,
            slug: slug || slugify(title),
            description,
          };
          if (editing) {
            await onUpdate(editing.id, payload);
            setEditing(null);
          } else {
            await onCreate(payload);
          }
          setTitle("");
          setSlug("");
          setDescription("");
        }}
      >
        <h3 className="font-display text-lg font-semibold">
          {editing ? "Edit course" : "Add course"}
        </h3>
        <Field label="Title">
          <input
            className="input-liq"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="Slug (used in links)">
          <input
            className="input-liq"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </Field>
        <Field label="Short description">
          <textarea
            className="input-liq min-h-20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <button className="btn-liq" disabled={busy} type="submit">
            {editing ? "Update course" : "Save course"}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditing(null);
                setTitle("");
                setSlug("");
                setDescription("");
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id} className="card-liq space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{course.title}</div>
                <div className="text-xs text-[var(--tg-hint)]">
                  /{course.slug}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(course);
                    setTitle(course.title);
                    setSlug(course.slug);
                    setDescription(course.description);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-700"
                  onClick={() => onDelete(course.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <CopyLinkButton link={shareLink(courseStartParam(course.slug))} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChaptersAdmin({
  courses,
  chapters,
  selectedCourseId,
  selectedCourse,
  busy,
  onSelectCourse,
  onCreate,
  onUpdate,
  onDelete,
}: {
  courses: Course[];
  chapters: Chapter[];
  selectedCourseId: string;
  selectedCourse: Course | null;
  busy: boolean;
  onSelectCourse: (id: string) => void;
  onCreate: (p: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, p: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [editing, setEditing] = useState<Chapter | null>(null);

  return (
    <div className="space-y-4">
      <div className="card-liq">
        <Field label="Course">
          <select
            className="input-liq"
            value={selectedCourseId}
            onChange={(e) => onSelectCourse(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <form
        className="card-liq space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!selectedCourseId) return;
          const payload = {
            course_id: selectedCourseId,
            title,
            slug: slug || slugify(title),
            content_md: content,
            sort_order: sortOrder,
          };
          if (editing) {
            await onUpdate(editing.id, payload);
            setEditing(null);
          } else {
            await onCreate(payload);
          }
          setTitle("");
          setSlug("");
          setContent("");
          setSortOrder(0);
        }}
      >
        <h3 className="font-display text-lg font-semibold">
          {editing ? "Edit chapter" : "Add chapter"}
        </h3>
        <Field label="Title">
          <input
            className="input-liq"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="Slug">
          <input
            className="input-liq"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            className="input-liq"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Markdown content">
          <textarea
            className="input-liq min-h-[70vh] font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Chapter title&#10;&#10;Paste explanation markdown here…"
          />
        </Field>
        <button
          className="btn-liq"
          disabled={busy || !selectedCourseId}
          type="submit"
        >
          {editing ? "Update chapter" : "Save chapter"}
        </button>
      </form>

      <div className="space-y-3">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="card-liq space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{chapter.title}</div>
                <div className="text-xs text-[var(--tg-hint)]">
                  /{chapter.slug}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(chapter);
                    setTitle(chapter.title);
                    setSlug(chapter.slug);
                    setContent(chapter.content_md);
                    setSortOrder(chapter.sort_order);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-700"
                  onClick={() => onDelete(chapter.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {selectedCourse ? (
              <CopyLinkButton
                link={shareLink(
                  chapterStartParam(selectedCourse.slug, chapter.slug)
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamsAdmin({
  courses,
  exams,
  selectedCourseId,
  selectedCourse,
  busy,
  onSelectCourse,
  onCreate,
  onUpdate,
  onDelete,
}: {
  courses: Course[];
  exams: Exam[];
  selectedCourseId: string;
  selectedCourse: Course | null;
  busy: boolean;
  onSelectCourse: (id: string) => void;
  onCreate: (p: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, p: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [year, setYear] = useState("");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [editing, setEditing] = useState<Exam | null>(null);

  return (
    <div className="space-y-4">
      <div className="card-liq">
        <Field label="Course">
          <select
            className="input-liq"
            value={selectedCourseId}
            onChange={(e) => onSelectCourse(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <form
        className="card-liq space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!selectedCourseId) return;
          const payload = {
            course_id: selectedCourseId,
            title,
            slug: slug || slugify(title),
            year,
            content_md: content,
            sort_order: sortOrder,
          };
          if (editing) {
            await onUpdate(editing.id, payload);
            setEditing(null);
          } else {
            await onCreate(payload);
          }
          setTitle("");
          setSlug("");
          setYear("");
          setContent("");
          setSortOrder(0);
        }}
      >
        <h3 className="font-display text-lg font-semibold">
          {editing ? "Edit exam" : "Add exam"}
        </h3>
        <Field label="Title">
          <input
            className="input-liq"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="Slug">
          <input
            className="input-liq"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </Field>
        <Field label="Year / label">
          <input
            className="input-liq"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024 Midterm"
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            className="input-liq"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Markdown (questions + answers)">
          <textarea
            className="input-liq min-h-[70vh] font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        <button
          className="btn-liq"
          disabled={busy || !selectedCourseId}
          type="submit"
        >
          {editing ? "Update exam" : "Save exam"}
        </button>
      </form>

      <div className="space-y-3">
        {exams.map((exam) => (
          <div key={exam.id} className="card-liq space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{exam.title}</div>
                <div className="text-xs text-[var(--tg-hint)]">
                  /{exam.slug}
                  {exam.year ? ` · ${exam.year}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(exam);
                    setTitle(exam.title);
                    setSlug(exam.slug);
                    setYear(exam.year);
                    setContent(exam.content_md);
                    setSortOrder(exam.sort_order);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-700"
                  onClick={() => onDelete(exam.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {selectedCourse ? (
              <CopyLinkButton
                link={shareLink(examStartParam(selectedCourse.slug, exam.slug))}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentsAdmin({
  departments,
  busy,
  onCreate,
  onUpdate,
  onDelete,
}: {
  departments: Department[];
  busy: boolean;
  onCreate: (p: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, p: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="card-liq space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const payload = {
            title,
            slug: slug || slugify(title),
            summary,
            content_md: content,
          };
          if (editing) {
            await onUpdate(editing.id, payload);
            setEditing(null);
          } else {
            await onCreate(payload);
          }
          setTitle("");
          setSlug("");
          setSummary("");
          setContent("");
        }}
      >
        <h3 className="font-display text-lg font-semibold">
          {editing ? "Edit department" : "Add department"}
        </h3>
        <Field label="Title">
          <input
            className="input-liq"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!editing) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="Slug">
          <input
            className="input-liq"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
        </Field>
        <Field label="Short summary">
          <input
            className="input-liq"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>
        <Field label="Markdown guide">
          <textarea
            className="input-liq min-h-[70vh] font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        <button className="btn-liq" disabled={busy} type="submit">
          {editing ? "Update department" : "Save department"}
        </button>
      </form>

      <div className="space-y-3">
        {departments.map((dept) => (
          <div key={dept.id} className="card-liq space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{dept.title}</div>
                <div className="text-xs text-[var(--tg-hint)]">/{dept.slug}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(dept);
                    setTitle(dept.title);
                    setSlug(dept.slug);
                    setSummary(dept.summary);
                    setContent(dept.content_md);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-700"
                  onClick={() => onDelete(dept.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <CopyLinkButton
              link={shareLink(departmentStartParam(dept.slug))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BotSettingsAdmin({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");
  const [form, setForm] = useState<Omit<BotSettings, "id" | "updated_at">>({
    ...DEFAULT_BOT_SETTINGS,
  });

  useEffect(() => {
    fetch("/api/admin/bot-settings", { credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.status === 401) {
          setHint("Session expired — log out and log in again, then save.");
          return;
        }
        if (data.hint) setHint(data.hint);
        if (data.error && !data.settings) setHint(data.error);
        if (data.settings) {
          setForm({
            ...DEFAULT_BOT_SETTINGS,
            ...Object.fromEntries(
              Object.keys(DEFAULT_BOT_SETTINGS).map((key) => [
                key,
                data.settings[key] ??
                  DEFAULT_BOT_SETTINGS[key as keyof typeof DEFAULT_BOT_SETTINGS],
              ])
            ),
          } as Omit<BotSettings, "id" | "updated_at">);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <p className="text-sm text-[var(--tg-hint)]">Loading bot texts…</p>;
  }

  const paymentFields: Array<{
    key: keyof typeof form;
    label: string;
    placeholder?: string;
  }> = [
    {
      key: "payment_amount",
      label: "Amount (ETB)",
      placeholder: "500",
    },
    {
      key: "payment_account_name",
      label: "Shared fallback name ({{account_name}}, optional)",
      placeholder: "Used only if your text still has {{account_name}}",
    },
    {
      key: "telebirr_phone",
      label: "Telebirr phone (copy button)",
      placeholder: "09xxxxxxxx",
    },
    {
      key: "telebirr_name",
      label: "Telebirr account holder name",
      placeholder: "Name on Telebirr",
    },
    {
      key: "cbe_account_number",
      label: "CBE / bank account number (copy button)",
      placeholder: "1000xxxxxxx",
    },
    {
      key: "cbe_account_name",
      label: "CBE / bank account holder name",
      placeholder: "Name on bank account",
    },
    {
      key: "support_chat_url",
      label: "Support chat link (Help button opens this)",
      placeholder: "https://t.me/your_support_username",
    },
  ];

  const textFields: Array<{
    key: keyof typeof form;
    label: string;
    rows?: number;
  }> = [
    { key: "welcome_text", label: "Welcome message (/start)", rows: 5 },
    {
      key: "payment_instructions",
      label:
        "Payment message (use {{amount}}, {{telebirr_name}}, {{telebirr_phone}}, {{cbe_account_name}}, {{cbe_account}})",
      rows: 12,
    },
    { key: "help_text", label: "Help text", rows: 8 },
    { key: "ask_screenshot_text", label: "Ask for screenshot text", rows: 3 },
    { key: "proof_received_text", label: "Proof received text", rows: 3 },
    {
      key: "approved_text",
      label: "Approved message (use {{invite_link}})",
      rows: 8,
    },
    { key: "rejected_text", label: "Rejected message", rows: 4 },
    { key: "status_member_text", label: "Status: already a member", rows: 3 },
    { key: "status_pending_text", label: "Status: pending review", rows: 3 },
    { key: "status_none_text", label: "Status: no proof yet", rows: 3 },
  ];

  return (
    <form
      className="card-liq space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave({ ...form });
      }}
    >
      <div>
        <h3 className="font-display text-lg font-semibold">
          Bot texts & payment details
        </h3>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">
          Students see English + Amharic by default. Edit texts anytime. Help
          opens your Support chat link. Placeholders:{" "}
          <code>{"{{first_name}}"}</code>, <code>{"{{amount}}"}</code>,{" "}
          <code>{"{{telebirr_name}}"}</code>, <code>{"{{telebirr_phone}}"}</code>,{" "}
          <code>{"{{cbe_account_name}}"}</code>, <code>{"{{cbe_account}}"}</code>,{" "}
          <code>{"{{invite_link}}"}</code>, <code>{"{{support_url}}"}</code>.
        </p>
        {hint ? (
          <p className="mt-2 text-sm text-amber-800">{hint}</p>
        ) : null}
      </div>

      <div className="space-y-3 border border-[var(--tg-text)] p-3">
        <h4 className="font-semibold">💚💙 Payment + support link</h4>
        <p className="text-xs text-[var(--tg-hint)]">
          Copy buttons use Telebirr/CBE fields. Help uses Support chat link
          (https://t.me/...). Run{" "}
          <code>supabase/bot_settings_payments.sql</code> once if save fails.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {paymentFields.map((field) => (
            <Field key={field.key} label={field.label}>
              <input
                className="input-liq"
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </div>

      {textFields.map((field) => (
        <Field key={field.key} label={field.label}>
          <textarea
            className="input-liq min-h-24 font-mono text-xs"
            style={{ minHeight: `${(field.rows || 4) * 1.4}rem` }}
            value={form[field.key]}
            onChange={(e) => setField(field.key, e.target.value)}
          />
        </Field>
      ))}

      <button className="btn-liq" disabled={busy} type="submit">
        {busy ? "Saving…" : "Save bot texts"}
      </button>
    </form>
  );
}

