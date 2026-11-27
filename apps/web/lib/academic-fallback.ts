import type {
  CoursePreviewOption,
  DepartmentOption,
  UniversityOption,
} from "@/components/auth/onboarding-form";

/**
 * Built-in Nigerian University, Department, Course, and Topic catalog fallback.
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

const FALLBACK_DEPT_DEFS = [
  { name: "Department of Computer Science", code: "CSC", suffix: "1" },
  { name: "Department of Statistics", code: "STA", suffix: "2" },
  { name: "Department of Accountancy", code: "ACC", suffix: "3" },
] as const;

export const FALLBACK_DEPARTMENTS: DepartmentOption[] =
  FALLBACK_UNIVERSITIES.flatMap((uni, uniIdx) =>
    FALLBACK_DEPT_DEFS.map((dept) => ({
      id: `22222222-2222-4222-8222-222222222${uniIdx + 1}0${dept.suffix}`,
      universityId: uni.id,
      name: dept.name,
      code: dept.code,
    }))
  );

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
  {
    id: "33333333-3333-4333-8333-333333333304",
    code: "STA 201",
    title: "Probability Theory and Distributions",
    description:
      "Sample spaces, conditional probability, Bayes' theorem, discrete and continuous random variables, expectation, and the Central Limit Theorem.",
    academicLevel: "200L",
  },
  {
    id: "33333333-3333-4333-8333-333333333305",
    code: "STA 305",
    title: "Statistical Inference and Regression Analysis",
    description:
      "Point and interval estimation, Maximum Likelihood Estimation (MLE), hypothesis testing, ANOVA, and linear regression modeling.",
    academicLevel: "300L",
  },
  {
    id: "33333333-3333-4333-8333-333333333306",
    code: "ACC 201",
    title: "Principles of Financial Accounting & IFRS",
    description:
      "Double-entry bookkeeping, the accounting equation, trial balance, accrual adjustments, depreciation, bank reconciliation, and IAS/IFRS financial statements.",
    academicLevel: "200L",
  },
  {
    id: "33333333-3333-4333-8333-333333333307",
    code: "ACC 304",
    title: "Cost and Management Accounting",
    description:
      "Cost classification, overhead absorption, Cost-Volume-Profit (CVP) break-even analysis, budgeting, and standard costing variance analysis.",
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
  {
    id: "44444444-4444-4444-8444-444444444411",
    courseId: "33333333-3333-4333-8333-333333333304",
    name: "Axioms of Probability & Bayes' Theorem",
    slug: "axioms-and-bayes-theorem",
  },
  {
    id: "44444444-4444-4444-8444-444444444412",
    courseId: "33333333-3333-4333-8333-333333333304",
    name: "Discrete Random Variables (Binomial & Poisson)",
    slug: "discrete-random-variables",
  },
  {
    id: "44444444-4444-4444-8444-444444444413",
    courseId: "33333333-3333-4333-8333-333333333304",
    name: "Continuous Distributions & Central Limit Theorem",
    slug: "continuous-distributions-and-clt",
  },
  {
    id: "44444444-4444-4444-8444-444444444414",
    courseId: "33333333-3333-4333-8333-333333333305",
    name: "Point & Interval Estimation (MLE & Confidence Intervals)",
    slug: "point-and-interval-estimation",
  },
  {
    id: "44444444-4444-4444-8444-444444444415",
    courseId: "33333333-3333-4333-8333-333333333305",
    name: "Hypothesis Testing, Type I/II Errors & p-Values",
    slug: "hypothesis-testing-and-errors",
  },
  {
    id: "44444444-4444-4444-8444-444444444416",
    courseId: "33333333-3333-4333-8333-333333333305",
    name: "Linear Regression, Correlation & ANOVA",
    slug: "regression-and-anova",
  },
  {
    id: "44444444-4444-4444-8444-444444444417",
    courseId: "33333333-3333-4333-8333-333333333306",
    name: "Double-Entry Bookkeeping & Accounting Equation",
    slug: "double-entry-and-accounting-equation",
  },
  {
    id: "44444444-4444-4444-8444-444444444418",
    courseId: "33333333-3333-4333-8333-333333333306",
    name: "Accruals, Prepayments & Depreciation Methods",
    slug: "accruals-and-depreciation",
  },
  {
    id: "44444444-4444-4444-8444-444444444419",
    courseId: "33333333-3333-4333-8333-333333333306",
    name: "Financial Statements & IFRS Conceptual Framework",
    slug: "ifrs-and-financial-statements",
  },
  {
    id: "44444444-4444-4444-8444-444444444420",
    courseId: "33333333-3333-4333-8333-333333333307",
    name: "Cost Classification & Overhead Absorption",
    slug: "cost-classification-and-overheads",
  },
  {
    id: "44444444-4444-4444-8444-444444444421",
    courseId: "33333333-3333-4333-8333-333333333307",
    name: "Cost-Volume-Profit (CVP) & Break-Even Analysis",
    slug: "cvp-and-break-even-analysis",
  },
  {
    id: "44444444-4444-4444-8444-444444444422",
    courseId: "33333333-3333-4333-8333-333333333307",
    name: "Budgetary Control & Standard Costing Variances",
    slug: "budgeting-and-variance-analysis",
  },
];
