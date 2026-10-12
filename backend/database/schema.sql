-- Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT '',
    role ENUM('admin', 'user') DEFAULT 'user',
    avatar_color VARCHAR(20) DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    subject VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    date VARCHAR(20) NOT NULL,
    session_type VARCHAR(50) DEFAULT 'focus',
    notes TEXT,
    rating INT DEFAULT 0,
    completed INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(20) NOT NULL,
    icon VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_note (subject_id, title)
);

CREATE TABLE IF NOT EXISTS video_lectures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    duration VARCHAR(20),
    watched INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_video (subject_id, title)
);

CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    unlocked_at DATETIME
);

CREATE TABLE IF NOT EXISTS daily_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date VARCHAR(20) NOT NULL UNIQUE,
    target_minutes INT NOT NULL DEFAULT 120
);

-- Seed: Subjects
INSERT IGNORE INTO subjects (name, color, icon) VALUES
    ('Mathematics', '#6366f1', 'M'),
    ('Computer Science', '#10b981', 'CS'),
    ('English', '#ec4899', 'E'),
    ('Database Management System', '#0ea5e9', 'DB'),
    ('Web Technologies', '#f43f5e', 'WT'),
    ('Design & Analysis of Algorithms', '#8b5cf6', 'DA'),
    ('Foundation of Artificial Intelligence', '#f97316', 'AI'),
    ('Optimization Theory', '#14b8a6', 'OT'),
    ('Cloud Computing', '#3b82f6', 'CC'),
    ('Software Engineering', '#a855f7', 'SE');

