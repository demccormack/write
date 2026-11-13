import { spawn } from 'node:child_process';

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  /** Connect the child to the terminal so it can prompt the user. */
  inherit?: boolean;
}

export type Exec = (
  command: string,
  args: string[],
  options?: ExecOptions,
) => Promise<ExecResult>;

export const exec: Exec = (command, args, options = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.inherit
        ? 'inherit'
        : [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d));
    child.stderr?.on('data', (d) => (stderr += d));
    child.on('error', (error) =>
      resolve({ code: 127, stdout, stderr: stderr || String(error) }),
    );
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (options.input !== undefined) {
      child.stdin?.end(options.input);
    }
  });

export const GH_INSTALL_URL = 'https://cli.github.com/';

export type AuthState = 'missing' | 'unauthenticated' | 'ok';

export interface RepoSettings {
  repo: string;
  defaultBranch: string;
  requiredChecks: string[];
}

export interface SettingResult {
  label: string;
  ok: boolean;
  warning?: string;
}

export async function checkAuth(run: Exec): Promise<AuthState> {
  if ((await run('gh', ['--version'])).code !== 0) return 'missing';
  return (await run('gh', ['auth', 'status'])).code === 0
    ? 'ok'
    : 'unauthenticated';
}

export async function getUser(run: Exec): Promise<string | undefined> {
  const result = await run('gh', ['api', 'user', '--jq', '.login']);
  return result.code === 0 ? result.stdout.trim() : undefined;
}

export async function listOrgs(run: Exec): Promise<string[]> {
  const result = await run('gh', ['api', 'user/orgs', '--jq', '.[].login']);
  if (result.code !== 0) return [];
  return result.stdout.split('\n').filter(Boolean);
}

export async function repoExists(run: Exec, repo: string): Promise<boolean> {
  return (await run('gh', ['repo', 'view', repo])).code === 0;
}

export async function createRepo(
  run: Exec,
  repo: string,
  visibility: 'public' | 'private',
  description: string,
): Promise<ExecResult> {
  // No --add-readme/--license/--gitignore: the local project already has its own
  return run('gh', [
    'repo',
    'create',
    repo,
    `--${visibility}`,
    '--description',
    description,
  ]);
}

const RULESET_NAME = 'Require CI to pass';

function failure(result: ExecResult): string {
  return (result.stderr || result.stdout).trim().split('\n')[0];
}

/**
 * Apply recommended settings. Each failure is reported as a warning rather than
 * thrown, since permissions and plan limits vary.
 */
export async function applyRepoSettings(
  run: Exec,
  { repo, defaultBranch, requiredChecks }: RepoSettings,
): Promise<SettingResult[]> {
  const results: SettingResult[] = [];
  const record = (label: string, result: ExecResult, hint = '') =>
    results.push(
      result.code === 0
        ? { label, ok: true }
        : { label, ok: false, warning: `${failure(result)}${hint}` },
    );

  record(
    'Automatic branch deletion enabled',
    await run('gh', [
      'api',
      '-X',
      'PATCH',
      `repos/${repo}`,
      '-F',
      'delete_branch_on_merge=true',
    ]),
  );

  record(
    'GitHub Actions enabled',
    await run('gh', [
      'api',
      '-X',
      'PUT',
      `repos/${repo}/actions/permissions`,
      '-F',
      'enabled=true',
    ]),
  );

  const label = `CI ruleset "${RULESET_NAME}" on ${defaultBranch}`;
  if (requiredChecks.length === 0) {
    results.push({
      label,
      ok: false,
      warning: 'No CI workflow jobs found, so no required checks were set',
    });
    return results;
  }

  const existing = await run('gh', [
    'api',
    `repos/${repo}/rulesets`,
    '--jq',
    '.[].name',
  ]);
  if (
    existing.code === 0 &&
    existing.stdout.split('\n').includes(RULESET_NAME)
  ) {
    results.push({ label: `${label} already exists`, ok: true });
    return results;
  }

  const ruleset = {
    name: RULESET_NAME,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    // Repository admins (role 5) may bypass when merging a pull request
    bypass_actors: [
      {
        actor_id: 5,
        actor_type: 'RepositoryRole',
        bypass_mode: 'pull_request',
      },
    ],
    rules: [
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: requiredChecks.map((context) => ({
            context,
          })),
        },
      },
    ],
  };
  record(
    label,
    await run(
      'gh',
      [
        'api',
        '-X',
        'POST',
        `repos/${repo}/rulesets`,
        '-H',
        'Accept: application/vnd.github+json',
        '--input',
        '-',
      ],
      { input: JSON.stringify(ruleset) },
    ),
    ' (rulesets on private repositories may require a paid GitHub plan)',
  );
  return results;
}
