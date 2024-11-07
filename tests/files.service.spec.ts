import {
  describe,
  expect,
  it,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  existsSync,
  mkdirSync,
  PathLike,
  PathOrFileDescriptor,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { rimraf } from "rimraf";
import { IFileService } from "@/interfaces/file-service.interface.js";
import { LinuxFilesService } from "@/services/files/linux-files.service.js";
import { WindowsFilesService } from "@/services/files/windows-files.service.js";
import { MacFilesService } from "@/services/files/mac-files.service.js";
import { FileWorkerService } from "@/services/files/files.worker.service.js";

const mocks = vi.hoisted(() => ({
  statSyncReturnMock: vi.fn((): { isDirectory: () => boolean } | void => {}),
  accessSyncReturnMock: vi.fn((): boolean | void => {}),
  readFileSyncSpy: vi.fn(),
  fileWorkerService: vi.fn() as unknown as FileWorkerService,
}));

vi.mock("node:fs", async (originalImport) => {
  const original = await originalImport<typeof import("node:fs")>();
  return {
    statSync: () => mocks.statSyncReturnMock(),
    accessSync: () => mocks.accessSyncReturnMock(),
    readFileSync: mocks.readFileSyncSpy,
    lstat: vi.fn(),
    readdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    existsSync: original.existsSync,
    mkdirSync: original.mkdirSync,
    writeFileSync: original.writeFileSync,
    readdirSync: original.readdirSync,
    default: { constants: { R_OK: 4 } },
  };
});

const createDir = (dir: PathLike) => mkdirSync(dir);
const isDirEmpty = (dir: PathLike) => readdirSync(dir).length === 0;
const createFileWithSize = (filename: PathOrFileDescriptor, mb: number) =>
  writeFileSync(filename, Buffer.alloc(1024 * 1024 * mb));

describe("File Service", () => {
  let fileService: IFileService;

  beforeEach(() => {
    vi.useFakeTimers();
    fileService = new LinuxFilesService(mocks.fileWorkerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidRootFolder", () => {
    const path = "/sample/path";

    it("should throw error if statSync fail", () => {
      mocks.statSyncReturnMock.mockImplementationOnce(() => {
        throw new Error("ENOENT");
      });
      expect(() => fileService.isValidRootFolder(path)).toThrowError(
        "The path does not exist.",
      );
    });

    it("should throw error if is not directory", () => {
      mocks.statSyncReturnMock.mockReturnValueOnce({
        isDirectory: () => false,
      });

      expect(() => fileService.isValidRootFolder(path)).toThrowError(
        "The path must point to a directory.",
      );
    });

    it("should throw error if cant read dir", () => {
      mocks.statSyncReturnMock.mockReturnValueOnce({
        isDirectory: () => true,
      });
      mocks.accessSyncReturnMock.mockImplementationOnce(() => {
        throw new Error("Error");
      });

      expect(() => fileService.isValidRootFolder(path)).toThrowError(
        "Cannot read the specified path.",
      );
    });

    it("should return true if is valid rootfolder", () => {
      mocks.statSyncReturnMock.mockReturnValueOnce({
        isDirectory: () => true,
      });
      mocks.accessSyncReturnMock.mockReturnValueOnce(true);

      expect(fileService.isValidRootFolder(path)).toBeTruthy();
    });
  });

  describe("Conversion methods", () => {
    it("#convertKbToGB", () => {
      expect(fileService.convertKbToGB(100_000)).toBe(0.095_367_431_640_625);
      expect(fileService.convertKbToGB(140_000)).toBe(0.133_514_404_296_875);
    });
    it("#convertBytesToKB", () => {
      expect(fileService.convertBytesToKB(1)).toBe(0.000_976_562_5);
      expect(fileService.convertBytesToKB(100)).toBe(0.097_656_25);
      expect(fileService.convertBytesToKB(96)).toBe(0.093_75);
    });
    it("#convertGBToMB", () => {
      expect(fileService.convertGBToMB(1)).toBe(1024);
      expect(fileService.convertGBToMB(100)).toBe(102_400);
      expect(fileService.convertGBToMB(96)).toBe(98_304);
    });
  });

  describe("#isSafeToDelete", () => {
    const target = "node_modules";

    it("should get false if not is safe to delete ", () => {
      expect(fileService.isSafeToDelete("/one/route", target)).toBeFalsy();
      expect(
        fileService.isSafeToDelete("/one/node_/ro/modules", target),
      ).toBeFalsy();
      expect(fileService.isSafeToDelete("nodemodules", target)).toBeFalsy();
    });

    it("should get true if is safe to delete ", () => {
      expect(
        fileService.isSafeToDelete("/one/route/node_modules", target),
      ).toBeTruthy();
      expect(
        fileService.isSafeToDelete("/one/route/node_modules/", target),
      ).toBeTruthy();
    });
  });

  describe("#isDangerous", () => {
    it("should return false for paths that are not considered dangerous", () => {
      expect(
        fileService.isDangerous("/home/apps/myapp/node_modules"),
      ).toBeFalsy();
      expect(fileService.isDangerous("node_modules")).toBeFalsy();
      expect(
        fileService.isDangerous("/home/user/projects/a/node_modules"),
      ).toBeFalsy();
      expect(
        fileService.isDangerous("/Applications/NotAnApp/node_modules"),
      ).toBeFalsy();
      expect(
        fileService.isDangerous(
          String.raw`C:\Users\User\Documents\node_modules`,
        ),
      ).toBeFalsy();
    });

    it("should return true for paths that are considered dangerous", () => {
      expect(
        fileService.isDangerous("/home/.config/myapp/node_modules"),
      ).toBeTruthy();
      expect(fileService.isDangerous(".apps/node_modules")).toBeTruthy();
      expect(
        fileService.isDangerous(".apps/.sample/node_modules"),
      ).toBeTruthy();
      expect(
        fileService.isDangerous("/Applications/MyApp.app/node_modules"),
      ).toBeTruthy();
      expect(
        fileService.isDangerous(
          String.raw`C:\Users\User\AppData\Local\node_modules`,
        ),
      ).toBeTruthy();
    });
  });

  it("#getFileContent should read file content with utf8 encoding", () => {
    const path = "file.json";
    fileService.getFileContent(path);
    expect(mocks.readFileSyncSpy).toBeCalledWith(path, "utf8");
  });

  describe("Functional test for #deleteDir", () => {
    let fileService: IFileService;
    const testFolder = "test-files";
    const directories = [
      "testProject",
      "awesome-fake-project",
      "a",
      "ewez",
      "potato and bananas",
    ];

    beforeAll(() => {
      const OSService: Partial<Record<NodeJS.Platform, any>> = {
        linux: LinuxFilesService,
        win32: WindowsFilesService,
        darwin: MacFilesService,
      };
      const osService = OSService[process.platform]!;
      fileService = new osService();

      if (existsSync(testFolder)) {
        rimraf.sync(testFolder);
      }
      createDir(testFolder);

      for (const dirName of directories) {
        const basePath = `${testFolder}/${dirName}`;
        const targetFolder = `${basePath}/node_modules`;
        const subfolder = `${targetFolder}/sample subfolder`;
        createDir(basePath);
        createDir(targetFolder);
        createDir(subfolder);
        createFileWithSize(targetFolder + "/a", 30);
        createFileWithSize(subfolder + "/sample file", 12);
        // Create this structure:
        //   test-files
        //    |testProject
        //      |a (file)
        //      |sample subfolder
        //       |sample file (file)
        //    |etc...
      }
    });

    afterAll(() => {
      rimraf.sync(testFolder);
    });

    it("Test folder should not be empty", () => {
      expect(isDirEmpty(testFolder)).toBeFalsy();
    });

    it("Should delete all folders created in test folder", async () => {
      for (const dirName of directories) {
        const path = `${testFolder}/${dirName}`;
        expect(existsSync(path)).toBeTruthy();
        await fileService.deleteDir(path);
        expect(existsSync(path)).toBeFalsy();
      }
      expect(isDirEmpty(testFolder)).toBeTruthy();
    });
  });

  describe("fakeDeleteDir", () => {
    it("Should return a Promise", () => {
      const result = fileService.fakeDeleteDir("/sample/path");
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