-- Seed: Video Lectures

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(1,'Essence of Linear Algebra','https://www.youtube.com/embed/fNk_zzaMoSs','15:42'),
(1,'Essence of Calculus','https://www.youtube.com/embed/WUvTyaaNkzM','17:04'),
(1,'Differential Equations Overview','https://www.youtube.com/embed/p_di4Zn4wz4','16:50'),
(1,'Probability & Statistics Fundamentals','https://www.youtube.com/embed/uzkc-qNVoOk','33:27'),
(1,'Discrete Mathematics Introduction','https://www.youtube.com/embed/tyDKR4FG3Yw','48:10'),
(1,'Complex Numbers Visualized','https://www.youtube.com/embed/5PcpBw5Hbwo','13:03'),
(1,'Fourier Transform Intuition','https://www.youtube.com/embed/spUNpyF58BY','20:57'),
(1,'Graph Theory Fundamentals','https://www.youtube.com/embed/LFKZLXB-XR4','22:15');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(2,'Introduction to Computer Science - CS50','https://www.youtube.com/embed/3LPJfIKxwWc','2:05:07'),
(2,'Data Structures Full Course','https://www.youtube.com/embed/RBSGKlAvoiM','8:13:14'),
(2,'Algorithms & Complexity Analysis','https://www.youtube.com/embed/8hly31xKli0','5:22:08'),
(2,'Operating Systems Concepts','https://www.youtube.com/embed/26QPDBe-NB8','35:24'),
(2,'Computer Networks Crash Course','https://www.youtube.com/embed/qiQR5rTSshw','46:19'),
(2,'Object-Oriented Programming Explained','https://www.youtube.com/embed/pTB0EiLXUC8','1:02:39'),
(2,'Compiler Design Basics','https://www.youtube.com/embed/wSdV1M7n4gQ','25:33'),
(2,'Theory of Computation Introduction','https://www.youtube.com/embed/58N2N7zJGrQ','42:16'),
(2,'Python Full Course for Beginners','https://www.youtube.com/embed/rfscVS0vtbw','4:26:52');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(3,'Technical Writing for Engineers','https://www.youtube.com/embed/SbZCECvoaTA','18:29'),
(3,'Academic Writing & Research Papers','https://www.youtube.com/embed/vtIzMaLkCaM','23:44'),
(3,'Presentation Skills Masterclass','https://www.youtube.com/embed/Iwpi1Lm6dFo','48:52'),
(3,'Business Communication Essentials','https://www.youtube.com/embed/HAnw168huqA','31:07'),
(3,'English Grammar Mastery','https://www.youtube.com/embed/LBPRMwSMHnQ','2:31:48'),
(3,'Professional Email Writing','https://www.youtube.com/embed/zcOgwN0j0O4','14:55'),
(3,'Report Writing Techniques','https://www.youtube.com/embed/PnVMNbYdfhw','22:18'),
(3,'Critical Reading & Analysis','https://www.youtube.com/embed/LfaMVlDaQ24','20:33');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(4,'Introduction to DBMS & Data Models','https://www.youtube.com/embed/6Iu45VZGQDk','52:34'),
(4,'Entity-Relationship Modeling','https://www.youtube.com/embed/QpdhBUYk7Kk','33:12'),
(4,'Relational Algebra & Calculus','https://www.youtube.com/embed/0ZHH0Qlg39E','28:45'),
(4,'SQL Fundamentals - DDL, DML & Queries','https://www.youtube.com/embed/HXV3zeQKqGY','4:20:37'),
(4,'Normalization - 1NF to BCNF','https://www.youtube.com/embed/GFQaEYEc8_8','42:18'),
(4,'Transaction Management & ACID','https://www.youtube.com/embed/5ZjhNTM8XU8','26:33'),
(4,'Indexing & Query Optimization','https://www.youtube.com/embed/HubezKbFL7E','35:10'),
(4,'NoSQL Databases Overview','https://www.youtube.com/embed/xQnIN9bW0og','38:22'),
(4,'Database Design Full Course','https://www.youtube.com/embed/ztHopE5Wnpc','8:07:42'),
(4,'MySQL Full Course for Beginners','https://www.youtube.com/embed/5OdVJbNCSso','3:08:20');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(5,'HTML & CSS Full Course','https://www.youtube.com/embed/G3e-cpL7ofc','6:31:00'),
(5,'CSS3 Flexbox & Grid Layouts','https://www.youtube.com/embed/JJSoEo8JSnc','1:26:17'),
(5,'JavaScript Full Course','https://www.youtube.com/embed/EerdGm-ehJQ','8:01:17'),
(5,'DOM Manipulation & Events','https://www.youtube.com/embed/y17RuWkWdn8','1:38:22'),
(5,'React.js Full Course','https://www.youtube.com/embed/bMknfKXIFA8','11:55:27'),
(5,'Node.js & Express.js Full Course','https://www.youtube.com/embed/Oe421EPjeBE','8:16:47'),
(5,'REST API Design Principles','https://www.youtube.com/embed/fgTGADljAeg','12:36'),
(5,'Web Security - XSS, CSRF & CORS','https://www.youtube.com/embed/EoaDgUgS6QA','40:15'),
(5,'TypeScript for Beginners','https://www.youtube.com/embed/BwuLxPH8IDs','1:34:52');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(6,'Algorithm Analysis & Asymptotic Notation','https://www.youtube.com/embed/0IAPZzGSbME','18:16'),
(6,'Divide and Conquer - Merge Sort & Quick Sort','https://www.youtube.com/embed/rE-hTai7Dxo','24:38'),
(6,'Greedy Algorithms - Huffman, Kruskal, Prim','https://www.youtube.com/embed/ARvQcqJ_-NY','33:45'),
(6,'Dynamic Programming - Principles & Examples','https://www.youtube.com/embed/oBt53YbR9Kk','5:45:23'),
(6,'Graph Algorithms - BFS, DFS & Dijkstra','https://www.youtube.com/embed/tWVWeAqZ0WU','44:16'),
(6,'Backtracking - N-Queens & Sudoku Solver','https://www.youtube.com/embed/DKCbsiDBN6c','28:33'),
(6,'String Matching - KMP & Rabin-Karp','https://www.youtube.com/embed/V5-7GzOfADQ','36:50'),
(6,'NP-Completeness & Approximation','https://www.youtube.com/embed/eHZifpgyH_4','52:17'),
(6,'Amortized Analysis','https://www.youtube.com/embed/T7W5E-5mljc','30:42'),
(6,'Randomized Algorithms','https://www.youtube.com/embed/Hoixgm4-P4M','27:55');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(7,'Introduction to AI & Intelligent Agents','https://www.youtube.com/embed/JMUxmLyrhSk','48:33'),
(7,'Search Algorithms - BFS, DFS, A*','https://www.youtube.com/embed/pcKY4hjDrxk','35:22'),
(7,'Adversarial Search & Game Playing','https://www.youtube.com/embed/STjW3eH0Cik','29:40'),
(7,'Knowledge Representation & Reasoning','https://www.youtube.com/embed/LqGQgiNQ_TI','42:18'),
(7,'Probabilistic Reasoning & Bayesian Networks','https://www.youtube.com/embed/T2xRyrKLPYs','38:55'),
(7,'Machine Learning Fundamentals','https://www.youtube.com/embed/ukzFI9rgwfU','55:10'),
(7,'Neural Networks & Deep Learning','https://www.youtube.com/embed/aircAruvnKk','19:13'),
(7,'Natural Language Processing Basics','https://www.youtube.com/embed/fOvTtapxa9c','46:22'),
(7,'Reinforcement Learning Overview','https://www.youtube.com/embed/2pWv7GOvuf0','1:09:44'),
(7,'AI Ethics & Responsible AI','https://www.youtube.com/embed/aGwYtUzMQUk','33:08');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(8,'Introduction to Optimization','https://www.youtube.com/embed/Bfmg4VNV4bc','34:18'),
(8,'Linear Programming & Formulation','https://www.youtube.com/embed/E72DWgKP_1Y','45:22'),
(8,'Simplex Method Step by Step','https://www.youtube.com/embed/t0NkCDigq34','38:17'),
(8,'Duality Theory in Optimization','https://www.youtube.com/embed/yU8updOR87c','30:55'),
(8,'Integer & Mixed-Integer Programming','https://www.youtube.com/embed/MDuKC2pJKOc','42:33'),
(8,'Nonlinear Optimization Methods','https://www.youtube.com/embed/sDv4f4s2SB8','28:44'),
(8,'Convex Optimization Fundamentals','https://www.youtube.com/embed/McLq1hEq3UY','1:15:26'),
(8,'Gradient Descent & Variants','https://www.youtube.com/embed/IHZwWFHWa-w','21:59'),
(8,'Constrained Optimization - KKT','https://www.youtube.com/embed/uh1Dk68cfWs','35:40'),
(8,'Metaheuristic Algorithms - GA & PSO','https://www.youtube.com/embed/cxweRkzaLOY','47:12');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(9,'Cloud Computing Fundamentals','https://www.youtube.com/embed/M988_fsOSt0','42:55'),
(9,'Virtualization & Hypervisors','https://www.youtube.com/embed/FZR0rG3HKIk','18:33'),
(9,'Cloud Service Models - IaaS, PaaS, SaaS','https://www.youtube.com/embed/36zducUX16w','25:17'),
(9,'AWS Core Services Overview','https://www.youtube.com/embed/ulprqHHWlng','3:22:45'),
(9,'Docker Containerization Guide','https://www.youtube.com/embed/fqMOX6JJhGo','2:10:33'),
(9,'Kubernetes & Orchestration','https://www.youtube.com/embed/X48VuDVv0do','3:36:18'),
(9,'Serverless Architecture & Lambda','https://www.youtube.com/embed/97q30JjEq9Y','55:22'),
(9,'Cloud Security & Compliance','https://www.youtube.com/embed/Ia-UEYYR44s','38:44'),
(9,'Multi-Cloud & Hybrid Strategies','https://www.youtube.com/embed/qkj5W98Xdz4','28:18'),
(9,'Cloud Cost Optimization & FinOps','https://www.youtube.com/embed/W3fGsSjh1ek','33:50');

