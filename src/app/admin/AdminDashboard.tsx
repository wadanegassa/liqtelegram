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

type Tab = "courses" | "chapters" | "exams" | "departments" | "bot";

export function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("courses");
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
      fetch("/api/admin/courses"),
      fetch("/api/admin/departments"),
    ]);
    if (cRes.status === 401 || dRes.status === 401) {
      setAuthed(false);
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
      fetch(`/api/admin/chapters?course_id=${courseId}`),
      fetch(`/api/admin/exams?course_id=${courseId}`),
    ]);
    const chJson = await chRes.json();
    const exJson = await exRes.json();
    setChapters(chJson.chapters || []);
    setExams(exJson.exams || []);
  }, []);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ready) setSetupHint(data.setup || data.error || "Database not ready");
      })
      .catch(() => setSetupHint("Could not reach setup check"));

    fetch("/api/admin/me")
      .then((r) => r.json())
      .then(async (data) => {
        setAuthed(Boolean(data.authenticated));
        if (data.authenticated) await refresh();
      })
      .finally(() => setChecking(false));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError("Wrong password");
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
    await fetch("/api/admin/logout", { method: "POST" });
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
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error || "Request failed");
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
      subtitle="Manage courses and bot payment texts. Copy Telegram links for the paid group."
      backHref="/"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
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

/** Upload lesson images so markdown like ![alt](graphs/file.png) works for students. */
function MarkdownImageUpload({
  onInserted,
}: {
  onInserted: (markdownLine: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [path, setPath] = useState("graphs/");

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      const objectPath = path.endsWith("/")
        ? `${path}${file.name}`
        : path || `graphs/${file.name}`;
      form.set("file", file);
      form.set("path", objectPath);
      const res = await fetch("/api/admin/assets", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Upload failed");
        return;
      }
      onInserted(data.markdown || `![](${data.path})`);
      setMessage(`Uploaded: ${data.path}`);
    } catch {
      setMessage("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-none border border-[var(--tg-text)] p-3 text-sm space-y-2">
      <div className="font-medium">Lesson images</div>
      <p className="text-xs text-[var(--tg-hint)]">
        Relative markdown like{" "}
        <code>![Circular flow](graphs/circular_flow_labeled.png)</code> only
        works after the PNG is uploaded here (same path).
      </p>
      <Field label="Upload path (keep graphs/… to match your markdown)">
        <input
          className="input-liq"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="graphs/circular_flow_labeled.png"
        />
      </Field>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          void onFile(f);
          e.target.value = "";
        }}
      />
      {message ? (
        <p className="text-xs text-[var(--tg-hint)]">{message}</p>
      ) : null}
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
            className="input-liq min-h-48 font-mono text-xs"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Chapter title&#10;&#10;Paste explanation markdown here…"
          />
        </Field>
        <MarkdownImageUpload
          onInserted={(line) =>
            setContent((prev) =>
              prev.trim() ? `${prev.trimEnd()}\n\n${line}\n` : `${line}\n`
            )
          }
        />
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
            className="input-liq min-h-48 font-mono text-xs"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        <MarkdownImageUpload
          onInserted={(line) =>
            setContent((prev) =>
              prev.trim() ? `${prev.trimEnd()}\n\n${line}\n` : `${line}\n`
            )
          }
        />
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
            className="input-liq min-h-48 font-mono text-xs"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        <MarkdownImageUpload
          onInserted={(line) =>
            setContent((prev) =>
              prev.trim() ? `${prev.trimEnd()}\n\n${line}\n` : `${line}\n`
            )
          }
        />
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
    fetch("/api/admin/bot-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.hint) setHint(data.hint);
        if (data.error && !data.settings) setHint(data.error);
        if (data.settings) {
          setForm({
            welcome_text: data.settings.welcome_text || DEFAULT_BOT_SETTINGS.welcome_text,
            payment_instructions:
              data.settings.payment_instructions ||
              DEFAULT_BOT_SETTINGS.payment_instructions,
            help_text: data.settings.help_text || DEFAULT_BOT_SETTINGS.help_text,
            ask_screenshot_text:
              data.settings.ask_screenshot_text ||
              DEFAULT_BOT_SETTINGS.ask_screenshot_text,
            proof_received_text:
              data.settings.proof_received_text ||
              DEFAULT_BOT_SETTINGS.proof_received_text,
            approved_text:
              data.settings.approved_text || DEFAULT_BOT_SETTINGS.approved_text,
            rejected_text:
              data.settings.rejected_text || DEFAULT_BOT_SETTINGS.rejected_text,
            status_member_text:
              data.settings.status_member_text ||
              DEFAULT_BOT_SETTINGS.status_member_text,
            status_pending_text:
              data.settings.status_pending_text ||
              DEFAULT_BOT_SETTINGS.status_pending_text,
            status_none_text:
              data.settings.status_none_text ||
              DEFAULT_BOT_SETTINGS.status_none_text,
          });
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

  const fields: Array<{
    key: keyof typeof form;
    label: string;
    rows?: number;
  }> = [
    { key: "welcome_text", label: "Welcome message (/start)", rows: 5 },
    {
      key: "payment_instructions",
      label: "Payment instructions (accounts, amount, methods)",
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
        <h3 className="font-display text-lg font-semibold">Bot texts & payment details</h3>
        <p className="mt-1 text-sm text-[var(--tg-hint)]">
          Edit what students see in Telegram. Supports Markdown (*bold*). Placeholders:{" "}
          <code>{"{{first_name}}"}</code>, <code>{"{{invite_link}}"}</code>.
          Do not share Mini App home links — students use course/chapter/exam links from the paid group.
        </p>
        {hint ? (
          <p className="mt-2 text-sm text-amber-800">{hint}</p>
        ) : null}
      </div>

      {fields.map((field) => (
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
