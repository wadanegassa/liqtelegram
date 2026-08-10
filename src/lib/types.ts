export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  content_md: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  content_md: string;
  year: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content_md: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
