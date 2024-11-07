/* eslint-disable unicorn/prefer-event-target */
import {
  describe,
  expect,
  it,
  beforeEach,
  vi,
  afterEach,
  Mocked,
} from "vitest";
import EventEmitter from "node:events";

import { EVENTS } from "@/constants/workers.constants.js";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
import { SearchStatus } from "@/models/search-state.model.js";
import { WorkerMessage } from "@/services/files/files.worker.service.js";
import { LoggerService } from "@/services/logger.service.js";

const workerEmitter: EventEmitter = new EventEmitter();
const port1Emitter: EventEmitter = new EventEmitter();
const port2Emitter: EventEmitter = new EventEmitter();

const mocks = vi.hoisted(() => ({
  workerPostMessageMock: vi.fn(),
  workerTerminateMock: vi.fn().mockImplementation(() => new Promise(() => {})),
  messageChannelPort1Mock: vi.fn(),
  messageChannelPort2Mock: vi.fn(),
}));

vi.mock("node:os", () => ({
  default: { cpus: vi.fn().mockReturnValue([0, 0]) },
}));

vi.mock("node:worker_threads", () => ({
  Worker: vi.fn(() => ({
    postMessage: mocks.workerPostMessageMock,
    on: (eventName: string, listener: (...args: any[]) => void) =>
      workerEmitter.on(eventName, listener),
    terminate: mocks.workerTerminateMock,
    removeAllListeners: vi.fn(),
  })),

  MessageChannel: vi.fn(() => ({
    port1: {
      postMessage: mocks.messageChannelPort1Mock,
      on: (eventName: string, listener: (...args: any[]) => void) =>
        port1Emitter.on(eventName, listener),
      removeAllListeners: vi.fn(),
    },
    port2: {
      postMessage: mocks.messageChannelPort2Mock,
      on: (eventName: string, listener: (...args: any[]) => void) =>
        port2Emitter.on(eventName, listener),
      removeAllListeners: vi.fn(),
    },
  })),
}));

const logger = {
  info: vi.fn(),
} as unknown as Mocked<LoggerService>;

import { FileWorkerService } from "@/services/files/files.worker.service.js";
import { signal, Signal } from "@preact/signals-core";