INSERT IGNORE INTO video_lectures (subject_id, title, url, duration) VALUES
(10,'Software Development Life Cycle','https://www.youtube.com/embed/Fi3_BjVzpqk','35:22'),
(10,'Agile & Scrum Deep Dive','https://www.youtube.com/embed/9TycLR0TqFA','1:02:18'),
(10,'Requirements Engineering','https://www.youtube.com/embed/VGdhlQlFhb4','28:44'),
(10,'Design Patterns - GOF','https://www.youtube.com/embed/tv-_1er1mWI','1:40:33'),
(10,'Git & Version Control Mastery','https://www.youtube.com/embed/RGOj5yH7evk','1:08:15'),
(10,'Software Testing & TDD','https://www.youtube.com/embed/Jv2uxzhPFl4','45:55'),
(10,'CI/CD Pipeline with GitHub Actions','https://www.youtube.com/embed/R8_veQiYBjI','32:18'),
(10,'Software Architecture Patterns','https://www.youtube.com/embed/lTAcCNbJ7KE','52:40');

-- Seed: Notes
INSERT IGNORE INTO notes (subject_id, title, content) VALUES
(1,'Linear Algebra Key Concepts','Vectors, matrices, determinants, eigenvalues/eigenvectors. Key operations: dot product, cross product, matrix multiplication. Applications in computer graphics, ML, and signal processing. Remember: Ax = λx defines eigenvalue problems.'),
(1,'Calculus Quick Reference','Limits, Derivatives, Integrals. Chain rule: d/dx[f(g(x))] = f\'(g(x)) g\'(x). Integration by parts. Taylor series: f(x) = Sigma f(n)(a)/n! (x-a)^n.'),
(2,'Data Structures Comparison','Array: O(1) access, O(n) insert. LinkedList: O(n) access, O(1) insert. HashMap: O(1) avg lookup. BST: O(log n) search/insert. Heap: O(1) min/max, O(log n) insert. Choose based on operation frequency.'),
(2,'Complexity Classes Summary','P: solvable in polynomial time. NP: verifiable in polynomial time. NP-Complete: hardest in NP (SAT, TSP). NP-Hard: at least as hard as NP-Complete. P vs NP remains the biggest open question in CS.'),
(3,'Technical Report Structure','Title Page, Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References, Appendix. Keep sentences concise. Use active voice. Define acronyms on first use.'),
(3,'Common Grammar Pitfalls','Affect (verb) vs Effect (noun). Its (possessive) vs It\'s (contraction). Their/There/They\'re. Fewer (countable) vs Less (uncountable). Subject-verb agreement with collective nouns.'),
(4,'Normalization Forms Cheatsheet','1NF: Atomic values, no repeating groups. 2NF: 1NF + no partial dependencies. 3NF: 2NF + no transitive dependencies. BCNF: Every determinant is a candidate key. Higher forms rarely used in practice.'),
(4,'SQL Joins Visual Guide','INNER JOIN: matching rows from both. LEFT JOIN: all from left + matching right. RIGHT JOIN: all from right + matching left. FULL OUTER JOIN: all rows. CROSS JOIN: cartesian product. Self JOIN: table joined with itself.'),
(5,'REST API Best Practices','Use nouns for endpoints (GET /users, POST /users). HTTP methods: GET(read), POST(create), PUT(update), DELETE(remove). Status codes: 200(OK), 201(Created), 400(Bad Request), 404(Not Found). Version your API: /api/v1/'),
(5,'CSS Flexbox vs Grid','Flexbox: 1D layout (row OR column). Use for nav bars, centering, equal-height cards. Grid: 2D layout (rows AND columns). Use for page layouts, complex grids. Both can be nested. Flexbox is content-first, Grid is layout-first.'),
(6,'Algorithm Paradigms Summary','Divide and Conquer: Split, Solve, Combine (Merge Sort, Quick Sort). Greedy: Locally optimal choices (Dijkstra, Huffman). Dynamic Programming: Overlapping subproblems + optimal substructure (Knapsack, LCS). Backtracking: Try, Fail, Undo (N-Queens).'),
(6,'Big-O Complexity Reference','O(1): Constant - hash lookup. O(log n): Logarithmic - binary search. O(n): Linear - scan. O(n log n): Linearithmic - merge sort. O(n^2): Quadratic - bubble sort. O(2^n): Exponential - recursive fib. O(n!): Factorial - permutations.'),
(7,'AI Search Algorithms','BFS: Complete, optimal (uniform cost). O(b^d) space. DFS: Not complete, not optimal. O(bm) space. A*: Complete, optimal with admissible heuristic. f(n) = g(n) + h(n). IDA*: Memory-efficient A*. Best-first greedy: Fast but not optimal.'),
(7,'Machine Learning Types','Supervised: Labeled data, Classification/Regression (SVM, RF, NN). Unsupervised: Unlabeled, Clustering/Dim reduction (K-Means, PCA). Reinforcement: Agent + Environment, Policy (Q-Learning, PPO). Semi-supervised: Mix of labeled + unlabeled.'),
(8,'Linear Programming Standard Form','Maximize: c^T x. Subject to: Ax <= b, x >= 0. Convert to standard form with slack variables. Simplex moves along vertices of feasible region. Duality: every LP has a dual LP. Strong duality: optimal values equal if both feasible.'),
(8,'Gradient Descent Variants','Batch GD: All data, slow but stable. SGD: One sample, fast but noisy. Mini-batch: Best of both. Adam: Adaptive rates + momentum. RMSprop: Adaptive per-parameter. Learning rate scheduling: reduce over time for convergence.'),
(9,'Cloud Deployment Models','Public Cloud: Shared infrastructure (AWS, Azure, GCP). Private: Dedicated to one org. Hybrid: Mix of public + private. Multi-Cloud: Multiple providers. Edge Computing: Processing near data source. Consider: cost, security, compliance, latency.'),
(9,'Docker & Kubernetes Essentials','Docker: Container = isolated process + deps. Dockerfile, Image, Container. Kubernetes: Orchestrates containers. Pod = smallest unit. Deployment = desired state. Service = network access. ConfigMap/Secret = config. Helm = package manager.'),
(10,'Design Patterns Quick Reference','Creational: Singleton, Factory, Builder, Prototype. Structural: Adapter, Decorator, Facade, Proxy. Behavioral: Observer, Strategy, Command, Iterator. SOLID: Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion.'),
(10,'Agile vs Waterfall','Waterfall: Linear, sequential, heavy docs, fixed scope. Best for well-defined projects. Agile: Iterative, flexible, working software over docs, embraces change. Scrum: Sprints (2-4 wk), daily standups, retros. Kanban: Continuous flow, WIP limits, visual board.');

-- Seed: Achievements
INSERT IGNORE INTO achievements (`key`, title, description, icon) VALUES
('first_session','First Step','Complete your very first focus session','1'),
('streak_3','On a Roll','Maintain a 3-day study streak','2'),
('streak_7','Week Warrior','Maintain a 7-day study streak','3'),
('hours_10','Dedicated Learner','Accumulate 10 hours of focus time','4'),
('hours_50','Scholar','Accumulate 50 hours of focus time','5'),
('sessions_25','Quarter Century','Complete 25 focus sessions','6'),
('sessions_100','Centurion','Complete 100 focus sessions','7'),
('all_subjects','Renaissance Mind','Study all available subjects','8'),
('pomodoro_4','Pomodoro Master','Complete 4 pomodoro cycles in one sitting','9'),
('early_bird','Early Bird','Start a session before 7 AM','10');
