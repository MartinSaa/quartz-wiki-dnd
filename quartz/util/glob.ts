import path from "path"
import { FilePath } from "./path"
import { globby } from "globby"

export function toPosixPath(fp: string): string {
  return fp.split(path.sep).join("/")
}

export async function glob(
  pattern: string,
  cwd: string,
  ignorePatterns: string[],
  opts?: { gitignore?: boolean; followSymbolicLinks?: boolean },
): Promise<FilePath[]> {
  const fps = (
    await globby(pattern, {
      cwd,
      ignore: ignorePatterns,
      gitignore: opts?.gitignore ?? true,
      followSymbolicLinks: opts?.followSymbolicLinks ?? false,
    })
  ).map(toPosixPath)
  return fps as FilePath[]
}
