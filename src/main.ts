import {
  ConsoleService,
  HttpsService,
  ResultsService,
  SpinnerService,
  UpdateService,
} from "@/services/index.js";
import { LinuxFilesService } from "@/services/files/linux-files.service.js";
import { MacFilesService } from "@/services/files/mac-files.service.js";
import { WindowsFilesService } from "@/services/files/windows-files.service.js";
import { Controller } from "@/controller.js";
import { FileWorkerService } from "@/services/files/files.worker.service.js";
import { UiService } from "@/services/ui.service.js";
import { LoggerService } from "@/services/logger.service.js";
import { SearchStatus } from "@/models/search-state.model.js";

const getOS = () => process.platform;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OSService: Partial<Record<NodeJS.Platform, any>> = {
  linux: LinuxFilesService,
  win32: WindowsFilesService,
  darwin: MacFilesService,
  aix: LinuxFilesService,
};

const logger = new LoggerService();
const searchStatus = new SearchStatus();

const fileWorkerService = new FileWorkerService(logger, searchStatus);

if (!(getOS() in OSService))
  throw new Error(`Platform ${getOS()} not supported!`);
const fileService = new OSService[getOS()](fileWorkerService);

export const controller = new Controller(
  logger,
  searchStatus,
  fileService,
  new SpinnerService(),
  new ConsoleService(),
  new UpdateService(new HttpsService()),
  new ResultsService(),
  new UiService(),
);

const npkill = () => controller.init();

export default npkill;
