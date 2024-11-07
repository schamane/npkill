import {
  ConsoleService,
  ResultsService,
  SpinnerService,
  UpdateService,
} from "@/services/index.js";
import { ERROR_MSG, INFO_MSGS } from "@/constants/messages.constants.js";
import { IFolder } from "@/interfaces/folder.interface.js";
import { IKeyPress } from "@/interfaces/key-press.interface.js";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { COLORS } from "@/constants/cli.constants.js";
import { FOLDER_SORT } from "@/constants/sort.result.js";
import {
  StatusUi,
  StatsUi,
  ResultsUi,
  LogsUi,
  InteractiveUi,
  HelpUi,
  HeaderUi,
  GeneralUi,
  WarningUi,
} from "@/ui/index.js";
import { LoggerService } from "@/services/logger.service.js";
import { UiService } from "@/services/ui.service.js";
import { SearchStatus } from "@/models/search-state.model.js";
import _dirname from "@/dirname.js";
import colors from "colors";
import { homedir } from "node:os";
import path from "node:path";
import openExplorer from "open-file-explorer";
import {
  DEFAULT_CONFIG,
  MIN_CLI_COLUMNS_SIZE,
  UI_POSITIONS,
} from "@/constants/main.constants.js";
import { inspect } from "node:util";
import { FileService } from "@/services/files/files.service.js";
import { computed, effect } from "@preact/signals-core";

const { stdin } = process;

export class Controller {
  private folderRoot = "";
  private readonly stdout = process.stdout;
  private readonly config = DEFAULT_CONFIG;

  private searchStart = Date.now();
  private searchDuration = 0;

  private uiHeader = new HeaderUi();
  private uiGeneral = new GeneralUi();
  private uiStats = new StatsUi(this.config, this.resultsService, this.logger);
  private uiStatus = new StatusUi(this.spinnerService, this.searchStatus);
  private uiResults = new ResultsUi(
    this.resultsService,
    this.consoleService,
    this.fileService,
  );
  private uiLogs = new LogsUi(this.logger);
  private uiWarning = new WarningUi();
  private activeComponent: InteractiveUi | undefined = undefined;

  constructor(
    private readonly logger: LoggerService,
    private readonly searchStatus: SearchStatus,
    private readonly fileService: FileService,
    private readonly spinnerService: SpinnerService,
    private readonly consoleService: ConsoleService,
    private readonly updateService: UpdateService,
    private readonly resultsService: ResultsService,
    private readonly uiService: UiService,
  ) {}

  init(): void {
    this.logger.info(process.argv.join(" "));
    this.logger.info(`Npkill started! v${this.getVersion()}`);
    this.initUi();
    if (this.consoleService.isRunningBuild()) {
      this.uiHeader.programVersion = this.getVersion();
    }

    this.consoleService.startListenKeyEvents();
    this.parseArguments();
    this.checkRequirements();
    this.prepareScreen();
    this.setupEventsListener();
    if (this.config.checkUpdates) {
      this.checkVersion();
    }

    if (this.config.deleteAll && !this.config.yes) {
      this.showDeleteAllWarning();
      this.uiWarning.confirm$.subscribe(() => {
        this.activeComponent = this.uiResults;
        this.uiWarning.setDeleteAllWarningVisibility(false);
        this.uiService.renderAll();
        this.scan();
      });

      return;
    }

    this.scan();
  }

  private showDeleteAllWarning(): void {
    this.uiWarning.setDeleteAllWarningVisibility(true);
    this.activeComponent = this.uiWarning;
  }

