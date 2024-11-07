import { tmpdir } from "node:os";
import { rename, access, writeFile } from "node:fs/promises";
import path from "node:path";

interface LogEntry {
  type: "info" | "error";
  timestamp: number;
  message: string;
}

const LATEST_TAG = "latest";
const OLD_TAG = "old";

const logEntryToString = ({ timestamp, type, message }: LogEntry) =>
  `[${timestamp}](${type}) ${message}\n`;

export class LoggerService {
  private log: LogEntry[] = [];

  async info(message: string) {
    this.addToLog({
      type: "info",
      timestamp: this.getTimestamp(),
      message,
    });
  }

  async error(message: string) {
    this.addToLog({
      type: "error",
      timestamp: this.getTimestamp(),
      message,
    });
  }

  get(type: "all" | "info" | "error" = "all"): LogEntry[] {
    return type === "all"
      ? this.log
      : this.log.filter((entry) => entry.type === type);
  }

  async saveToFile(path: string) {
    const content = this.log.map(logEntryToString).join("");
    this.rotateLogFile(path);
    await writeFile(path, content);
  }

  getSuggestLogFilePath(): string {
    const filename = `npkill-${LATEST_TAG}.log`;
    return path.join(tmpdir(), filename);
  }

  private async rotateLogFile(newLogPath: string) {
    if (!(await this.exists(newLogPath))) {
      return; // Rotation is not necessary
    }
    const basePath = path.dirname(newLogPath);
    const logName = path.basename(newLogPath);
    const oldLogName = logName.replace(LATEST_TAG, OLD_TAG);
    const oldLogPath = path.join(basePath, oldLogName);
    await rename(newLogPath, oldLogPath);
  }

  private addToLog(entry: LogEntry): void {
    this.log = [...this.log, entry];
  }

  private getTimestamp(): number {
    return Date.now();
  }

  private async exists(newLogPath: string) {
    try {
      await access(newLogPath);
      return true;
    } catch {
      // do nothing
    }
    return false; // Rotation is not necessary
  }
}
