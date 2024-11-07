import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import EventEmitter from "node:events";
import { Dir } from "node:fs";
import path from "node:path";
import { MessageChannel, MessagePort } from "node:worker_threads";
import { EVENTS } from "@/constants/workers.constants.js";
import { IListDirParams } from "@/interfaces/list-dir-params.interface.js";
// import worker from '@/services/files/files.worker.js';

// eslint-disable-next-line unicorn/prefer-event-target
const parentEmitter: EventEmitter = new EventEmitter();
let tunnelEmitter: MessagePort;

const mocks = vi.hoisted(() => ({
  mockDir: {
    read: () => {
      return dirEntriesMock.length > 0
        ? Promise.resolve(dirEntriesMock.shift())
        : Promise.resolve(null);
    },
    close: () => {},
  } as unknown as Dir,
  tunnelPostMock: vi.fn(),
}));

let dirEntriesMock: { name: string; isDirectory: () => void }[] = [];
const basePath = "/home/user/";
const target = "node_modules";

vi.mock("fs/promises", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opendir: (_path: string) => Promise.resolve(mocks.mockDir),
}));

vi.mock("node:worker_threads", async (originalImport) => {
  const original = await originalImport<typeof import("node:worker_threads")>();
  return {
    ...original,
    parentPort: {
      postMessage: mocks.tunnelPostMock,
      on: (eventName: string, listener: (...args: any[]) => void) =>
        parentEmitter.on(eventName, listener),
    },
  };
});

const setExploreConfig = (params: IListDirParams) => {
  tunnelEmitter.postMessage({
    type: EVENTS.exploreConfig,
    value: params,
  });
};

describe("FileWorker", () => {
  beforeEach(async () => {
    const { port1, port2 } = new MessageChannel();
    tunnelEmitter = port1;

    parentEmitter.emit("message", {
      type: EVENTS.startup,
      value: { channel: port2 },
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    parentEmitter.removeAllListeners();
    tunnelEmitter.close();
  });

  // it('should plant a listener over the passed MessagePort',()=>{})

  it("eventing can be used for tests", async () => {
    const done = new Promise((resolve) => {
      tunnelEmitter.on("message", (message) => {
        console.log("CATCH MESSAGE", message);
        if (message.type === EVENTS.explore) {
          resolve(message.value.results);
        }
      });
    });

    tunnelEmitter.postMessage({
      type: EVENTS.explore,
      value: { path: "/home/user/" },
    });

    expect(done).toHaveResolved();
  });

  it("should return only sub-directories from given parent", async () => {
    setExploreConfig({ path: basePath, target });
    const subDirectories = [
      { name: "file1.txt", isDirectory: () => false },
      { name: "file2.txt", isDirectory: () => false },
      { name: "dir1", isDirectory: () => true },
      { name: "file3.txt", isDirectory: () => false },
      { name: "dir2", isDirectory: () => true },
    ];

    const expectedResult = subDirectories
      .filter((subdir) => subdir.isDirectory())
      .map((subdir) => ({
        path: path.join(basePath, subdir.name),
        isTarget: false,
      }));

    dirEntriesMock = [...subDirectories];

    const done = new Promise((resolve) => {
      tunnelEmitter.on("message", (message) => {
        if (message.type === EVENTS.scanResult) {
          resolve(message.value.results);
        }
      });
    });

    expect(done).resolves.toEqual(expectedResult);

    tunnelEmitter.postMessage({
      type: EVENTS.explore,
      value: { path: "/home/user/" },
    });
  });

  describe('should mark "isTarget" correctly', () => {
    const sampleTargets = ["node_modules", "dist"];

    for (const target of sampleTargets) {
      it("when target is " + target, async () => {
        setExploreConfig({ path: basePath, target: "node_modules" });
        const subDirectories = [
          { name: "file1.cs", isDirectory: () => false },
          { name: ".gitignore", isDirectory: () => false },
          { name: "dir1", isDirectory: () => true },
          { name: "node_modules", isDirectory: () => true },
          { name: "file3.txt", isDirectory: () => false },
          { name: "dir2", isDirectory: () => true },
        ];
        dirEntriesMock = [...subDirectories];

        const expectedResult = subDirectories
          .filter((subdir) => subdir.isDirectory())
          .map((subdir) => ({
            path: path.join(basePath, subdir.name),
            isTarget: subdir.name === "node_modules",
          }));

        const done = new Promise((resolve) => {
          tunnelEmitter.on("message", (message) => {
            if (message.type === EVENTS.scanResult) {
              resolve(message.value.results);
            }
          });
        });

        tunnelEmitter.postMessage({
          type: EVENTS.explore,
          value: { path: "/home/user/" },
        });
        expect(done).resolves.toEqual(expectedResult);
      });
    }
  });

  describe("should exclude dir", () => {
    it("when a simple patterns is gived", async () => {
      const excluded = ["ignorethis", "andignorethis"];
      setExploreConfig({
        path: basePath,
        target: "node_modules",
        exclude: excluded,
      });
      const subDirectories = [
        { name: "file1.cs", isDirectory: () => false },
        { name: ".gitignore", isDirectory: () => false },
        { name: "dir1", isDirectory: () => true },
        { name: "node_modules", isDirectory: () => true },
        { name: "ignorethis", isDirectory: () => true },
        { name: "andignorethis", isDirectory: () => true },
        { name: "dir2", isDirectory: () => true },
      ];
      dirEntriesMock = [...subDirectories];

      const expectedResult = subDirectories
        .filter(
          (subdir) => subdir.isDirectory() && !excluded.includes(subdir.name),
        )
        .map((subdir) => ({
          path: path.join(basePath, subdir.name),
          isTarget: subdir.name === "node_modules",
        }));

      const done = new Promise((resolve) => {
        tunnelEmitter.on("message", (message) => {
          if (message.type === EVENTS.scanResult) {
            resolve(message.value.results);
          }
        });
      });

      tunnelEmitter.postMessage({
        type: EVENTS.explore,
        value: { path: "/home/user/" },
      });
      expect(done).resolves.toEqual(expectedResult);
    });

    it("when a part of path is gived", async () => {
      const excluded = ["user/ignorethis"];
      setExploreConfig({
        path: basePath,
        target: "node_modules",
        exclude: excluded.map(path.normalize),
      });
      const subDirectories = [
        { name: "file1.cs", isDirectory: () => false },
        { name: ".gitignore", isDirectory: () => false },
        { name: "dir1", isDirectory: () => true },
        { name: "node_modules", isDirectory: () => true },
        { name: "ignorethis", isDirectory: () => true },
        { name: "andNOTignorethis", isDirectory: () => true },
        { name: "dir2", isDirectory: () => true },
      ];
      dirEntriesMock = [...subDirectories];

      const expectedResult = subDirectories
        .filter(
          (subdir) => subdir.isDirectory() && subdir.name !== "ignorethis",
        )
        .map((subdir) => ({
          path: path.join(basePath, subdir.name),
          isTarget: subdir.name === "node_modules",
        }));

      const done = new Promise((resolve) => {
        tunnelEmitter.on("message", (message) => {
          if (message.type === EVENTS.scanResult) {
            resolve(message.value.results);
          }
        });
      });

      tunnelEmitter.postMessage({
        type: EVENTS.explore,
        value: { path: "/home/user/" },
      });

      expect(done).resolves.toMatchObject(expectedResult);
    });
  });
});
