import { createInterface } from 'node:readline/promises';
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import {
  type Exec,
  GH_INSTALL_URL,
  applyRepoSettings,
  checkAuth,
  createRepo,
  exec,
  getUser,
  listOrgs,
  listSecrets,
  login,
  repoExists,
  setSecret,
} from '../github/gh.ts';

export interface Prompter {
  ask(question: string, defaultValue?: string): Promise<string>;
  confirm(question: string, defaultValue?: boolean): Promise<boolean>;
}

export interface RemoteOptions {
  name?: string;
  owner?: string;
  visibility?: 'public' | 'private';
  description?: string;
  /** Accept all defaults without prompting. */
  yes?: boolean;
}

export interface RemoteDeps {
  run: Exec;
  prompt: Prompter;
  cwd: string;
  log: (message: string) => void;
}

class FatalError extends Error {}

const SENSITIVE_PATTERNS = [
  ':(exclude,glob)**/.env',
  ':(exclude,glob)**/.env.*',
  ':(exclude,glob)**/*.pem',
  ':(exclude,glob)**/*.key',
  ':(exclude,glob)**/id_rsa*',
];

export function createPrompter(): Prompter {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    async ask(question, defaultValue) {
      const suffix = defaultValue ? ` [${defaultValue}]` : '';
      return (
        (await rl.question(`${question}${suffix}: `)).trim() ||
        (defaultValue ?? '')
      );
    },
    async confirm(question, defaultValue = true) {
      const answer = (
        await rl.question(`${question} [${defaultValue ? 'Y/n' : 'y/N'}] `)
      )
        .trim()
        .toLowerCase();
      return answer ? answer.startsWith('y') : defaultValue;
    },
  };
}

/** Prompter that always takes the default; used for --yes and non-TTY runs. */
export const defaultsPrompter: Prompter = {
  ask: async (_q, d) => d ?? '',
  confirm: async (_q, d = true) => d,
};

export function parseGithubRemote(url: string): string | undefined {
  const match = url
    .trim()
    .match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

export async function readBookTitle(cwd: string): Promise<string | undefined> {
  const toml = await readFile(join(cwd, 'book.toml'), 'utf8');
  return toml.match(/^\s*title\s*=\s*"((?:[^"\\]|\\.)*)"/m)?.[1];
}

export async function findWorkflowSecrets(cwd: string): Promise<string[]> {
  const found = new Set<string>();
  for (const { text } of await readWorkflows(cwd)) {
    for (const m of text.matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      if (m[1] !== 'GITHUB_TOKEN') found.add(m[1]);
    }
  }
  return [...found].sort();
}

