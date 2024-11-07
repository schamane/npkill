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
import { StartParameters } from "@/models/start-parameters.model.js";
import type { IFolder } from "@/interfaces/folder.interface.js";
import { Controller } from "@/controller.js";
import { signal } from "@preact/signals-core";

const resultsUiDeleteMock$ = signal<IFolder>();
const setDeleteAllWarningVisibilityMock = vi.fn();

vi.mock("@/dirname.js", () => {
  return { default: "src/" };
});

vi.mock("@/ui/components/header/header.ui.js", () => ({
  HeaderUi: vi.fn(),
}));
vi.mock("@/ui/components/header/stats.ui.js", () => ({
  StatsUi: vi.fn(() => ({ render: vi.fn() })),
}));
vi.mock("@/ui/components/header/status.ui.js", () => ({
  StatusUi: vi.fn(() => ({
    start: vi.fn(),
    render: vi.fn(),
  })),
}));
vi.mock("@/ui/components/general.ui.js", () => ({
  GeneralUi: vi.fn(),
}));
vi.mock("@/ui/components/help.ui.js", () => ({
  HelpUi: vi.fn(),
}));
vi.mock("@/ui/components/results.ui.js", () => ({
  ResultsUi: vi.fn(() => ({
    delete$: resultsUiDeleteMock$,
    showErrors$: { subscribe: vi.fn() },
    openFolder$: { subscribe: vi.fn() },
    render: vi.fn(),
  })),
}));
vi.mock("@/ui/components/logs.ui.js", () => ({
  LogsUi: vi.fn(() => ({
    close$: { subscribe: vi.fn() },
  })),
}));
vi.mock("@/ui/components/warning.ui.js", () => ({
  WarningUi: vi.fn(() => ({
    setDeleteAllWarningVisibility: setDeleteAllWarningVisibilityMock,
    render: vi.fn(),
    confirm$: signal<void>(),
  })),
}));
vi.mock("@/ui/base.ui.js", () => ({
  BaseUi: { setVisible: vi.fn() },
}));
vi.mock("@/ui/heavy.ui.js", () => ({
  HeavyUi: {},
}));

