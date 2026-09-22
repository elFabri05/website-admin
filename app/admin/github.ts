/* GitHub API */

export const OWNER = "elFabri05";
export const REPO = "website-admin";
export const BRANCH = "main";
const API = "https://api.github.com/repos/" + OWNER + "/" + REPO;

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; raw?: boolean };

export async function gh(token: string, path: string, opts: Options & { raw: true }): Promise<string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gh(token: string, path: string, opts?: Options): Promise<any>;
export async function gh(token: string, path: string, opts: Options = {}) {
  const res = await fetch(API + path, {
    method: opts.method,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
    headers: {
      Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).message; } catch {}
    throw new GitHubError("GitHub " + res.status + (detail ? ": " + detail : ""), res.status);
  }
  return opts.raw ? res.text() : res.json();
}

export const errorStatus = (err: unknown) => (err instanceof GitHubError ? err.status : 0);
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