  private initUi(): void {
    this.uiHeader = new HeaderUi();
    this.uiService.add(this.uiHeader);
    this.uiResults = new ResultsUi(
      this.resultsService,
      this.consoleService,
      this.fileService,
    );
    this.uiService.add(this.uiResults);
    this.uiStats = new StatsUi(this.config, this.resultsService, this.logger);
    this.uiService.add(this.uiStats);
    this.uiStatus = new StatusUi(this.spinnerService, this.searchStatus);
    this.uiService.add(this.uiStatus);
    this.uiGeneral = new GeneralUi();
    this.uiService.add(this.uiGeneral);
    this.uiLogs = new LogsUi(this.logger);
    this.uiService.add(this.uiLogs);
    this.uiWarning = new WarningUi();
    this.uiService.add(this.uiWarning);

    // Set Events
    this.uiResults.delete$.subscribe((folder) => {
      if (folder) this.deleteFolder(folder);
    });
    this.uiResults.showErrors$.subscribe(() => this.showErrorPopup(true));
    this.uiLogs.close$.subscribe(() => this.showErrorPopup(false));
    this.uiResults.openFolder$.subscribe((path) => {
      if (path) openExplorer(path, () => {});
    });

    // Activate the main interactive component
    this.activeComponent = this.uiResults;
  }

  private parseArguments(): void {
    const options = this.consoleService.getParameters(process.argv);
    if (options.isTrue("help")) {
      this.showHelp();
      process.exit();
    }
    if (options.isTrue("version")) {
      this.showProgramVersion();
      process.exit();
    }
    if (options.isTrue("delete-all")) {
      this.config.deleteAll = true;
    }
    if (options.isTrue("sort-by")) {
      if (!this.isValidSortParam(options.getString("sort-by"))) {
        this.invalidSortParam();
      }
      this.config.sortBy = options.getString("sort-by");
    }

    const exclude = options.getString("exclude");

    if (exclude !== undefined && exclude !== "") {
      console.log("EXCLUDE", exclude);
      const userExcludeList = this.consoleService
        .splitData(this.consoleService.replaceString(exclude, '"', ""), ",")
        .map((path) => path.trim())
        .filter(Boolean)
        .map(path.normalize);

      // Add custom filters to the default exclude list.
      this.config.exclude = [...this.config.exclude, ...userExcludeList];
    }

    this.folderRoot = options.isTrue("directory")
      ? options.getString("directory")
      : process.cwd();
    if (options.isTrue("full-scan")) {
      this.folderRoot = homedir();
    }
    if (options.isTrue("hide-errors")) {
      this.config.showErrors = false;
    }
    if (options.isTrue("gb")) {
      this.config.folderSizeInGB = true;
    }
    if (options.isTrue("no-check-updates")) {
      this.config.checkUpdates = false;
    }
    if (options.isTrue("target-folder")) {
      this.config.targetFolder = options.getString("target-folder");
    }
    if (options.isTrue("bg-color")) {
      this.setColor(options.getString("bg-color"));
    }
    if (options.isTrue("exclude-hidden-directories")) {
      this.config.excludeHiddenDirectories = true;
    }

    if (options.isTrue("dry-run")) {
      this.config.dryRun = true;
      this.uiHeader.isDryRun = true;
    }

    if (options.isTrue("yes")) {
      this.config.yes = true;
    }

    // Remove trailing slash from folderRoot for consistency
    this.folderRoot = this.folderRoot.replace(/[/\\]$/, "");
  }

  private showErrorPopup(visible: boolean): void {
    this.uiLogs.setVisible(visible);
    // Need convert to pattern and have a stack for recover latest
    // component.
    this.uiResults.freezed = visible;
    this.uiStats.freezed = visible;
    this.uiStatus.freezed = visible;
    if (visible) {
      this.activeComponent = this.uiLogs;
      this.uiLogs.render();
    } else {
      this.activeComponent = this.uiResults;
      this.uiService.renderAll();
    }
  }

  private invalidSortParam(): void {
    this.uiService.print(INFO_MSGS.NO_VALID_SORT_NAME);
    this.logger.error(INFO_MSGS.NO_VALID_SORT_NAME);
    this.exitWithError();
  }

  private showHelp(): void {
    new HelpUi(this.consoleService).show();
  }

  private showProgramVersion(): void {
    this.uiService.print("v" + this.getVersion());
  }

  private setColor(color: string): void {
    if (this.isValidColor(color)) {
      this.config.backgroundColor = COLORS[color as keyof typeof COLORS] ?? "";
    }
  }

  private isValidColor(color: string) {
    return color in COLORS;
  }