describe("Controller test", () => {
  let controller: Controller;

  const filesServiceDeleteMock = vi.fn().mockResolvedValue(true);
  const filesServiceFakeDeleteMock = vi.fn().mockResolvedValue(true);

  const linuxFilesServiceMock: any = {
    getFileContent: vi.fn().mockReturnValue("{}"),
    isValidRootFolder: vi.fn().mockReturnValue("true"),
    isSafeToDelete: vi.fn().mockReturnValue("true"),
    deleteDir: filesServiceDeleteMock,
    fakeDeleteDir: filesServiceFakeDeleteMock,
  };
  const spinnerServiceMock: any = vi.fn();
  const UpdateServiceMock: any = vi.fn();
  const resultServiceMock: any = vi.fn();
  const searchStatusMock: any = vi.fn();
  const loggerServiceMock: any = {
    info: () => {},
    error: () => {},
    getSuggestLogFilePath: () => "",
    saveToFile: () => {},
  };
  const uiServiceMock: any = {
    add: () => {},
    print: () => {},
    setRawMode: () => {},
    setCursorVisible: () => {},
    renderAll: vi.fn(),
  };
  const consoleService: any = {
    getParameters: () => new StartParameters(),
    isRunningBuild: () => false,
    startListenKeyEvents: vi.fn(),
  };

  ////////// mocked Controller Methods
  let parseArgumentsSpy;
  let showHelpSpy;
  let prepareScreenSpy;
  let setupEventsListenerSpy;
  let initializeLoadingStatusSpy;
  let scanSpy;
  let checkVersionSpy;
  let exitSpy;
  ///////////////////////////////////

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((number) => {
      if (number) {
        throw new Error("process.exit: " + number);
      }
      return;
    });
    controller = new Controller(
      loggerServiceMock,
      searchStatusMock,
      linuxFilesServiceMock,
      spinnerServiceMock,
      consoleService,
      UpdateServiceMock,
      resultServiceMock,
      uiServiceMock,
    );

    Object.defineProperty(process.stdout, "columns", { value: 80 });
    Object.defineProperty(process.stdout, "isTTY", { value: true });

    parseArgumentsSpy = vi.spyOn(controller, "parseArguments");
    showHelpSpy = vi
      .spyOn(controller, "showHelp")
      .mockImplementation(() => ({}));
    prepareScreenSpy = vi
      .spyOn(controller, "prepareScreen")
      .mockImplementation(() => ({}));
    setupEventsListenerSpy = vi
      .spyOn(controller, "setupEventsListener")
      .mockImplementation(() => ({}));
    scanSpy = vi.spyOn(controller, "scan").mockImplementation(() => ({}));
    checkVersionSpy = vi
      .spyOn(controller, "checkVersion")
      .mockImplementation(() => ({}));
  });

  it("#init normal start should call some methods", () => {
    controller.init();
    expect(showHelpSpy).toHaveBeenCalledTimes(0);
    expect(setupEventsListenerSpy).toHaveBeenCalledTimes(1);
    expect(scanSpy).toHaveBeenCalledTimes(1);
    expect(checkVersionSpy).toHaveBeenCalledTimes(1);
  });

  describe("#getArguments", () => {
    const mockParameters = (parameters: object) => {
      consoleService.getParameters = () => {
        const startParameters = new StartParameters();
        for (const key of Object.keys(parameters)) {
          startParameters.add(key, parameters[key]);
        }
        return startParameters;
      };
      /*  jest
      .spyOn(consoleService, 'getParameters')
      .mockImplementation((rawArgv) => {
        return parameters;
      }); */
    };

    const spyMethod = (method, fn = () => {}) => {
      return vi.spyOn(controller, method).mockImplementation(fn);
    };

    afterEach(() => {
      // vi.spyOn(process, 'exit').mockReset();
      mockParameters({});
    });

    it("#showHelp should called if --help flag is present and exit", () => {
      mockParameters({ help: true });
      controller.init();
      // expect(() => controller.init()).toThrowError();
      expect(exitSpy).toHaveBeenCalledWith();
      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(showHelpSpy).toHaveBeenCalledTimes(1);
    });

    it("#showProgramVersion should called if --version flag is present and exit", () => {
      mockParameters({ version: true });
      const functionSpy = vi
        .spyOn(controller, "showProgramVersion")
        .mockImplementation(() => ({}));
      expect(() => controller.init()).toThrow();
      expect(functionSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });

    it("#checkVersionn should not be called if --no-check-updates is given", () => {
      mockParameters({ "no-check-updates": true });
      const functionSpy = spyMethod("checkVersion");
      controller.init();
      expect(functionSpy).toHaveBeenCalledTimes(0);
    });

    describe("--sort-by parameter   ", () => {
      it("Should detect if option is invalid", () => {
        mockParameters({ "sort-by": "novalid" });
        spyMethod("isValidSortParam", () => false);
        const functionSpy = spyMethod("invalidSortParam");
        controller.init();
        expect(functionSpy).toHaveBeenCalledTimes(1);
      });

      // TODO test that check sortBy property is changed
    });

    describe("--delete-all", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("Should show a warning before start scan", () => {
        mockParameters({ "delete-all": true });
        expect(setDeleteAllWarningVisibilityMock).toHaveBeenCalledTimes(0);
        expect(scanSpy).toHaveBeenCalledTimes(0);

        controller.init();
        expect(setDeleteAllWarningVisibilityMock).toHaveBeenCalledTimes(1);
        expect(scanSpy).toHaveBeenCalledTimes(0);
      });

      it("Should no show a warning if -y is given", () => {
        mockParameters({ "delete-all": true, yes: true });
        expect(setDeleteAllWarningVisibilityMock).toHaveBeenCalledTimes(0);
        expect(scanSpy).toHaveBeenCalledTimes(0);

        controller.init();
        expect(setDeleteAllWarningVisibilityMock).toHaveBeenCalledTimes(0);
        expect(scanSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("--dry-run", () => {
      let testFolder: IFolder;

      beforeEach(() => {
        testFolder = {
          path: "/my/path",
          size: 0,
          modificationTime: 0,
          isDangerous: false,
          status: "live",
        };
        vi.clearAllMocks();
      });

      it("Should call normal deleteDir function when no --dry-run is included", () => {
        controller.init();

        expect(filesServiceDeleteMock).toHaveBeenCalledTimes(0);
        expect(filesServiceFakeDeleteMock).toHaveBeenCalledTimes(0);

        resultsUiDeleteMock$.value = testFolder;

        expect(filesServiceFakeDeleteMock).toHaveBeenCalledTimes(0);
        expect(filesServiceDeleteMock).toHaveBeenCalledTimes(1);
        expect(filesServiceDeleteMock).toHaveBeenCalledWith(testFolder.path);
      });

      it("Should call fake deleteDir function instead of deleteDir", () => {
        mockParameters({ "dry-run": true });
        controller.init();

        expect(filesServiceDeleteMock).toHaveBeenCalledTimes(0);
        expect(filesServiceFakeDeleteMock).toHaveBeenCalledTimes(0);

        resultsUiDeleteMock$.value = testFolder;

        expect(filesServiceDeleteMock).toHaveBeenCalledTimes(0);
        expect(filesServiceFakeDeleteMock).toHaveBeenCalledTimes(1);
        expect(filesServiceFakeDeleteMock).toHaveBeenCalledWith(
          testFolder.path,
        );
      });
    });
  });
});
