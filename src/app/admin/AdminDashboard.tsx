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

type Tab = "courses" | "chapters" | "exams" | "departments";

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
      subtitle="Add courses, chapters, exams, and departments. Copy the Telegram link and paste it in the group."
      backHref="/"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["courses", "Courses"],
            ["chapters", "Chapters"],
            ["exams", "Exams"],
            ["departments", "Departments"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === id
                ? "bg-[var(--tg-button)] text-[var(--tg-button-text)]"
                : "bg-white/70 text-[var(--tg-text)]"
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