  private isValidSortParam(sortName: string): boolean {
    return Object.keys(FOLDER_SORT).includes(sortName);
  }

  private getVersion(): string {
    const packageJson = path.join(_dirname, "..", "package.json");

    const packageData = JSON.parse(
      this.fileService.getFileContent(packageJson),
    );
    return packageData.version;
  }

  private prepareScreen(): void {
    this.uiService.setRawMode();
    // this.uiService.prepareUi();
    this.uiService.setCursorVisible(false);
    this.uiService.clear();
    this.uiService.renderAll();
  }

  private checkRequirements(): void {
    this.checkScreenRequirements();
    this.checkFileRequirements();
  }

  private checkScreenRequirements(): void {
    if (this.isTerminalTooSmall()) {
      this.uiService.print(INFO_MSGS.MIN_CLI_CLOMUNS);
      this.logger.error(INFO_MSGS.MIN_CLI_CLOMUNS);
      this.exitWithError();
    }
    if (!this.stdout.isTTY) {
      this.uiService.print(INFO_MSGS.NO_TTY);
      this.logger.error(INFO_MSGS.NO_TTY);
      this.exitWithError();
    }
  }

  private checkFileRequirements(): void {
    try {
      this.fileService.isValidRootFolder(this.folderRoot);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.uiService.print(error.message);
        this.logger.error(error.message);
      }
      this.exitWithError();
    }
  }

  private checkVersion(): void {
    this.logger.info("Checking updates...");
    this.updateService
      .isUpdated(this.getVersion())
      .then((isUpdated: boolean) => {
        if (isUpdated) {
          this.logger.info("Npkill is update");
        } else {
          this.showUpdateMessage();
          this.logger.info("New version found!");
        }
        return;
      })
      .catch((error: Error) => {
        const errorMessage =
          ERROR_MSG.CANT_GET_REMOTE_VERSION + ": " + error.message;
        this.newError(errorMessage);
      });
  }

  private showUpdateMessage(): void {
    const message = colors.magenta(INFO_MSGS.NEW_UPDATE_FOUND);
    this.uiService.printAt(message, UI_POSITIONS.NEW_UPDATE_FOUND);
  }

  private isTerminalTooSmall(): boolean {
    return this.stdout.columns <= MIN_CLI_COLUMNS_SIZE;
  }

  private printFoldersSection(): void {
    this.uiResults.render();
  }

  private setupEventsListener(): void {
    // Q: What is the type of the key?
    // Write the type of key

    stdin.on("keypress", (_, key: IKeyPress) => {
      if (key["name"] === "") {
        throw new Error("Invalid key: " + inspect(key));
      } else {
        this.keyPress(key);
      }
    });

    this.stdout.on("resize", () => {
      this.uiService.clear();
      this.uiService.renderAll();
    });

    process.on("uncaughtException", (error: Error) => {
      this.newError(error.message);
    });

    process.on("unhandledRejection", (error: Error) => {
      this.newError(error.stack ?? error.message);
    });
  }

  private keyPress(key: IKeyPress): void {
    const { name, ctrl } = key;

    if (this.isQuitKey(ctrl, name)) {
      this.quit();
    }

    if (this.activeComponent === null) {
      this.logger.error("activeComponent is NULL in Controller.");
      return;
    }

    this.activeComponent?.onKeyInput(key);
  }

  isExcludedDangerousDirectory = (path: string): boolean =>
    this.config.excludeHiddenDirectories && this.fileService.isDangerous(path);

  private scan(): void {
    this.uiStatus.start();
    const parameters: IListDirParams = this.prepareListDirParams();

    this.searchStart = Date.now();
    const folders$ = this.fileService.listDir(parameters);

    this.logger.info(`Scan started in ${parameters.path}`);

    const newResult = computed(() =>
      this.consoleService
        .splitData(folders$.value)
        .filter((path) => path !== ""),
    );

    /*
    const newResults$ = folders$.pipe(
      catchError((error, caught) => {
        this.newError(error.message);
        return caught;
      }),
      mergeMap((dataFolder) => from(this.consoleService.splitData(dataFolder))),
      filter((path) => path !== '')
    );
    */

    //const excludedResults$ = newResults$.pipe(filter((path) => this.isExcludedDangerousDirectory(path)));

    // const nonExcludedResults$ = newResults$.pipe(filter((path) => !this.isExcludedDangerousDirectory(path)));
    // const nonExcludedResults$ = newResults$.pipe(filter((path) => !this.isExcludedDangerousDirectory(path)));

    // const nonExcludedResults$ = computed(() => newResult.value.filter((path) => !this.isExcludedDangerousDirectory(path)));
    /*
    excludedResults$.subscribe(() => {
      // this.searchState.resultsFound++;
      // this.searchState.completedStatsCalculation++;
    });
    */

    effect(() => {
      const list = newResult.value
        .map((path) => ({
          path,
          size: 0,
          modificationTime: -1,
          isDangerous: this.fileService.isDangerous(path),
          status: "live",
        }))
        .filter(({ isDangerous }) => !isDangerous);
      for (const nodeFolder of list as IFolder[]) {
        this.searchStatus.newResult();
        this.resultsService.addResult(nodeFolder);
        this.logger.info(`Folder found: ${nodeFolder.path}`);

        if (this.config.sortBy === "path") {
          this.resultsService.sortResults(this.config.sortBy);
          this.uiResults.clear();
        }
        this.printFoldersSection();

        // second pass
        this.calculateFolderStats(nodeFolder);
        // this.searchStatus.completeStatCalculation();

        //this.printFoldersSection();

        /*

        .subscribe({
          next: () => this.printFoldersSection(),
          error: (error: string) => this.newError(error),
          complete: () => this.completeSearch()
        })
          */
        this.completeSearch();
      }
    });

    /*
    nonExcludedResults$
      .pipe(
        map<string, IFolder>((path) => ({
          path,
          size: 0,
          modificationTime: -1,
          isDangerous: this.fileService.isDangerous(path),
          status: 'live'
        })),
        tap((nodeFolder) => {
          this.searchStatus.newResult();
          this.resultsService.addResult(nodeFolder);
          this.logger.info(`Folder found: ${nodeFolder.path}`);

          if (this.config.sortBy === 'path') {
            this.resultsService.sortResults(this.config.sortBy);
            this.uiResults.clear();
          }
          this.printFoldersSection();
        }),
        mergeMap((nodeFolder) => {
          return this.calculateFolderStats(nodeFolder);
        }, 2),
        tap(() => this.searchStatus.completeStatCalculation()),
        tap((folder) => {
          if (this.config.deleteAll) {
            this.deleteFolder(folder);
          }
        })
      )
      .subscribe({
        next: () => this.printFoldersSection(),
        error: (error: string) => this.newError(error),
        complete: () => this.completeSearch()
      });
      */
  }

  private prepareListDirParams() {
    const target = this.config.targetFolder;
    const parameters: IListDirParams = {
      path: this.folderRoot,
      target,
      exclude: this.config.exclude,
    };

    if (this.config.exclude.length <= 0) {
      delete parameters.exclude;
    }
    return parameters;
  }

  private calculateFolderStats(nodeFolder: IFolder) {
    this.logger.info(`Calculating stats for ${nodeFolder.path}`);
    const folderSize = this.fileService.getFolderSize(nodeFolder.path);
    folderSize.subscribe((size) => {
      nodeFolder.size = this.fileService.convertKbToGB(+size);
      this.logger.info(`Size of ${nodeFolder.path}: ${size}kb`);

      this.finishFolderStats();
    });

    /*
    return sub.pipe(
      tap((size) => {
        nodeFolder.size = this.fileService.convertKbToGB(+size);
        this.logger.info(`Size of ${nodeFolder.path}: ${size}kb`);
      }),
      switchMap(async () => {
        // Saves resources by not scanning a result that is probably not of interest
        if (nodeFolder.isDangerous) {
          nodeFolder.modificationTime = -1;
          return nodeFolder;
        }
        const parentFolder = path.join(nodeFolder.path, '../');
        const result = await this.fileService.getRecentModificationInDir(parentFolder);
        nodeFolder.modificationTime = result;
        this.logger.info(`Last mod. of ${nodeFolder.path}: ${result}`);
        return nodeFolder;
      }),
      tap(() => {
        this.finishFolderStats();
      })
    );
    */
    /*
    return this.fileService.getFolderSize(nodeFolder.path).pipe(
      tap((size) => {
        nodeFolder.size = this.fileService.convertKbToGB(+size);
        this.logger.info(`Size of ${nodeFolder.path}: ${size}kb`);
      }),
      switchMap(async () => {
        // Saves resources by not scanning a result that is probably not of interest
        if (nodeFolder.isDangerous) {
          nodeFolder.modificationTime = -1;
          return nodeFolder;
        }
        const parentFolder = path.join(nodeFolder.path, '../');
        const result = await this.fileService.getRecentModificationInDir(parentFolder);
        nodeFolder.modificationTime = result;
        this.logger.info(`Last mod. of ${nodeFolder.path}: ${result}`);
        return nodeFolder;
      }),
      tap(() => {
        this.finishFolderStats();
      })
    );
    */
  }

  private finishFolderStats(): void {
    const needSort =
      this.config.sortBy === "size" || this.config.sortBy === "last-mod";
    if (needSort) {
      this.resultsService.sortResults(this.config.sortBy);
      this.uiResults.clear();
    }
    this.uiStats.render();
    this.printFoldersSection();
  }

  private completeSearch(): void {
    this.setSearchDuration();
    this.uiResults.completeSearch();
    this.uiStatus.completeSearch(this.searchDuration);
    this.logger.info(`Search completed after ${this.searchDuration}s`);
  }

  private setSearchDuration(): void {
    this.searchDuration = +((Date.now() - this.searchStart) / 1000).toFixed(2);
  }

  private isQuitKey(ctrl: boolean, name: string): boolean {
    return (ctrl && name === "c") || name === "q";
  }

  private exitWithError(): void {
    this.uiService.print("\n");
    this.uiService.setRawMode(false);
    this.uiService.setCursorVisible(true);
    const logPath = this.logger.getSuggestLogFilePath();
    this.logger.saveToFile(logPath);
    process.exit(1);
  }

  private quit(): void {
    this.uiService.setRawMode(false);
    this.uiService.clear();
    this.uiService.setCursorVisible(true);
    this.printExitMessage();
    this.logger.info("Thank for using npkill. Bye!");
    const logPath = this.logger.getSuggestLogFilePath();
    this.logger.saveToFile(logPath);
    process.exit();
  }

  private printExitMessage(): void {
    const { spaceReleased } = this.resultsService.getStats();
    new GeneralUi().printExitMessage({ spaceReleased });
  }

  private deleteFolder(folder: IFolder): void {
    if (folder.status === "deleted" || folder.status === "deleting") {
      return;
    }

    const isSafeToDelete = this.fileService.isSafeToDelete(
      folder.path,
      this.config.targetFolder,
    );

    if (!isSafeToDelete) {
      this.newError(`Folder not safe to delete: ${folder.path}`);
      return;
    }

    this.logger.info(`Deleting ${folder.path}`);
    folder.status = "deleting";
    this.searchStatus.pendingDeletions++;
    this.uiStatus.render();
    this.printFoldersSection();

    const deleteFunction: (path: string) => Promise<boolean> = this.config
      .dryRun
      ? this.fileService.fakeDeleteDir.bind(this.fileService)
      : this.fileService.deleteDir.bind(this.fileService);

    deleteFunction(folder.path)
      .then(() => {
        folder.status = "deleted";
        this.searchStatus.pendingDeletions--;
        this.uiStats.render();
        this.uiStatus.render();
        this.printFoldersSection();
        this.logger.info(`Deleted ${folder.path}`);
        return;
      })
      .catch((error) => {
        folder.status = "error-deleting";
        this.searchStatus.pendingDeletions--;
        this.uiStatus.render();
        this.printFoldersSection();
        this.newError(error.message);
      });
  }

  private newError(error: string): void {
    this.logger.error(error);
    this.uiStats.render();
  }
}
