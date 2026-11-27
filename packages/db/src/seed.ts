import { eq } from "drizzle-orm";
import { closeDb, db } from "./client";
import {
  courses,
  departments,
  questionOptions,
  questions,
  topics,
  universities,
} from "./schema/index";

interface SeedQuestion {
  questionText: string;
  difficulty: "easy" | "medium" | "hard";
  correctOptionKey: "A" | "B" | "C" | "D";
  explanation: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface SeedTopic {
  name: string;
  slug: string;
  description: string;
  orderIndex: number;
  questions: SeedQuestion[];
}

interface SeedCourse {
  code: string;
  departmentCode: "CSC" | "STA" | "ACC";
  title: string;
  description: string;
  academicLevel: string;
  topics: SeedTopic[];
}

const NIGERIAN_UNIVERSITIES = [
  {
    name: "University of Lagos",
    shortCode: "UNILAG",
    country: "Nigeria",
  },
  {
    name: "University of Ibadan",
    shortCode: "UI",
    country: "Nigeria",
  },
  {
    name: "Obafemi Awolowo University",
    shortCode: "OAU",
    country: "Nigeria",
  },
  {
    name: "University of Nigeria, Nsukka",
    shortCode: "UNN",
    country: "Nigeria",
  },
  {
    name: "Federal University of Technology, Owerri",
    shortCode: "FUTO",
    country: "Nigeria",
  },
  {
    name: "Ahmadu Bello University, Zaria",
    shortCode: "ABU",
    country: "Nigeria",
  },
] as const;

const UNIVERSITY_DEPARTMENTS = [
  {
    name: "Department of Computer Science",
    code: "CSC" as const,
  },
  {
    name: "Department of Statistics",
    code: "STA" as const,
  },
  {
    name: "Department of Accountancy",
    code: "ACC" as const,
  },
] as const;

const SEED_COURSES: SeedCourse[] = [
  // =========================================================
  // 1. COMPUTER SCIENCE (CSC)
  // =========================================================
  {
    code: "CSC 201",
    departmentCode: "CSC",
    title: "Data Structures and Algorithms",
    description:
      "Fundamental data structures, asymptotic complexity, recursion, hashing, trees, and graph algorithms.",
    academicLevel: "200L",
    topics: [
      {
        name: "Arrays & Asymptotic Complexity",
        slug: "arrays-and-complexity",
        description:
          "Big-O, Big-Theta, Big-Omega notation, contiguous memory layout, and two-pointer / sliding-window techniques.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "What is the worst-case time complexity of inserting an element at index 0 of a dynamic array containing n elements?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "Inserting at index 0 of a contiguous dynamic array requires shifting all existing n elements one position to the right, taking O(n) time.",
            options: {
              A: "O(1)",
              B: "O(n)",
              C: "O(log n)",
              D: "O(n log n)",
            },
          },
          {
            questionText:
              "Why does accessing the i-th element of a 1D static array take O(1) time in random-access memory?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "Because elements are stored contiguously, the memory address of element i is computed directly via base_address + i * element_size.",
            options: {
              A: "Its memory address is computed directly using base_address + (i * element_size)",
              B: "The CPU caches every array index in registers automatically",
              C: "A binary search is executed over the array pointers",
              D: "Elements are linked via next-node memory pointers",
            },
          },
          {
            questionText:
              "If a dynamic array doubles its capacity whenever it becomes full, what is the amortized time complexity of n consecutive append operations?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "Total copy cost across n appends is 1 + 2 + 4 + ... + n < 2n, so the total work is O(n) and the amortized cost per append is O(1).",
            options: {
              A: "O(log n) per append",
              B: "O(n) per append",
              C: "O(1) amortized per append",
              D: "O(n^2) total across n appends",
            },
          },
        ],
      },
      {
        name: "Recursion & Backtracking",
        slug: "recursion-and-backtracking",
        description:
          "Base cases, call stack activation frames, recurrence relations, Master Theorem, and backtracking search.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "What happens at runtime when a recursive function lacks a reachable base case?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "Each recursive call pushes a new activation record onto the call stack until the stack memory limit is exceeded, causing a stack overflow.",
            options: {
              A: "The compiler automatically converts it into an O(1) loop",
              B: "It returns null after 256 iterations",
              C: "Heap memory is garbage-collected immediately",
              D: "The call stack exhausts available memory, resulting in a stack overflow error",
            },
          },
          {
            questionText:
              "By the Master Theorem, what is the asymptotic time complexity of the recurrence T(n) = 2T(n/2) + O(n)?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "Here a = 2, b = 2, and f(n) = O(n) = Theta(n^(log_2 2)). By Case 2 of the Master Theorem, T(n) = Theta(n log n), as in Merge Sort.",
            options: {
              A: "O(n)",
              B: "O(n log n)",
              C: "O(n^2)",
              D: "O(log n)",
            },
          },
          {
            questionText:
              "What is the auxiliary call-stack space complexity of a naive recursive Fibonacci implementation fib(n) = fib(n-1) + fib(n-2)?",
            difficulty: "hard",
            correctOptionKey: "A",
            explanation:
              "Although the total number of calls is O(2^n), the maximum depth of the recursion tree active on the call stack at any single moment is O(n).",
            options: {
              A: "O(n) because the maximum recursion depth on the call stack at one time is n",
              B: "O(2^n) because all 2^n stack frames exist simultaneously",
              C: "O(1) because primitive integers do not use stack frames",
              D: "O(log n) because the problem size halves each step",
            },
          },
        ],
      },
      {
        name: "Hash Tables & Dictionaries",
        slug: "hash-tables",
        description:
          "Hash functions, collision resolution via separate chaining and open addressing, and load factor.",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "In a hash table using separate chaining with load factor alpha = n / m, what is the expected time for an unsuccessful lookup under simple uniform hashing?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "Under simple uniform hashing, each bucket has an expected chain length of alpha = n/m, plus O(1) to compute the hash function, giving Theta(1 + alpha).",
            options: {
              A: "Theta(n log n)",
              B: "Theta(log m)",
              C: "Theta(1 + alpha)",
              D: "Theta(m^2)",
            },
          },
          {
            questionText:
              "Which collision resolution technique suffers directly from primary clustering, where long runs of occupied slots build up?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "Linear probing checks consecutive slots (h(k) + i) mod m, causing contiguous clusters of occupied slots to grow faster (primary clustering).",
            options: {
              A: "Open addressing with linear probing",
              B: "Separate chaining with doubly linked lists",
              C: "Double hashing with two independent hash functions",
              D: "Cuckoo hashing",
            },
          },
        ],
      },
      {
        name: "Trees & Graph Traversal",
        slug: "trees-and-graphs",
        description:
          "Binary Search Trees (BST), AVL/balanced trees, Breadth-First Search (BFS), and Depth-First Search (DFS).",
        orderIndex: 4,
        questions: [
          {
            questionText:
              "Which traversal of a Binary Search Tree (BST) visits the keys in non-decreasing sorted order?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "In-order traversal visits Left Subtree -> Root -> Right Subtree. By the BST property, this yields keys in sorted ascending order.",
            options: {
              A: "Pre-order traversal",
              B: "In-order traversal",
              C: "Post-order traversal",
              D: "Level-order traversal",
            },
          },
          {
            questionText:
              "Which data structure is used internally by Breadth-First Search (BFS) to explore vertices layer by layer in an unweighted graph?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "BFS uses a First-In, First-Out (FIFO) Queue so that vertices at distance d are processed before vertices at distance d + 1.",
            options: {
              A: "LIFO Stack",
              B: "Disjoint-Set Union",
              C: "FIFO Queue",
              D: "Adjacency Matrix",
            },
          },
        ],
      },
    ],
  },
  {
    code: "CSC 305",
    departmentCode: "CSC",
    title: "Database Management Systems",
    description:
      "Relational algebra, SQL, functional dependencies, normalization (1NF to BCNF), indexing, and ACID transactions.",
    academicLevel: "300L",
    topics: [
      {
        name: "Relational Model & SQL",
        slug: "relational-model-and-sql",
        description:
          "Primary and foreign keys, referential integrity, joins, aggregations, and relational algebra operations.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "Which SQL clause filters grouped rows AFTER aggregate functions such as COUNT() or AVG() have been computed?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "WHERE filters individual rows before grouping, whereas HAVING filters groups created by GROUP BY after aggregates are evaluated.",
            options: {
              A: "WHERE",
              B: "ORDER BY",
              C: "HAVING",
              D: "DISTINCT",
            },
          },
          {
            questionText:
              "What does a FOREIGN KEY constraint with ON DELETE CASCADE guarantee when a referenced parent row is deleted?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "ON DELETE CASCADE automatically deletes all dependent child rows referencing the deleted parent row to preserve referential integrity.",
            options: {
              A: "All referencing child rows are automatically deleted along with the parent row",
              B: "The parent table is dropped from the schema",
              C: "The foreign key column in child rows is converted to a primary key",
              D: "The delete transaction is always rolled back with an error",
            },
          },
        ],
      },
      {
        name: "Database Normalization (1NF–BCNF)",
        slug: "database-normalization",
        description:
          "Functional dependencies, partial and transitive dependencies, update anomalies, 1NF, 2NF, 3NF, and BCNF.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "A relation R is in Second Normal Form (2NF) if it is in 1NF and satisfies which additional condition?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "2NF eliminates partial dependencies: no non-prime attribute may be functionally dependent on only a proper subset of any candidate key.",
            options: {
              A: "It contains no foreign keys",
              B: "No non-prime attribute is partially dependent on a proper subset of a composite candidate key",
              C: "Every attribute is a candidate key",
              D: "It has at most two columns",
            },
          },
          {
            questionText:
              "Which anomaly occurs when modifying a lecturer's department name requires updating hundreds of duplicate course-enrollment tuples, risking inconsistent data?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "Storing redundant facts across multiple tuples causes an update anomaly if some tuples are updated while others retain old values.",
            options: {
              A: "Insertion anomaly",
              B: "Deletion anomaly",
              C: "Deadlock anomaly",
              D: "Update anomaly",
            },
          },
          {
            questionText:
              "For a relation R to be in Boyce-Codd Normal Form (BCNF), what must hold for every non-trivial functional dependency X -> Y?",
            difficulty: "hard",
            correctOptionKey: "A",
            explanation:
              "BCNF requires that for every non-trivial functional dependency X -> Y, the determinant X must be a superkey of R.",
            options: {
              A: "X must be a superkey of R",
              B: "Y must be a prime attribute",
              C: "X must be a single atomic column",
              D: "Y must be a foreign key",
            },
          },
        ],
      },
      {
        name: "Transactions & ACID Properties",
        slug: "transactions-and-acid",
        description:
          "Atomicity, Consistency, Isolation, Durability, concurrency anomalies, and Write-Ahead Logging (WAL).",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "In the ACID properties of database transactions, which property guarantees that either all operations of a transaction are persisted or none of them take effect?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "Atomicity ('all-or-nothing') ensures a transaction never leaves partially applied changes if it aborts or fails mid-way.",
            options: {
              A: "Atomicity",
              B: "Consistency",
              C: "Isolation",
              D: "Durability",
            },
          },
          {
            questionText:
              "Which concurrency phenomenon occurs when Transaction T1 reads uncommitted changes made by Transaction T2, and T2 subsequently rolls back?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "Reading data modified by another transaction that has not yet committed is a dirty read.",
            options: {
              A: "Phantom read",
              B: "Dirty read",
              C: "Lost update",
              D: "Write skew",
            },
          },
        ],
      },
    ],
  },
  {
    code: "CSC 309",
    departmentCode: "CSC",
    title: "Operating Systems",
    description:
      "Process management, CPU scheduling, threads, concurrency, deadlocks, memory management, and virtual memory paging.",
    academicLevel: "300L",
    topics: [
      {
        name: "Processes, Threads & Scheduling",
        slug: "processes-and-scheduling",
        description:
          "Process Control Block (PCB), kernel vs. user threads, context switching, and CPU scheduling algorithms.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "Which resources are shared among threads belonging to the same process?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "Threads within the same process share code, global data, heap memory, and open file descriptors, while each thread has its own stack and registers.",
            options: {
              A: "Program Counter (PC) and CPU registers only",
              B: "Call stack frames and thread-local registers",
              C: "Code section, global data, heap memory, and open file descriptors",
              D: "Nothing; threads have completely isolated virtual address spaces",
            },
          },
          {
            questionText:
              "Which CPU scheduling algorithm is non-preemptive and susceptible to the 'convoy effect', where short I/O-bound processes wait behind one long CPU-bound process?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "First-Come, First-Served (FCFS) processes jobs strictly in arrival order without preemption, causing short jobs to queue behind a long CPU burst.",
            options: {
              A: "First-Come, First-Served (FCFS)",
              B: "Round Robin (RR) with a small time quantum",
              C: "Shortest Remaining Time First (SRTF)",
              D: "Multilevel Feedback Queue (MLFQ)",
            },
          },
        ],
      },
      {
        name: "Deadlocks & Synchronization",
        slug: "deadlocks-and-synchronization",
        description:
          "Critical section problem, mutexes, semaphores, and Coffman's four necessary conditions for deadlock.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "Which of the following is NOT one of Coffman's four necessary conditions for a resource deadlock to occur?",
            difficulty: "medium",
            correctOptionKey: "D",
            explanation:
              "The four necessary conditions for deadlock are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemptive time-slicing is not one of them.",
            options: {
              A: "Mutual Exclusion",
              B: "Hold and Wait",
              C: "Circular Wait",
              D: "Preemptive Time-Slicing",
            },
          },
          {
            questionText:
              "How can an operating system prevent the 'Circular Wait' condition for deadlock?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "Imposing a strict global ordering on all resource types and requiring processes to request resources in increasing numerical order prevents any cycle from forming.",
            options: {
              A: "Allowing processes to request any resource in arbitrary order",
              B: "Imposing a total ordering of all resource types and requiring processes to request locks in increasing order",
              C: "Disabling all hardware interrupts permanently",
              D: "Doubling the size of the swap file",
            },
          },
        ],
      },
      {
        name: "Virtual Memory & Paging",
        slug: "virtual-memory-and-paging",
        description:
          "Page tables, Translation Lookaside Buffer (TLB), page faults, and page replacement algorithms (LRU, Optimal, FIFO).",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "What is the primary purpose of the Translation Lookaside Buffer (TLB) in a paged virtual memory system?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "The TLB is a fast hardware associative cache that stores recent virtual-to-physical page number translations so the CPU avoids accessing the page table in main memory on a TLB hit.",
            options: {
              A: "To cache recent virtual-to-physical page address translations in fast hardware",
              B: "To compress inactive files on the hard disk",
              C: "To schedule disk arm movements using elevator algorithms",
              D: "To encrypt network packets before DMA transfer",
            },
          },
          {
            questionText:
              "What term describes the severe performance degradation where a system spends more time paging memory frames in and out of disk than executing instructions?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "Thrashing occurs when the active working set of processes exceeds available physical memory frames, causing continuous page faults.",
            options: {
              A: "Internal fragmentation",
              B: "Spooling",
              C: "Thrashing",
              D: "DMA interleaving",
            },
          },
        ],
      },
    ],
  },

  // =========================================================
  // 2. STATISTICS (STA)
  // =========================================================
  {
    code: "STA 201",
    departmentCode: "STA",
    title: "Probability Theory and Distributions",
    description:
      "Sample spaces, conditional probability, Bayes' theorem, discrete and continuous random variables, expectation, and the Central Limit Theorem.",
    academicLevel: "200L",
    topics: [
      {
        name: "Axioms of Probability & Bayes' Theorem",
        slug: "axioms-and-bayes-theorem",
        description:
          "Kolmogorov axioms, conditional probability, law of total probability, independence, and Bayes' theorem.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "If two events A and B are statistically independent with P(A) = 0.4 and P(B) = 0.5, what is the probability of their union P(A U B)?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "For independent events, P(A ∩ B) = P(A)P(B) = 0.4 * 0.5 = 0.20. Thus P(A U B) = P(A) + P(B) - P(A ∩ B) = 0.4 + 0.5 - 0.2 = 0.70.",
            options: {
              A: "0.90",
              B: "0.70",
              C: "0.20",
              D: "0.50",
            },
          },
          {
            questionText:
              "If events A and B have non-zero probabilities and are mutually exclusive (disjoint), which statement is always true?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "Mutually exclusive events have P(A ∩ B) = 0, whereas independence requires P(A ∩ B) = P(A)P(B) > 0. Therefore two non-zero mutually exclusive events cannot be independent.",
            options: {
              A: "They are also statistically independent",
              B: "P(A | B) = P(A)",
              C: "They are dependent because P(A ∩ B) = 0 while P(A)P(B) > 0",
              D: "P(A U B) = P(A) * P(B)",
            },
          },
          {
            questionText:
              "In Bayes' Theorem, P(A | B) = [P(B | A) * P(A)] / P(B), what is the term P(A) called before observing evidence B?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "P(A) is the prior probability representing initial belief about event A before incorporating the likelihood P(B | A) of the observed evidence B.",
            options: {
              A: "Prior probability",
              B: "Posterior probability",
              C: "Likelihood ratio",
              D: "Marginal variance",
            },
          },
        ],
      },
      {
        name: "Discrete Random Variables (Binomial & Poisson)",
        slug: "discrete-random-variables",
        description:
          "Probability Mass Functions (PMF), Bernoulli trials, Binomial distribution, and Poisson arrival processes.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "For a random variable X following a Binomial distribution B(n = 20, p = 0.25), what are its expected value E[X] and variance Var(X)?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "For X ~ Binomial(n, p), E[X] = np = 20 * 0.25 = 5, and Var(X) = np(1 - p) = 20 * 0.25 * 0.75 = 3.75.",
            options: {
              A: "E[X] = 4.0, Var(X) = 4.0",
              B: "E[X] = 5.0, Var(X) = 5.0",
              C: "E[X] = 5.0, Var(X) = 3.75",
              D: "E[X] = 15.0, Var(X) = 3.75",
            },
          },
          {
            questionText:
              "Which unique property characterizes the mean and variance of a Poisson distribution with rate parameter lambda > 0?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "For X ~ Poisson(lambda), both the expected value E[X] and the variance Var(X) are equal to lambda (equidispersion).",
            options: {
              A: "The variance is always the square of the mean (lambda^2)",
              B: "The mean is lambda and the variance is always 1",
              C: "The variance is strictly less than the mean",
              D: "Both the mean E[X] and the variance Var(X) are equal to lambda",
            },
          },
          {
            questionText:
              "Under what asymptotic conditions does the Poisson distribution provide an accurate approximation to the Binomial distribution B(n, p)?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "By the Poisson Limit Theorem (Law of Rare Events), as n -> infinity and p -> 0 such that np = lambda remains a moderate constant, B(n, p) converges to Poisson(lambda).",
            options: {
              A: "When the number of trials n is large and the success probability p is small such that np = lambda is moderate",
              B: "When p = 0.5 and n is less than 10",
              C: "When p approaches 1 and n is small",
              D: "Only when the trials are positively correlated",
            },
          },
        ],
      },
      {
        name: "Continuous Distributions & Central Limit Theorem",
        slug: "continuous-distributions-and-clt",
        description:
          "Probability Density Functions (PDF), Cumulative Distribution Functions (CDF), Normal distribution, Z-scores, and the Central Limit Theorem.",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "For any continuous random variable X with probability density function f(x), what is the exact probability P(X = c) that X takes a single specific point value c?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "For a continuous random variable, probability is the integral of f(x) over an interval. Because the integral from c to c has zero width, P(X = c) = 0.",
            options: {
              A: "0",
              B: "f(c)",
              C: "1 / c",
              D: "0.5",
            },
          },
          {
            questionText:
              "If exam scores follow a Normal distribution with mean mu = 70 and standard deviation sigma = 10, what is the standard normal Z-score for a student who scored 85?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "The standard score is Z = (X - mu) / sigma = (85 - 70) / 10 = +1.5.",
            options: {
              A: "+0.85",
              B: "+1.50",
              C: "-1.50",
              D: "+2.25",
            },
          },
          {
            questionText:
              "According to the Central Limit Theorem, if random samples of size n are drawn from a population with mean mu and finite standard deviation sigma, what is the standard error of the sample mean X-bar?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "Var(X-bar) = sigma^2 / n, so the standard deviation (standard error) of the sampling distribution of X-bar is sigma / sqrt(n).",
            options: {
              A: "sigma / n",
              B: "sigma * sqrt(n)",
              C: "sigma / sqrt(n)",
              D: "sigma^2 / n",
            },
          },
        ],
      },
    ],
  },
  {
    code: "STA 305",
    departmentCode: "STA",
    title: "Statistical Inference and Regression Analysis",
    description:
      "Point and interval estimation, Maximum Likelihood Estimation (MLE), hypothesis testing, ANOVA, and linear regression modeling.",
    academicLevel: "300L",
    topics: [
      {
        name: "Point & Interval Estimation (MLE & Confidence Intervals)",
        slug: "point-and-interval-estimation",
        description:
          "Unbiasedness, consistency, efficiency, Maximum Likelihood Estimation, and confidence interval construction.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "When is a sample statistic theta-hat defined as an unbiased estimator of a population parameter theta?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "An estimator theta-hat is unbiased if the expected value of its sampling distribution equals the true parameter value: E[theta-hat] = theta.",
            options: {
              A: "When E[theta-hat] = theta",
              B: "When Var(theta-hat) = 0 for all sample sizes",
              C: "When theta-hat is always greater than theta",
              D: "When the sample size n equals the population size N",
            },
          },
          {
            questionText:
              "Why do we divide by (n - 1) instead of n when computing the unbiased sample variance s^2 from a sample whose mean X-bar is estimated from the same data?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "Estimating the mean X-bar imposes one linear constraint sum(X_i - X-bar) = 0, leaving (n - 1) degrees of freedom (Bessel's correction) so that E[s^2] = sigma^2.",
            options: {
              A: "To make the standard deviation smaller than the population variance",
              B: "To correct for the loss of 1 degree of freedom from estimating the mean X-bar (Bessel's correction)",
              C: "Because the first observation in every sample is discarded",
              D: "To convert a discrete variable into a continuous variable",
            },
          },
          {
            questionText:
              "Holding the sample standard deviation and sample size constant, how does increasing the confidence level from 95% to 99% affect the width of a confidence interval for the population mean?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "A 99% confidence level requires a larger critical value (e.g. z = 2.576 vs 1.960), which increases the margin of error and makes the interval wider.",
            options: {
              A: "The interval becomes narrower",
              B: "The interval width remains unchanged",
              C: "The interval width is cut in half",
              D: "The interval becomes wider because the critical value increases",
            },
          },
        ],
      },
      {
        name: "Hypothesis Testing, Type I/II Errors & p-Values",
        slug: "hypothesis-testing-and-errors",
        description:
          "Null and alternative hypotheses, significance level alpha, statistical power (1 - beta), p-values, t-tests, and chi-square tests.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "In statistical hypothesis testing, what is a Type I Error?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "A Type I error (false positive, probability alpha) occurs when the researcher rejects the null hypothesis H_0 when H_0 is actually true.",
            options: {
              A: "Rejecting the null hypothesis H_0 when H_0 is actually true",
              B: "Failing to reject the null hypothesis H_0 when H_0 is false",
              C: "Accepting the alternative hypothesis when H_1 is true",
              D: "Choosing a sample size that is too large",
            },
          },
          {
            questionText:
              "If the probability of committing a Type II error in a clinical trial is beta = 0.15, what is the statistical power of the test?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "Statistical power is the probability of correctly rejecting a false null hypothesis, equal to 1 - beta = 1 - 0.15 = 0.85 (or 85%).",
            options: {
              A: "0.15",
              B: "0.05",
              C: "0.85",
              D: "0.95",
            },
          },
          {
            questionText:
              "If a hypothesis test performed at significance level alpha = 0.05 yields a p-value of 0.012, what is the appropriate statistical decision?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "Because p-value (0.012) <= alpha (0.05), the observed test statistic falls in the rejection region, so we reject the null hypothesis H_0.",
            options: {
              A: "Fail to reject H_0 because p < alpha",
              B: "Reject the null hypothesis H_0 at the 5% significance level",
              C: "Increase alpha to 0.50 and re-run the experiment",
              D: "Conclude that the null hypothesis is 98.8% true",
            },
          },
        ],
      },
      {
        name: "Linear Regression, Correlation & ANOVA",
        slug: "regression-and-anova",
        description:
          "Pearson correlation coefficient r, Ordinary Least Squares (OLS) regression, R-squared, and Analysis of Variance (ANOVA).",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "In a simple linear regression model, if the Coefficient of Determination is R^2 = 0.81, what is the correct interpretation?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "R^2 = SSR / SST measures the proportion of total variance in the dependent variable Y that is explained by the linear regression model on X (81%).",
            options: {
              A: "The slope of the regression line is exactly 0.81",
              B: "81% of the total variation in the dependent variable Y is explained by the predictor X",
              C: "81% of the data points lie exactly on the regression line",
              D: "The residuals have a mean of 0.81",
            },
          },
          {
            questionText:
              "What objective function does Ordinary Least Squares (OLS) minimize when fitting a linear regression line y-hat = beta_0 + beta_1 * x?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "OLS chooses parameter estimates that minimize the Residual Sum of Squares: sum_{i=1}^n (y_i - y-hat_i)^2.",
            options: {
              A: "The sum of the raw residuals sum(y_i - y-hat_i)",
              B: "The sum of the predictor values sum(x_i^2)",
              C: "The sum of squared vertical residuals sum((y_i - y-hat_i)^2)",
              D: "The product of the intercept and slope",
            },
          },
          {
            questionText:
              "In a One-Way Analysis of Variance (ANOVA) comparing k group means, how is the F-test statistic calculated?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "The ANOVA F-statistic is the ratio of Mean Square Between groups (MSB) to Mean Square Within groups / error (MSW): F = MSB / MSW.",
            options: {
              A: "Mean Square Between groups divided by Mean Square Within groups (MSB / MSW)",
              B: "Total Sum of Squares divided by sample size n",
              C: "Largest group mean minus smallest group mean",
              D: "Within-group degrees of freedom divided by between-group degrees of freedom",
            },
          },
        ],
      },
    ],
  },

  // =========================================================
  // 3. ACCOUNTANCY (ACC)
  // =========================================================
  {
    code: "ACC 201",
    departmentCode: "ACC",
    title: "Principles of Financial Accounting & IFRS",
    description:
      "Double-entry bookkeeping, the accounting equation, trial balance, accrual adjustments, depreciation, bank reconciliation, and IAS/IFRS financial statements.",
    academicLevel: "200L",
    topics: [
      {
        name: "Double-Entry Bookkeeping & Accounting Equation",
        slug: "double-entry-and-accounting-equation",
        description:
          "Assets, liabilities, equity, normal debit and credit balances, books of prime entry, and trial balance errors.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "Which equation correctly expresses the Fundamental Accounting Equation on a Statement of Financial Position?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "Every entity's resources (Assets) are financed either by external creditors (Liabilities) or owners' claims (Equity): Assets = Liabilities + Equity.",
            options: {
              A: "Assets = Liabilities + Owner's Equity",
              B: "Assets + Liabilities = Owner's Equity",
              C: "Assets = Revenue - Expenses",
              D: "Liabilities = Assets + Retained Earnings",
            },
          },
          {
            questionText:
              "Under double-entry accounting rules, which pair of accounts both carry a normal DEBIT balance?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "In the DEALER mnemonic, Dividends/Drawings, Expenses, and Assets have normal DEBIT balances, while Liabilities, Equity, and Revenue have normal CREDIT balances.",
            options: {
              A: "Trade Payables and Sales Revenue",
              B: "Share Capital and Accumulated Depreciation",
              C: "Property, Plant & Equipment (Assets) and Operating Expenses",
              D: "Retained Earnings and Bank Overdraft",
            },
          },
          {
            questionText:
              "Which of the following bookkeeping errors WILL NOT cause the Trial Balance totals (Debit vs. Credit) to disagree?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "An Error of Principle (e.g. debiting Motor Repairs Expense instead of Motor Vehicles Asset for a capital purchase) enters equal debit and credit amounts, so the Trial Balance still balances.",
            options: {
              A: "Posting only the debit leg of a transaction and omitting the credit leg",
              B: "An Error of Principle, such as debiting Repairs Expense instead of Motor Vehicles Asset for the purchase of a delivery van",
              C: "Entering N54,000 on the debit side and N45,000 on the credit side",
              D: "Miscasting (mis-adding) the Sales Day Book total transferred to the general ledger",
            },
          },
        ],
      },
      {
        name: "Accruals, Prepayments & Depreciation Methods",
        slug: "accruals-and-depreciation",
        description:
          "Accrual vs. cash basis, matching concept, prepaid expenses, accrued revenues, straight-line and reducing-balance depreciation.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "A company purchases equipment for N1,200,000 with an estimated residual value of N200,000 and a useful life of 5 years. What is the annual depreciation expense using the Straight-Line method?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "Depreciable amount = Cost - Residual Value = 1,200,000 - 200,000 = N1,000,000. Annual Straight-Line depreciation = 1,000,000 / 5 = N200,000 per year.",
            options: {
              A: "N240,000",
              B: "N280,000",
              C: "N200,000",
              D: "N180,000",
            },
          },
          {
            questionText:
              "At the end of the financial year, a business has unpaid electricity bills of N85,000 incurred during December. How is this accrued expense treated in the year-end financial statements?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "Under the accrual/matching concept, the N85,000 is debited to Electricity Expense (increasing expenses in Profit or Loss) and credited to Accrued Expenses (a Current Liability on the Statement of Financial Position).",
            options: {
              A: "Added to Electricity Expense in Profit or Loss and recognized as a Current Liability on the Statement of Financial Position",
              B: "Deducted from Electricity Expense and recorded as a Current Asset",
              C: "Ignored completely until cash is paid in January",
              D: "Credited directly to Share Capital",
            },
          },
          {
            questionText:
              "Which accounting principle requires that expenses incurred in generating revenue must be recognized in the same accounting period as the related revenue?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "The Matching Principle (accrual concept) dictates that expenses are matched against the revenues they helped generate within the same reporting period.",
            options: {
              A: "Materiality concept",
              B: "Money measurement concept",
              C: "Historical cost convention",
              D: "Matching (Accrual) principle",
            },
          },
        ],
      },
      {
        name: "Financial Statements & IFRS Conceptual Framework",
        slug: "ifrs-and-financial-statements",
        description:
          "IAS 1 financial statements, IAS 2 inventories (Cost vs. NRV), IAS 7 cash flows, and bank reconciliation statements.",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "Under IAS 2 (Inventories), how must closing inventory be measured on the Statement of Financial Position?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "IAS 2 requires inventories to be measured at the lower of Cost and Net Realizable Value (NRV), reflecting prudence when inventory value declines.",
            options: {
              A: "At the higher of Cost and Replacement Value",
              B: "At the lower of Cost and Net Realizable Value (NRV)",
              C: "At expected retail selling price plus 20% markup",
              D: "At historical cost regardless of obsolescence or damage",
            },
          },
          {
            questionText:
              "When preparing a Bank Reconciliation Statement starting from the adjusted Cash Book balance, how are Unpresented Cheques and Uncredited Lodgements treated?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "Starting from the adjusted Cash Book debit balance, Unpresented Cheques (already deducted in Cash Book but not yet cleared by bank) are ADDED, while Uncredited Lodgements (already added in Cash Book but not yet credited by bank) are DEDUCTED to arrive at the Bank Statement balance.",
            options: {
              A: "Add Unpresented Cheques and deduct Uncredited Lodgements",
              B: "Deduct Unpresented Cheques and add Uncredited Lodgements",
              C: "Record both as expenses in the Statement of Profit or Loss",
              D: "Add both to the Cash Book balance before adjusting for bank charges",
            },
          },
          {
            questionText:
              "Under the IASB Conceptual Framework for Financial Reporting, what are the two FUNDAMENTAL qualitative characteristics of useful financial information?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "The two fundamental qualitative characteristics are Relevance and Faithful Representation (while Comparability, Verifiability, Timeliness, and Understandability are enhancing characteristics).",
            options: {
              A: "Timeliness and Comparability",
              B: "Prudence and Historical Cost",
              C: "Relevance and Faithful Representation",
              D: "Uniformity and Cash Realization",
            },
          },
        ],
      },
    ],
  },
  {
    code: "ACC 304",
    departmentCode: "ACC",
    title: "Cost and Management Accounting",
    description:
      "Cost classification, overhead absorption, Cost-Volume-Profit (CVP) break-even analysis, budgeting, and standard costing variance analysis.",
    academicLevel: "300L",
    topics: [
      {
        name: "Cost Classification & Overhead Absorption",
        slug: "cost-classification-and-overheads",
        description:
          "Prime cost, conversion cost, fixed vs. variable costs, marginal vs. absorption costing, and overhead absorption rates.",
        orderIndex: 1,
        questions: [
          {
            questionText:
              "In manufacturing cost accounting, which components combine to form Prime Cost?",
            difficulty: "easy",
            correctOptionKey: "A",
            explanation:
              "Prime Cost is the sum of all direct production costs: Direct Materials + Direct Labour + Direct Expenses.",
            options: {
              A: "Direct Materials + Direct Labour + Direct Expenses",
              B: "Direct Labour + Factory Overheads + Administrative Expenses",
              C: "Fixed Factory Overheads + Selling and Distribution Costs",
              D: "Opening Work-in-Progress + Closing Finished Goods",
            },
          },
          {
            questionText:
              "A factory budgeted N4,500,000 in fixed production overheads for 15,000 machine hours. Actual machine hours worked were 16,000 hours and actual overheads incurred were N4,650,000. What is the overhead absorption variance?",
            difficulty: "hard",
            correctOptionKey: "B",
            explanation:
              "Overhead Absorption Rate (OAR) = 4,500,000 / 15,000 = N300 per machine hour. Absorbed overhead = 16,000 * 300 = N4,800,000. Since Absorbed (4,800,000) > Actual (4,650,000), overheads are OVER-absorbed by N150,000.",
            options: {
              A: "N150,000 Under-absorbed",
              B: "N150,000 Over-absorbed",
              C: "N300,000 Over-absorbed",
              D: "N300,000 Under-absorbed",
            },
          },
          {
            questionText:
              "How does a strictly fixed production cost behave as production volume increases within the relevant range?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "Within the relevant range, total fixed cost remains constant while fixed cost per unit decreases as output volume increases.",
            options: {
              A: "Total fixed cost increases proportionally while fixed cost per unit stays constant",
              B: "Both total fixed cost and fixed cost per unit remain constant",
              C: "Total fixed cost decreases while fixed cost per unit increases",
              D: "Total fixed cost remains constant while fixed cost per unit decreases",
            },
          },
        ],
      },
      {
        name: "Cost-Volume-Profit (CVP) & Break-Even Analysis",
        slug: "cvp-and-break-even-analysis",
        description:
          "Contribution margin, P/V ratio, break-even point in units and revenue, target profit, and margin of safety.",
        orderIndex: 2,
        questions: [
          {
            questionText:
              "A product sells for N5,000 per unit with variable cost of N3,000 per unit. If total fixed costs are N1,400,000, what is the Break-Even Point in units?",
            difficulty: "easy",
            correctOptionKey: "B",
            explanation:
              "Contribution Margin per unit = Selling Price - Variable Cost = 5,000 - 3,000 = N2,000. Break-Even Point (units) = Fixed Costs / Contribution per unit = 1,400,000 / 2,000 = 700 units.",
            options: {
              A: "280 units",
              B: "700 units",
              C: "467 units",
              D: "1,000 units",
            },
          },
          {
            questionText:
              "In Cost-Volume-Profit (CVP) analysis, what does the Margin of Safety measure?",
            difficulty: "easy",
            correctOptionKey: "C",
            explanation:
              "Margin of Safety = Budgeted (or Actual) Sales - Break-Even Sales, measuring how much sales can fall before the business begins incurring a loss.",
            options: {
              A: "The excess of total fixed costs over total variable costs",
              B: "The minimum cash balance required in the bank account",
              C: "The amount by which actual or budgeted sales exceed break-even sales before a loss is incurred",
              D: "The ratio of net profit to total assets",
            },
          },
          {
            questionText:
              "If a product has a Selling Price of N2,500 and a Variable Cost of N1,500, what is its Contribution-to-Sales (C/S or P/V) ratio?",
            difficulty: "medium",
            correctOptionKey: "A",
            explanation:
              "Contribution per unit = 2,500 - 1,500 = N1,000. C/S Ratio = (1,000 / 2,500) * 100% = 40%.",
            options: {
              A: "40%",
              B: "60%",
              C: "66.7%",
              D: "25%",
            },
          },
        ],
      },
      {
        name: "Budgetary Control & Standard Costing Variances",
        slug: "budgeting-and-variance-analysis",
        description:
          "Flexible vs. static budgets, standard costing, direct material price and usage variances, and direct labour rate and efficiency variances.",
        orderIndex: 3,
        questions: [
          {
            questionText:
              "Why is a Flexible Budget preferred over a Static (Fixed) Master Budget when evaluating a production manager's cost control performance at the end of a period?",
            difficulty: "medium",
            correctOptionKey: "C",
            explanation:
              "A flexible budget restates budgeted costs for the ACTUAL activity level achieved, separating volume effects from true price and efficiency variances.",
            options: {
              A: "Because a flexible budget ignores all variable costs",
              B: "Because a flexible budget is prepared only once every five years",
              C: "Because it adjusts budgeted costs to the actual output level achieved, allowing a fair 'like-for-like' cost comparison",
              D: "Because it guarantees all variances will be favorable",
            },
          },
          {
            questionText:
              "Standard material price is N400 per kg. During the month, 2,000 kg of material were purchased and used at an actual price of N430 per kg. What is the Direct Material Price Variance?",
            difficulty: "medium",
            correctOptionKey: "B",
            explanation:
              "Material Price Variance = (Standard Price - Actual Price) * Actual Quantity = (400 - 430) * 2,000 = -N60,000 (N60,000 Adverse / Unfavorable because actual price exceeded standard price).",
            options: {
              A: "N60,000 Favorable",
              B: "N60,000 Adverse (Unfavorable)",
              C: "N30,000 Adverse (Unfavorable)",
              D: "N86,000 Favorable",
            },
          },
          {
            questionText:
              "Which variance measures the difference between the standard hours allowed for actual output and the actual hours worked, valued at the standard labour rate?",
            difficulty: "easy",
            correctOptionKey: "D",
            explanation:
              "Direct Labour Efficiency Variance = (Standard Hours for actual output - Actual Hours worked) * Standard Rate per hour.",
            options: {
              A: "Direct Labour Rate Variance",
              B: "Idle Time Price Variance",
              C: "Fixed Overhead Volume Variance",
              D: "Direct Labour Efficiency Variance",
            },
          },
        ],
      },
    ],
  },
];

