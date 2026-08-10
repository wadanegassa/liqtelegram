const bot =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ||
  "Liq_Academy_bot";
const appName = process.env.NEXT_PUBLIC_TELEGRAM_MINI_APP_NAME || "app";

export function miniAppBaseUrl(): string {
  return `https://t.me/${bot}/${appName}`;
}

export function courseStartParam(courseSlug: string): string {
  return `course_${courseSlug}`;
}

export function chapterStartParam(
  courseSlug: string,
  chapterSlug: string
): string {
  return `chapter_${courseSlug}_${chapterSlug}`;
}

export function examStartParam(courseSlug: string, examSlug: string): string {
  return `exam_${courseSlug}_${examSlug}`;
}

export function departmentStartParam(departmentSlug: string): string {
  return `dept_${departmentSlug}`;
}

export function shareLink(startParam: string): string {
  return `${miniAppBaseUrl()}?startapp=${startParam}`;
}

export type DeepLinkTarget =
  | { type: "home" }
  | { type: "courses" }
  | { type: "course"; courseSlug: string }
  | { type: "chapter"; courseSlug: string; chapterSlug: string }
  | { type: "exam"; courseSlug: string; examSlug: string }
  | { type: "departments" }
  | { type: "department"; departmentSlug: string }
  | { type: "admin" };

export function parseStartParam(raw?: string | null): DeepLinkTarget {
  if (!raw) return { type: "home" };

  const param = raw.trim();
  if (!param || param === "home") return { type: "home" };
  if (param === "courses") return { type: "courses" };
  if (param === "depts" || param === "departments") return { type: "departments" };
  if (param === "admin") return { type: "admin" };

  if (param.startsWith("course_")) {
    const courseSlug = param.slice("course_".length);
    if (courseSlug) return { type: "course", courseSlug };
  }

  if (param.startsWith("dept_")) {
    const departmentSlug = param.slice("dept_".length);
    if (departmentSlug) return { type: "department", departmentSlug };
  }

  if (param.startsWith("chapter_")) {
    const rest = param.slice("chapter_".length);
    const idx = rest.indexOf("_");
    if (idx > 0) {
      return {
        type: "chapter",
        courseSlug: rest.slice(0, idx),
        chapterSlug: rest.slice(idx + 1),
      };
    }
  }

  if (param.startsWith("exam_")) {
    const rest = param.slice("exam_".length);
    const idx = rest.indexOf("_");
    if (idx > 0) {
      return {
        type: "exam",
        courseSlug: rest.slice(0, idx),
        examSlug: rest.slice(idx + 1),
      };
    }
  }

  return { type: "home" };
}

export function pathForTarget(target: DeepLinkTarget): string {
  switch (target.type) {
    case "home":
      return "/";
    case "courses":
      return "/courses";
    case "course":
      return `/courses/${target.courseSlug}`;
    case "chapter":
      return `/courses/${target.courseSlug}/chapters/${target.chapterSlug}`;
    case "exam":
      return `/courses/${target.courseSlug}/exams/${target.examSlug}`;
    case "departments":
      return "/departments";
    case "department":
      return `/departments/${target.departmentSlug}`;
    case "admin":
      return "/admin";
  }
}
