export interface RoundData {
  name: string;
  questions: string[];
}

export const DEFAULT_ROUNDS_DATA: RoundData[] = [
  {
    name: 'Round 1',
    questions: [
      'Q1: What is the output of console.log(typeof NaN)?',
      'Q2: Which HTML5 tag is used to specify a footer for a document or section?',
      'Q3: In CSS, what property is used to change the background color?',
      'Q4: What is the purpose of the \'git clone\' command?',
      'Q5: Which HTTP status code represents \'Not Found\'?',
      'Q6: What does CSS stand for?',
      'Q7: What is the primary function of DNS in computer networks?',
      'Q8: In JavaScript, what is the difference between \'==\' and \'===\'?',
      'Q9: What keyword is used to declare a block-scoped constant variable in modern JavaScript?',
      'Q10: Which data structure uses FIFO (First In, First Out) ordering?',
      'Q11: What does API stand for in software engineering?',
      'Q12: Which command is used to initialize a new git repository?',
      'Q13: What is the default port for HTTP traffic?',
      'Q14: What is the default port for HTTPS traffic?',
      'Q15: What HTML attribute is used to provide alternate text for images?',
      'Q16: In Python, which keyword is used to define a function?',
      'Q17: What does JSON stand for?',
      'Q18: Which Linux command is used to list directory contents?',
      'Q19: What is the main purpose of an index in a database table?',
      'Q20: What does MVC stand for in software architecture?'
    ]
  },
  {
    name: 'Round 2',
    questions: [
      'Q1: What does SQL stand for?',
      'Q2: Which Python library is commonly used for data analysis and manipulation?',
      'Q3: What is the time complexity of binary search on a sorted array?',
      'Q4: What is a closure in JavaScript?',
      'Q5: Which protocol is used to securely transfer files over SSH?',
      'Q6: What is the difference between a process and a thread?',
      'Q7: In relational databases, what does ACID stand for?',
      'Q8: What is the primary purpose of Docker in modern software deployment?',
      'Q9: What does REST stand for in web services architecture?',
      'Q10: Which sorting algorithm has an average time complexity of O(n log n)?',
      'Q11: What is the key difference between synchronous and asynchronous execution?',
      'Q12: What is the purpose of the Virtual DOM in React?',
      'Q13: In Git, what is the difference between \'git merge\' and \'git rebase\'?',
      'Q14: What is Cross-Origin Resource Sharing (CORS) and why does the browser enforce it?',
      'Q15: What is the structure and purpose of a JWT (JSON Web Token)?',
      'Q16: What does the CAP theorem state regarding distributed data stores?',
      'Q17: In SQL, what is the difference between WHERE and HAVING clauses?',
      'Q18: What is a deadlock in concurrent computing, and what are Coffman conditions?',
      'Q19: Which encryption algorithm is asymmetric: RSA or AES?',
      'Q20: What is the difference between symmetric and asymmetric cryptography?'
    ]
  },
  {
    name: 'Round 3',
    questions: [
      'Q1: Explain how garbage collection and generational memory work in the V8 JavaScript engine.',
      'Q2: What is the difference between optimistic and pessimistic concurrency control in distributed databases?',
      'Q3: Explain the Paxos consensus algorithm and how it guarantees safety in asynchronous networks.',
      'Q4: How does a B-Tree differ from a B+ Tree in database index storage engines?',
      'Q5: What is the memory layout of a compiled C/C++ program in virtual memory (Stack, Heap, BSS, Data, Text)?',
      'Q6: Describe the internals of the Raft distributed consensus protocol (Leader Election & Log Replication).',
      'Q7: What is the difference between TCP slow start, congestion avoidance, fast retransmit, and fast recovery?',
      'Q8: How does consistent hashing solve node rebalancing and hotspots in distributed caching systems?',
      'Q9: What is cache coherency and how does the MESI protocol work across CPU cores?',
      'Q10: Explain the Byzantine Generals Problem and its relevance to distributed fault tolerance.',
      'Q11: How do LSM-trees (Log-Structured Merge-trees) achieve high write throughput compared to traditional B-Trees?',
      'Q12: Explain the mechanics of speculative execution and how Spectre/Meltdown exploited CPU branch predictors.',
      'Q13: What is tail call optimization and why is it challenging to implement safely in dynamic languages?',
      'Q14: Describe how TLS 1.3 handshake reduces latency to 1-RTT (or 0-RTT) compared to TLS 1.2.',
      'Q15: What is the architectural difference between monolithic kernels and microkernels?',
      'Q16: How does event-driven I/O multiplexing with epoll/kqueue work under the hood at the OS level?',
      'Q17: Explain memory barriers (fences) and why CPU instruction reordering matters in lock-free programming.',
      'Q18: What is zero-copy networking and how does the sendfile syscall bypass userspace memory copying?',
      'Q19: How do Bloom filters work, and how do you calculate their false positive probability?',
      'Q20: Explain the formal difference between linearizability and serializability in distributed transactions.'
    ]
  },
  {
    name: 'Tie Breaker',
    questions: [
      'TB1: What is the Halting Problem and why is it undecidable by Turing machines?',
      'TB2: Explain the P vs NP problem in computational complexity theory and what NP-completeness entails.',
      'TB3: In quantum computing, what is quantum superposition, entanglement, and how does Shor\'s algorithm achieve exponential speedup?'
    ]
  }
];

export const BASE_PRICE = 2000000; // 20 Lakhs
export const MIN_INCREMENT = 1000000; // 10 Lakhs
export const ADMIN_MASTER_PASSWORD = 'GCLauction@0321';

export const getRoundBasePrice = (roundIndex: number): number => {
  switch (roundIndex) {
    case 0:
      return 2000000; // Round 1: 20 Lakhs
    case 1:
      return 3000000; // Round 2: 30 Lakhs
    case 2:
      return 5000000; // Round 3: 50 Lakhs
    default:
      return 5000000; // Tie Breaker: 50 Lakhs
  }
};
