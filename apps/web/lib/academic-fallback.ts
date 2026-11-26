import type {
  CoursePreviewOption,
  DepartmentOption,
  UniversityOption,
} from "@/components/auth/onboarding-form";

/**
 * Built-in Nigerian University, Department, Course, and Topic catalog fallback.
 * Used automatically when `DATABASE_URL` is not yet configured on a remote deployment (e.g. Vercel preview)
 * so onboarding and the Arena hub never crash with HTTP 500.
 */
export const FALLBACK_UNIVERSITIES: UniversityOption[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "University of Lagos",
    shortCode: "UNILAG",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "University of Ibadan",
    shortCode: "UI",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Obafemi Awolowo University",
    shortCode: "OAU",
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    name: "University of Nigeria, Nsukka",
    shortCode: "UNN",
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    name: "Federal University of Technology, Owerri",
    shortCode: "FUTO",
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    name: "Ahmadu Bello University, Zaria",
    shortCode: "ABU",
  },
];

export const FALLBACK_DEPARTMENTS: DepartmentOption[] =
  FALLBACK_UNIVERSITIES.map((uni, idx) => ({
    id: `22222222-2222-4222-8222-22222222220${idx + 1}`,
    universityId: uni.id,
    name: "Department of Computer Science",
    code: "CSC",
  }));

export interface FallbackCourseItem extends CoursePreviewOption {
  description: string;
}

export const FALLBACK_COURSES: FallbackCourseItem[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    code: "CSC 201",
    title: "Data Structures and Algorithms",
    description:
      "Fundamental data structures, asymptotic complexity, recursion, hashing, trees, and graph algorithms.",
    academicLevel: "200L",
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    code: "CSC 305",
    title: "Database Management Systems",
    description:
      "Relational algebra, SQL, functional dependencies, normalization (1NF to BCNF), indexing, and ACID transactions.",
    academicLevel: "300L",
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    code: "CSC 309",
    title: "Operating Systems",
    description:
      "Process management, CPU scheduling, threads, concurrency, deadlocks, memory management, and virtual memory paging.",
    academicLevel: "300L",
  },
];

export interface FallbackTopicItem {
  id: string;
  courseId: string;
  name: string;
  slug: string;
}

export const FALLBACK_TOPICS: FallbackTopicItem[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    courseId: "33333333-3333-4333-8333-333333333301",
    name: "Arrays & Asymptotic Complexity",
    slug: "arrays-and-complexity",
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    courseId: "33333333-3333-4333-8333-333333333301",
    name: "Recursion & Backtracking",
    slug: "recursion-and-backtracking",
  },
  {
    id: "44444444-4444-4444-8444-444444444403",
    courseId: "33333333-3333-4333-8333-333333333301",
    name: "Hash Tables & Dictionaries",
    slug: "hash-tables",
  },
  {
    id: "44444444-4444-4444-8444-444444444404",
    courseId: "33333333-3333-4333-8333-333333333301",
    name: "Trees & Graph Traversal",
    slug: "trees-and-graphs",
  },
  {
    id: "44444444-4444-4444-8444-444444444405",
    courseId: "33333333-3333-4333-8333-333333333302",
    name: "Relational Model & SQL",
    slug: "relational-model-and-sql",
  },
  {
    id: "44444444-4444-4444-8444-444444444406",
    courseId: "33333333-3333-4333-8333-333333333302",
    name: "Database Normalization (1NF–BCNF)",
    slug: "database-normalization",
  },
  {
    id: "44444444-4444-4444-8444-444444444407",
    courseId: "33333333-3333-4333-8333-333333333302",
    name: "Transactions & ACID Properties",
    slug: "transactions-and-acid",
  },
  {
    id: "44444444-4444-4444-8444-444444444408",
    courseId: "33333333-3333-4333-8333-333333333303",
    name: "Processes, Threads & Scheduling",
    slug: "processes-and-scheduling",
  },
  {
    id: "44444444-4444-4444-8444-444444444409",
    courseId: "33333333-3333-4333-8333-333333333303",
    name: "Deadlocks & Synchronization",
    slug: "deadlocks-and-synchronization",
  },
  {
    id: "44444444-4444-4444-8444-444444444410",
    courseId: "33333333-3333-4333-8333-333333333303",
    name: "Virtual Memory & Paging",
    slug: "virtual-memory-and-paging",
  },
];