describe("FileWorkerService", () => {
  let fileWorkerService: FileWorkerService;
  let searchStatus: SearchStatus;
  let params: IListDirParams;

  beforeEach(async () => {
    const aa = new URL("http://127.0.0.1"); // Any valid URL. Is not used
    vi.spyOn(global, "URL").mockReturnValue(aa);

    searchStatus = new SearchStatus();
    fileWorkerService = new FileWorkerService(logger, searchStatus);
    params = {
      path: "/path/to/directory",
      target: "node_modules",
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    workerEmitter.removeAllListeners();
    port1Emitter.removeAllListeners();
    port2Emitter.removeAllListeners();
  });

  describe("startScan", () => {
    let stream$: Signal<string> = signal("");

    beforeEach(() => {
      stream$ = signal<string>("");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should emit "explore" and parameters to the worker', () => {
      fileWorkerService.startScan(stream$, params);
      expect(mocks.messageChannelPort1Mock).toBeCalledWith({
        type: EVENTS.explore,
        value: { path: params.path },
      });
    });

    it('should emit result to the streams on "scanResult"', async () => {
      fileWorkerService.startScan(stream$, params);
      const val1 = ["/sample/path1/node_modules"];
      const val2 = ["/sample/path2/node_modules", "/sample/path3/otherDir"];

      const done = new Promise<string[]>((resolve) => {
        const result: string[] = [];
        stream$.subscribe((data) => {
          result.push(data);
          if (result.length === 3) {
            /*
            expect(result[0]).toBe(val1[0]);
            expect(result[1]).toBe(val2[0]);
            expect(result[2]).toBe(val2[1]);
            */
            console.debug("RESOLVE:", result);
            resolve(result);
          }
        });
      });

      port1Emitter.emit("message", {
        type: EVENTS.scanResult,
        value: {
          workerId: 1,
          results: [{ path: val1[0], isTarget: true }],
          pending: 0,
        },
      } as WorkerMessage);
      port1Emitter.emit("message", {
        type: EVENTS.scanResult,
        value: {
          workerId: 2,
          results: [
            { path: val2[0], isTarget: true },
            { path: val2[1], isTarget: true },
          ],
          pending: 342,
        },
      });

      const result = await done;
      console.debug("GOT:", result);
      expect(result[0]).toEqual("");
      expect(result[1]).toEqual(val1[0]);
      expect(result[2]).toEqual(val2[0]);
      expect(result[3]).toEqual(val2[1]);
    });

    it('should add a job on "scanResult" when folder is not a target', () => {
      fileWorkerService.startScan(stream$, params);
      const val = [
        "/path/1/valid",
        "/path/im/target",
        "/path/other/target",
        "/path/2/valid",
      ];

      port1Emitter.emit("message", {
        type: EVENTS.scanResult,
        value: {
          workerId: 1,
          results: [
            { path: val[0], isTarget: false },
            { path: val[1], isTarget: true },
            { path: val[2], isTarget: true },
            { path: val[3], isTarget: false },
          ],
          pending: 0,
        },
      } as WorkerMessage);

      expect(mocks.messageChannelPort1Mock).toBeCalledWith({
        type: EVENTS.explore,
        value: { path: val[0] },
      });

      expect(mocks.messageChannelPort1Mock).toHaveBeenCalledWith({
        type: EVENTS.explore,
        value: { path: val[3] },
      });

      expect(mocks.messageChannelPort1Mock).not.toHaveBeenCalledWith({
        type: EVENTS.explore,
        value: { path: val[2] },
      });
    });

    it('should update searchStatus workerStatus on "alive"', () => {
      fileWorkerService.startScan(stream$, params);
      port1Emitter.emit("message", {
        type: "alive",
        value: null,
      });

      expect(searchStatus.workerStatus).toBe("scanning");
    });

    it("should complete the stream and change worker status when all works have 0 pending tasks", async () => {
      fileWorkerService.startScan(stream$, params);
      const done = new Promise<string>((resolve) => {
        stream$.subscribe((value: string) => {
          resolve(value);
        });
      });

      port1Emitter.emit("message", {
        type: EVENTS.scanResult,
        value: {
          workerId: 0,
          results: [],
          pending: 0,
        },
      });

      await done;

      expect(searchStatus.workerStatus).toBe("finished");
    });

    it('should throw error on "error"', () => {
      expect(() => {
        fileWorkerService.startScan(stream$, params);
        workerEmitter.emit("error");
        expect(searchStatus.workerStatus).toBe("dead");
      }).toThrowError();
    });

    it('should register worker exit on "exit"', () => {
      fileWorkerService.startScan(stream$, params);

      logger.info.mockReset();
      workerEmitter.emit("exit");
      expect(logger.info).toBeCalledTimes(1);
    });
  });
});

// describe('getSize', () => {
//   let stream$: Subject<string>;
//   const path = '/sample/file/path';

//   const mockRandom = (value: number) =>
//     jest.spyOn(global.Math, 'random').mockReturnValue(value);

//   beforeEach(() => {
//     stream$ = new Subject<string>();
//     workerPostMessageMock.mockClear();
//   });

//   it('should emit "start-explore" and parameters to the worker', () => {
//     const randomNumber = 0.12341234;
//     mockRandom(randomNumber);

//     fileWorkerService.getSize(stream$, path);
//     expect(workerPostMessageMock).toBeCalledWith({
//       type: 'start-getSize',
//       value: { path: path, id: randomNumber },
//     });
//   });

//   it('should received "job completed" with same id, emit to the stream and complete it', (done) => {
//     const randomNumber = 0.8832342;
//     const response = 42342;
//     mockRandom(randomNumber);

//     fileWorkerService.getSize(stream$, path);

//     let streamValues = [];
//     stream$.subscribe({
//       next: (data) => {
//         streamValues.push(data);
//       },
//       complete: () => {
//         expect(streamValues.length).toBe(1);
//         expect(streamValues[0]).toBe(response);
//         done();
//       },
//     });

//     eventEmitter.emit('message', {
//       type: `getsize-job-completed-${randomNumber}`,
//       value: response,
//     });
//   });
// });
