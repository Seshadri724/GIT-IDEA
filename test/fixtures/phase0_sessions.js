// Phase 0 ground-truth evaluation fixtures for transcript extraction (ROADMAP.md Phase 0).
// Defines 5 hand-labeled sessions to validate prompt precision and recall.

export const PHASE0_FIXTURES = [
  {
    name: 'architectural_debate',
    description: 'Debate between Redis and Postgres for session storage',
    transcript: `
Developer: Should we use Redis for session storage or keep using Postgres?
Agent: Postgres is already running in our stack. Redis would add an operational dependency.
Developer: Let's stick with Postgres using unlogged tables, and reject Redis for now.
`,
    expectedDecisions: [
      {
        title: 'Keep sessions in Postgres rather than adding Redis',
        chose: 'Postgres unlogged table',
        why: 'Avoids adding a second datastore operational dependency',
        rejected: [{ name: 'Redis', reason: 'Adds operational cost' }],
      },
    ],
  },
  {
    name: 'routine_bug_fix',
    description: 'Fixing a typo in a CSS class name',
    transcript: `
Developer: The button is misaligned.
Agent: I found a typo in the class name 'btn-primaryy'. Fixing it now.
Developer: Thanks!
`,
    expectedDecisions: [],
  },
  {
    name: 'exploratory_work',
    description: 'Investigating ORM options',
    transcript: `
Developer: Can you benchmark Prisma vs Kysely for our TypeScript server?
Agent: Prisma has higher latency overhead while Kysely generates zero-cost SQL queries.
Developer: Great analysis, let's proceed with Kysely for type-safe SQL.
`,
    expectedDecisions: [
      {
        title: 'Use Kysely over Prisma for SQL querying',
        chose: 'Kysely query builder',
        why: 'Generates zero-cost type-safe SQL queries without Prisma runtime overhead',
        rejected: [{ name: 'Prisma', reason: 'Higher latency overhead' }],
      },
    ],
  },
  {
    name: 'changed_mind',
    description: 'Initially considered GraphQL, reverted to REST',
    transcript: `
Developer: Let's consider GraphQL for the mobile API.
Agent: GraphQL requires schema stitching and extra caching infrastructure.
Developer: Good point, REST endpoints are already built and sufficient. Let's stay on REST.
`,
    expectedDecisions: [
      {
        title: 'Retain REST API for mobile client instead of GraphQL',
        chose: 'REST endpoints',
        why: 'Avoids schema stitching and custom caching infrastructure',
        rejected: [{ name: 'GraphQL', reason: 'Requires complex schema stitching and caching' }],
      },
    ],
  },
  {
    name: 'no_meaningful_decision',
    description: 'Updating dependencies version bump',
    transcript: `
Developer: Bump node types to latest patch version.
Agent: Updated package.json and ran npm install.
Developer: Looks good.
`,
    expectedDecisions: [],
  },
];
