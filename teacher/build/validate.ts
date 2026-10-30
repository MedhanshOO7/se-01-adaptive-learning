// CLI: validate a chapter bundle against the shared schema.
//   node teacher/build/validate.ts [bundleDir]   (default: content/fractions)

import { loadBundle } from './load.ts';
import { validateBundle } from '../../shared/schema/index.ts';

const bundleDir = process.argv[2] ?? 'content/fractions';

const bundle = await loadBundle(bundleDir);
const issues = validateBundle(bundle);

if (issues.length === 0) {
  const questionCount =
    bundle.quizzes.reduce((n, q) => n + q.questions.length, 0) +
    Object.values(bundle.skillGraph.prereqPool).reduce((n, pool) => n + pool.length, 0);
  console.log(
    `✓ ${bundleDir} is valid — ${bundle.skillGraph.skills.length} skills, ` +
      `${bundle.quizzes.length} quiz file(s), ${questionCount} questions total.`,
  );
} else {
  console.error(`✗ ${bundleDir} has ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  ${issue.path}: ${issue.message}`);
  process.exit(1);
}