async function runSeed() {
  console.log("🌱 Starting Netmifi Quiz Arena academic database seed...");

  // 1. Seed Nigerian Universities & all 3 Departments (CSC, STA, ACC) per university
  const primaryDepartmentIdsByCode: Partial<
    Record<"CSC" | "STA" | "ACC", string>
  > = {};

  for (const uni of NIGERIAN_UNIVERSITIES) {
    const [insertedUni] = await db
      .insert(universities)
      .values({
        name: uni.name,
        shortCode: uni.shortCode,
        country: uni.country,
      })
      .onConflictDoUpdate({
        target: universities.shortCode,
        set: { name: uni.name },
      })
      .returning();

    if (!insertedUni) continue;

    for (const dept of UNIVERSITY_DEPARTMENTS) {
      const [insertedDept] = await db
        .insert(departments)
        .values({
          universityId: insertedUni.id,
          name: dept.name,
          code: dept.code,
        })
        .onConflictDoUpdate({
          target: [departments.universityId, departments.code],
          set: { name: dept.name },
        })
        .returning();

      if (!primaryDepartmentIdsByCode[dept.code] && insertedDept) {
        primaryDepartmentIdsByCode[dept.code] = insertedDept.id;
      }
    }
  }

  console.log(
    `✅ Seeded ${NIGERIAN_UNIVERSITIES.length} Nigerian universities with ${UNIVERSITY_DEPARTMENTS.length} departments each (Computer Science, Statistics, Accountancy).`
  );

  // 2. Seed Courses, Topics, and Approved Questions
  let totalTopics = 0;
  let totalQuestions = 0;

  for (const courseData of SEED_COURSES) {
    const deptId =
      primaryDepartmentIdsByCode[courseData.departmentCode] ?? null;

    const [courseRecord] = await db
      .insert(courses)
      .values({
        departmentId: deptId,
        code: courseData.code,
        title: courseData.title,
        description: courseData.description,
        academicLevel: courseData.academicLevel,
      })
      .onConflictDoUpdate({
        target: courses.code,
        set: {
          departmentId: deptId,
          title: courseData.title,
          description: courseData.description,
          academicLevel: courseData.academicLevel,
        },
      })
      .returning();

    if (!courseRecord) continue;

    for (const topicData of courseData.topics) {
      totalTopics += 1;

      const [topicRecord] = await db
        .insert(topics)
        .values({
          courseId: courseRecord.id,
          name: topicData.name,
          slug: topicData.slug,
          description: topicData.description,
          orderIndex: topicData.orderIndex,
        })
        .onConflictDoUpdate({
          target: [topics.courseId, topics.slug],
          set: {
            name: topicData.name,
            description: topicData.description,
            orderIndex: topicData.orderIndex,
          },
        })
        .returning();

      if (!topicRecord) continue;

      const existingQuestions = await db
        .select({
          id: questions.id,
          questionText: questions.questionText,
        })
        .from(questions)
        .where(eq(questions.topicId, topicRecord.id));

      const existingTextSet = new Set(
        existingQuestions.map((q) => q.questionText)
      );

      for (const qData of topicData.questions) {
        totalQuestions += 1;
        if (existingTextSet.has(qData.questionText)) {
          continue;
        }

        const [insertedQuestion] = await db
          .insert(questions)
          .values({
            courseId: courseRecord.id,
            topicId: topicRecord.id,
            questionText: qData.questionText,
            difficulty: qData.difficulty,
            correctOptionKey: qData.correctOptionKey,
            explanation: qData.explanation,
            approvalStatus: "approved",
            reviewedAt: new Date(),
          })
          .returning();

        if (!insertedQuestion) continue;

        const optionRows = (["A", "B", "C", "D"] as const).map((key) => ({
          questionId: insertedQuestion.id,
          optionKey: key,
          optionText: qData.options[key],
        }));

        await db
          .insert(questionOptions)
          .values(optionRows)
          .onConflictDoNothing();
      }
    }
  }

  console.log(
    `✅ Seeded ${SEED_COURSES.length} courses, ${totalTopics} topics, and ${totalQuestions} approved battle-ready questions across CSC, STA, and ACC.`
  );
  await closeDb();
}

runSeed().catch(async (err) => {
  console.error("❌ Failed to seed database:", err);
  await closeDb();
  process.exit(1);
});
