import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { LoggerService } from "@/services/logger.service.js";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
}));

vi.mock("node:fs/promises", async () => ({
  ...mocks,
  default: vi.fn(),
}));

const osTmpPath = "/tmpDir";
vi.mock("node:os", async () => ({
  tmpdir: () => osTmpPath,
}));

describe("LoggerService", () => {
  let logger: LoggerService;
  const fakeTime = new Date("2026-01-01");
  const fakeTimeEpox = fakeTime.getTime();

  beforeEach(() => {
    logger = new LoggerService();
    vi.useFakeTimers().setSystemTime(fakeTime);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("add to log (info, error)", () => {
    it("should add the message to the log with the correct type and timestamp", async () => {
      expect(logger.get()).toEqual([]);
      await logger.info("Sample message1");
      await logger.error("Sample message2");
      await logger.error("Sample message3");
      await logger.info("Sample message4");
      expect(logger.get()).toEqual([
        {
          type: "info",
          timestamp: fakeTimeEpox,
          message: "Sample message1",
        },
        {
          type: "error",
          timestamp: fakeTimeEpox,
          message: "Sample message2",
        },
        {
          type: "error",
          timestamp: fakeTimeEpox,
          message: "Sample message3",
        },
        {
          type: "info",
          timestamp: fakeTimeEpox,
          message: "Sample message4",
        },
      ]);
    });
  });

  describe("get", () => {
    it('should get "all" logs (by default or explicit)', async () => {
      expect(logger.get()).toEqual([]);
      await logger.info("");
      await logger.error("");
      await logger.info("");

      const expected = ["info", "error", "info"];

      expect(logger.get().map((entry) => entry.type)).toEqual(expected);
      expect(logger.get("all").map((entry) => entry.type)).toEqual(expected);
    });

    it('should get "info" logs', async () => {
      await logger.info("");
      await logger.error("");
      await logger.info("");

      const expected = ["info", "info"];

      expect(logger.get("info").map((entry) => entry.type)).toEqual(expected);
    });

    it('should get "error" logs', async () => {
      await logger.info("");
      await logger.error("");
      await logger.info("");

      const expected = ["error"];

      expect(logger.get("error").map((entry) => entry.type)).toEqual(expected);
    });
  });

  describe("getSuggestLogfilePath", () => {
    it("the path should includes the os tmp dir", () => {
      const loggerPath = logger.getSuggestLogFilePath();
      expect(loggerPath.includes(path.normalize("/tmpDir"))).toBeTruthy();
    });
  });

  describe("LogFile rotation", () => {
    it("should not rotate file if not exist", async () => {
      mocks.access.mockRejectedValueOnce(new Error("No access to file"));
      const path = logger.getSuggestLogFilePath();
      await logger.saveToFile(path);
      expect(mocks.rename).not.toBeCalled();
    });

    it("should rotate file if exist", async () => {
      mocks.access.mockResolvedValue(true);
      mocks.rename.mockResolvedValue(true);
      const loggerPath = logger.getSuggestLogFilePath();
      await logger.saveToFile(loggerPath);
      const expectedOldPath = loggerPath.replace("latest", "old");
      expect(mocks.rename).toHaveBeenCalled();
      expect(mocks.rename).toHaveBeenCalledWith(loggerPath, expectedOldPath);
    });
  });

  describe("saveToFile", () => {
    it("shoul write the content of the log to a given file", async () => {
      const path = "/tmp/npkill-log.log";
      logger.info("hello");
      logger.error("bye");
      logger.info("world");
      const expected =
        "[1767225600000](info) hello\n" +
        "[1767225600000](error) bye\n" +
        "[1767225600000](info) world\n";
      await logger.saveToFile(path);
      expect(mocks.writeFile).toHaveBeenCalledWith(path, expected);
    });
  });
});
