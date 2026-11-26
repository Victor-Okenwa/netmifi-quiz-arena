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

const SEED_COURSES: SeedCourse[] = [
  {
    code: "CSC 201",
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
];

async function runSeed() {
  console.log("🌱 Starting Netmifi Quiz Arena academic database seed...");

  // 1. Seed Nigerian Universities & default Computer Science departments
  let primaryDepartmentId: string | null = null;

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

    const [insertedDept] = await db
      .insert(departments)
      .values({
        universityId: insertedUni.id,
        name: "Department of Computer Science",
        code: "CSC",
      })
      .onConflictDoUpdate({
        target: [departments.universityId, departments.code],
        set: { name: "Department of Computer Science" },
      })
      .returning();

    if (!primaryDepartmentId && insertedDept) {
      primaryDepartmentId = insertedDept.id;
    }
  }

  console.log(
    `✅ Seeded ${NIGERIAN_UNIVERSITIES.length} Nigerian universities and Computer Science departments.`
  );

  // 2. Seed Courses, Topics, and Approved Starter Questions
  let totalTopics = 0;
  let totalQuestions = 0;

  for (const courseData of SEED_COURSES) {
    const [courseRecord] = await db
      .insert(courses)
      .values({
        departmentId: primaryDepartmentId,
        code: courseData.code,
        title: courseData.title,
        description: courseData.description,
        academicLevel: courseData.academicLevel,
      })
      .onConflictDoUpdate({
        target: courses.code,
        set: {
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

      // Check existing questions for this topic to remain idempotent
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
    `✅ Seeded ${SEED_COURSES.length} courses, ${totalTopics} topics, and ${totalQuestions} approved battle-ready questions.`
  );
  await closeDb();
}

runSeed().catch(async (err) => {
  console.error("❌ Failed to seed database:", err);
  await closeDb();
  process.exit(1);
});
