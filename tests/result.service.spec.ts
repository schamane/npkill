import { describe, expect, it, beforeEach } from "vitest";
import { ResultsService } from "@/services/results.service.js";
import type { IFolder } from "@/interfaces/folder.interface";

describe("Result Service", () => {
  let resultService: ResultsService;
  beforeEach(() => {
    resultService = new ResultsService();
  });

  describe("#addResult", () => {
    it("should add folder if that is the first", () => {
      const newResult: IFolder = {
        path: "path",
        size: 5,
        status: "live",
        modificationTime: 0,
        isDangerous: false,
      };
      const resultExpected = [newResult];
      resultService.addResult(newResult);
      expect(resultService.results).toMatchObject(resultExpected);
    });
    it("should add folders", () => {
      const newResults: IFolder[] = [
        {
          path: "path",
          size: 1,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "path2",
          size: 2,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "path3",
          size: 3,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
      ];

      const resultExpected = newResults;

      for (const result of newResults) resultService.addResult(result);
      expect(resultService.results).toMatchObject(resultExpected);
    });
  });

  describe("#sortResults", () => {
    let mockResults: IFolder[];
    beforeEach(() => {
      mockResults = [
        {
          path: "pathd",
          size: 5,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "patha",
          size: 6,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathc",
          size: 16,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathcc",
          size: 0,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathb",
          size: 3,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathz",
          size: 8,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
      ];

      resultService.results = [...mockResults];
    });

    it("should sort by path", () => {
      const expectResult = [
        {
          path: "patha",
          size: 6,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathb",
          size: 3,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathc",
          size: 16,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathcc",
          size: 0,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathd",
          size: 5,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathz",
          size: 8,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
      ];

      resultService.sortResults("path");
      expect(resultService.results).toMatchObject(expectResult);
    });
    it("should sort by size", () => {
      const expectResult = [
        {
          path: "pathc",
          size: 16,
          status: "live",
        },
        {
          path: "pathz",
          size: 8,
          status: "live",
        },
        {
          path: "patha",
          size: 6,
          status: "live",
        },
        {
          path: "pathd",
          size: 5,
          status: "live",
        },
        {
          path: "pathb",
          size: 3,
          status: "deleted",
        },
        {
          path: "pathcc",
          size: 0,
          status: "deleted",
        },
      ];

      resultService.sortResults("size");
      expect(resultService.results).toMatchObject(expectResult);
    });
    it("should not sort if method dont exist", () => {
      const expectResult = mockResults;

      resultService.sortResults("color");
      expect(resultService.results).toMatchObject(expectResult);
    });
  });

  describe("#getStats", () => {
    let mockResults: IFolder[];
    beforeEach(() => {
      mockResults = [
        {
          path: "pathd",
          size: 5,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "patha",
          size: 6,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathc",
          size: 16,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathcc",
          size: 0,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathb",
          size: 3,
          status: "deleted",
          modificationTime: 0,
          isDangerous: false,
        },
        {
          path: "pathz",
          size: 8,
          status: "live",
          modificationTime: 0,
          isDangerous: false,
        },
      ];

      resultService.results = [...mockResults];
    });

    it("should get stats of results", () => {
      const expectResult = {
        spaceReleased: "9.00 GB",
        totalSpace: "38.00 GB",
      };

      const stats = resultService.getStats();
      expect(stats).toMatchObject(expectResult);
    });
  });
});
