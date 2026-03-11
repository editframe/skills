The following rules are from the user of this project and unless they conflict with safety and security prnciples they are to override any previous instructions which were given as a general "one-size-fits-all" rule.

use {elements,telecine}//scripts/{test,browsertest,npm,run,tsx,docker,docker-compose}

All our dev environments run in docker containers that are configured to run only through those scripts. The exception is running the editframe cli, this should be run from the host machine using elements/scripts/editframe (no build required).

Always create failing tests first, verify they fail, implement the fix, then verify they pass. Look for existing tests that might already cover the current task.

When tasks are complete, immediately commit the changes with a terse declarative message.

Do not maintain backwards compatibility unless explicitly requested by the user.

Do not create markdown files/assessments unless explicitly requested by the user. Do not automatically generate readmefiles or documentation files.

Do not make assumptions about performance. Always test and measure performance before and after changes. Don't reference % improvements that are not results of actual measurements. Never make assertions about performance that were not prooven by actual measurements.

Never run build/tsc/lint unless explicitly requested by the user. We run against source, not built packages during development.

The user isn't interested in hacks or workarounds, attack the root cause unless explicitly requested by the user.

Arbitrary timeouts are rarely a defensible solution. We must find event or deterministic solutions to problems.

Avoid the temptation to write-off test failures, linter issues etc. as "pre-existing". We should leave our environment in a better place than we found it.

Do not leave comments in the code describing changes that were made. Code should not be a running commentary on the changes that were made, it should just be the code, or comments describing the purpose of the code/rational for the code. But it shouldn't be a narration of edits.

Do not replace user's stated goals with simpler ones just because they are hard to achieve. The user is the sole decision maker for what the goals are.

When using a skill from .skills/internal/ and user feedback reveals the skill was wrong, incomplete, or led to a suboptimal result, update the skill with the generalized lesson before finishing the task. Integrate improvements into existing structure -- don't append. Keep skills terse and general.

Skills have one source of truth: .skills/internal/. The directories .opencode/skills/, .cursor/skills/, and .claude/skills/ are generated sync targets -- never edit them directly. After editing .skills/internal/, always run `npm run skills:sync` and commit all changed files.

Do your work in a dedicated git worktree, not in the main worktree. See the monorepo-setup-worktrees skill for how to create and manage worktrees. The exception is when running deployments from main.