/** Names GitHub reports as status checks: each job's `name`, else its id. */
export async function findCheckNames(cwd: string): Promise<string[]> {
  const checks = new Set<string>();
  for (const { text } of await readWorkflows(cwd)) {
    const jobsSection = text.split(/^jobs:\s*$/m)[1];
    if (!jobsSection) continue;
    const jobs = jobsSection.split(/^(?= {2}[A-Za-z0-9_-]+:\s*$)/m).slice(1);
    for (const job of jobs) {
      const id = job.match(/^ {2}([A-Za-z0-9_-]+):/)![1];
      const name = job.match(/^ {4}name:\s*['"]?(.+?)['"]?\s*$/m)?.[1];
      checks.add(name ?? id);
    }
  }
  return [...checks];
}

async function readWorkflows(cwd: string) {
  const dir = join(cwd, '.github', 'workflows');
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  return Promise.all(
    files
      .filter((f) => /\.ya?ml$/.test(f))
      .map(async (f) => ({ text: await readFile(join(dir, f), 'utf8') })),
  );
}

/**
 * `write remote add github`. Returns the process exit code.
 */
export async function remoteAddGithub(
  options: RemoteOptions,
  deps: RemoteDeps,
): Promise<number> {
  const { run, prompt, cwd, log } = deps;
  const warnings: string[] = [];
  const git = (...args: string[]) => run('git', args, { cwd });
  let resume = '';

  try {
    // 1. Validate the project
    let title: string | undefined;
    try {
      title = await readBookTitle(cwd);
    } catch {
      throw new FatalError(
        'This directory is not a write book project (book.toml not found).',
      );
    }
    log('✓ Valid write project detected');

    const isRepo = (await git('rev-parse', '--git-dir')).code === 0;
    let originUrl = '';
    if (isRepo) {
      originUrl = (await git('remote', 'get-url', 'origin')).stdout.trim();
    }
    const existingRepo = originUrl ? parseGithubRemote(originUrl) : undefined;
    if (originUrl && !existingRepo) {
      throw new FatalError(
        `Remote "origin" already points to a non-GitHub URL (${originUrl}). Remove or rename it first; it will not be modified.`,
      );
    }

    // 2. Check the GitHub CLI
    let auth = await checkAuth(run);
    if (auth === 'missing') {
      throw new FatalError(
        `GitHub CLI (gh) was not found on your PATH. Install it from ${GH_INSTALL_URL} and re-run this command.`,
      );
    }
    log('✓ GitHub CLI installed');
    if (auth === 'unauthenticated') {
      if (
        !options.yes &&
        (await prompt.confirm('Not logged in to GitHub. Run gh auth login?'))
      ) {
        await login(run);
        auth = await checkAuth(run);
      }
      if (auth !== 'ok') {
        throw new FatalError(
          'Not authenticated with GitHub. Run "gh auth login" and re-run this command.',
        );
      }
    }
    const user = await getUser(run);
    if (!user) {
      throw new FatalError(
        'Could not determine the authenticated GitHub user. Check "gh auth status".',
      );
    }
    log(`✓ Authenticated as ${user}`);

    // 3. Decide which repository to use
    let repo: string;
    let visibility: 'public' | 'private' = options.visibility ?? 'private';
    let create = true;

    if (existingRepo) {
      repo = existingRepo;
      create = !(await repoExists(run, repo));
      if (!create) {
        log(`✓ Remote origin already points to existing repository ${repo}`);
        if (
          !options.yes &&
          !(await prompt.confirm(
            `Skip creation and configure missing settings for ${repo}?`,
          ))
        ) {
          log('Nothing changed.');
          return 0;
        }
      }
    } else {
      const name =
        options.name ?? (await prompt.ask('Repository name', basename(cwd)));
      let owner = options.owner;
      if (!owner) {
        const orgs = await listOrgs(run);
        const hint = orgs.length
          ? ` (or an organisation: ${orgs.join(', ')})`
          : '';
        owner = await prompt.ask(`Repository owner${hint}`, user);
      }
      if (!options.visibility) {
        const answer = await prompt.ask(
          'Visibility (public/private)',
          'private',
        );
        visibility = answer.toLowerCase().startsWith('pub')
          ? 'public'
          : 'private';
      }
      repo = `${owner}/${name}`;
      create = !(await repoExists(run, repo));
    }
    const description =
      options.description ??
      (existingRepo || !create
        ? ''
        : await prompt.ask('Description', title ?? ''));

    if (create) {
      if (
        !options.yes &&
        !(await prompt.confirm(`Create ${repo} (${visibility})?`))
      ) {
        log('Cancelled.');
        return 0;
      }
    } else if (!existingRepo) {
      log(`✓ Repository ${repo} already exists; it will not be recreated`);
      if (
        !options.yes &&
        !(await prompt.confirm(`Use existing ${repo} as origin?`))
      ) {
        log('Cancelled.');
        return 0;
      }
    }
    resume = `Fix the problem and re-run "write remote add github" to resume; completed steps are skipped.`;

    // Local git state
    if (!isRepo) {
      const init = await git('init', '-b', 'main');
      if (init.code !== 0)
        throw new FatalError(`git init failed: ${init.stderr}`);
      log('✓ Initialised Git repository');
    }
    const hasCommits = (await git('rev-parse', '--verify', 'HEAD')).code === 0;
    if (!hasCommits) {
      await git('add', '-A', '--', '.', ...SENSITIVE_PATTERNS);
      const commit = await git('commit', '-m', 'Initial commit');
      if (commit.code !== 0) {
        throw new FatalError(`Initial commit failed: ${commit.stderr.trim()}`);
      }
      log(
        '✓ Created initial commit (files matching .env/key patterns excluded)',
      );
    } else if ((await git('status', '--porcelain')).stdout.trim()) {
      warnings.push(
        'You have uncommitted changes. Only committed history is pushed; commit them and run "git push" to include them.',
      );
    }
    const branch =
      (await git('branch', '--show-current')).stdout.trim() || 'main';

    // 4. Create the repository
    if (create) {
      const created = await createRepo(run, repo, visibility, description);
      if (created.code !== 0) {
        throw new FatalError(
          `Could not create ${repo}: ${created.stderr.trim()}`,
        );
      }
      log('✓ GitHub repository created');
    }
    if (!originUrl) {
      const url = `https://github.com/${repo}.git`;
      const added = await git('remote', 'add', 'origin', url);
      if (added.code !== 0) {
        throw new FatalError(`Could not add remote: ${added.stderr.trim()}`);
      }
      log('✓ Remote origin configured');
    }

    // Never force: a rejected push means the remote has history we must keep
    const push = await git('push', '-u', 'origin', branch);
    if (push.code !== 0) {
      throw new FatalError(
        `Push failed (no force push is attempted): ${push.stderr.trim()}`,
      );
    }
    log('✓ Project pushed to GitHub');

    // 5. Recommended settings
    const settings = await applyRepoSettings(run, {
      repo,
      defaultBranch: branch,
      requiredChecks: await findCheckNames(cwd),
    });
    for (const s of settings) {
      if (s.ok) log(`✓ ${s.label}`);
      else warnings.push(`${s.label} not applied: ${s.warning}`);
    }

    // Secrets
    const needed = await findWorkflowSecrets(cwd);
    if (needed.length) {
      const have = await listSecrets(run, repo);
      for (const secret of needed.filter((s) => !have.includes(s))) {
        const set =
          !options.yes &&
          (await prompt.confirm(
            `Workflow secret ${secret} is not set. Set it now? (skip to set later)`,
            false,
          )) &&
          (await setSecret(run, repo, secret));
        if (set) log(`✓ Secret ${secret} set`);
        else
          warnings.push(
            `Secret ${secret} is not set. Run: gh secret set ${secret} --repo ${repo}`,
          );
      }
    }

    // 6. Summary
    log('');
    log('Your book project is now on GitHub!');
    log('');
    log(`https://github.com/${repo}`);
    log(`Visibility: ${create ? visibility : 'unchanged'}`);
    log(`Default branch: ${branch}`);
    if (warnings.length) {
      log('');
      log('Warnings / manual steps:');
      for (const w of warnings) log(`  ! ${w}`);
    }
    return 0;
  } catch (error) {
    if (!(error instanceof FatalError)) throw error;
    log(`✗ ${error.message}`);
    if (resume) log(resume);
    for (const w of warnings) log(`  ! ${w}`);
    return 1;
  }
}

export function parseRemoteArgs(args: string[]): RemoteOptions {
  const options: RemoteOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = () => args[++i];
    if (arg === '--name') options.name = value();
    else if (arg === '--owner') options.owner = value();
    else if (arg === '--description') options.description = value();
    else if (arg === '--public') options.visibility = 'public';
    else if (arg === '--private') options.visibility = 'private';
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else throw new Error(`Unknown option '${arg}'`);
  }
  return options;
}

export async function runRemoteAdd(args: string[]): Promise<number> {
  const options = parseRemoteArgs(args);
  const interactive = !options.yes && Boolean(process.stdin.isTTY);
  const prompt = interactive ? createPrompter() : defaultsPrompter;
  if (!interactive) options.yes = true;
  try {
    return await remoteAddGithub(options, {
      run: exec,
      prompt,
      cwd: process.cwd(),
      log: console.log,
    });
  } finally {
    // readline keeps stdin open
    process.stdin.pause();
  }
}
