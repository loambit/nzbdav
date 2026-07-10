import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const versionFilePath = resolve(process.cwd(), "..", "version.txt");

export async function getAppVersion(): Promise<string | undefined> {
  if (process.env.NZBDAV_VERSION) {
    return process.env.NZBDAV_VERSION;
  }

  try {
    return (await readFile(versionFilePath, "utf8")).trim() || undefined;
  } catch {
    return undefined;
  }
}
