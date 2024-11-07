import { describe, expect, it, vi, afterEach, Mock } from "vitest";

const controllerConstructorMock = vi.fn();
const constructorInitMock = vi.fn();
const LinuxFilesService = vi.fn();
const MacFilesService = vi.fn();
const WindowsFilesService = vi.fn();
const fileWorkerServiceConstructorMock = vi.fn();

vi.mock("@/controller", () => ({
  Controller: controllerConstructorMock.mockImplementation(() => ({
    init: constructorInitMock,
  })),
}));

//#region mock of files services
vi.mock("@/services/files/linux-files.service.js", () => ({
  LinuxFilesService,
}));
vi.mock("@/services/files/mac-files.service.js", () => ({
  MacFilesService,
}));
vi.mock("@/services/files/windows-files.service.js", () => ({
  WindowsFilesService,
}));
vi.mock("@/services/files/files.worker.service.js", () => ({
  FileWorkerService: fileWorkerServiceConstructorMock,
}));
//#endregion

const mockOs = (platform: NodeJS.Platform) => {
  Object.defineProperty(process, "platform", {
    value: platform,
  });
};

const SERVICES_MOCKS = [
  LinuxFilesService,
  MacFilesService,
  WindowsFilesService,
];

const unusedServices = (serviceMock: Mock) =>
  [...SERVICES_MOCKS].filter((service) => service !== serviceMock);

const PlatformCases: { platform: NodeJS.Platform; service: Mock }[] = [
  { platform: "linux", service: LinuxFilesService },
  { platform: "darwin", service: MacFilesService },
  { platform: "win32", service: WindowsFilesService },
] as const;

describe("main", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("Should load correct File Service based on the OS", () => {
    it.each(PlatformCases)(
      "when OS is $platform",
      async ({ platform, service }) => {
        mockOs(platform);
        import("@/main.js");
        expect(service).toHaveBeenCalledTimes(0);
        await vi.dynamicImportSettled();
        const unused = unusedServices(service);

        expect(service).toHaveBeenCalledOnce();
        for (const otherService of unused)
          expect(otherService).not.toHaveBeenCalled();
      },
    );
  });
});
