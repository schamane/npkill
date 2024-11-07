import { describe, expect, test, beforeEach, vi } from "vitest";
import { HttpsService } from "@/services/https.service.js";
import { UpdateService } from "@/services/update.service.js";

const cases = [
  {
    isUpdated: false,
    localVersion: "2.3.6",
    remoteVersion: "2.4.0",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "2.3.6",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "2.3.6-0",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "2.3.6-2",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6-1",
    remoteVersion: "2.3.6-2",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "0.3.6",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "0.2.1",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "2.2.1",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "2.3.5",
  },
  {
    isUpdated: true,
    localVersion: "2.3.6",
    remoteVersion: "0.2.53",
  },
  {
    isUpdated: false,
    localVersion: "2.3.6",
    remoteVersion: "2.3.61",
  },
  {
    isUpdated: false,
    localVersion: "2.3.6",
    remoteVersion: "2.3.59",
  },
  {
    isUpdated: false,
    localVersion: "2.3.6",
    remoteVersion: "2.3.7",
  },
  {
    isUpdated: false,
    localVersion: "2.3.6-0",
    remoteVersion: "4.74.452",
  },
  {
    isUpdated: true,
    localVersion: "0.10.0",
    remoteVersion: "0.9.0",
  },
  {
    isUpdated: true,
    localVersion: "0.11.0",
    remoteVersion: "0.9.0",
  },
];

describe("update Service", () => {
  let updateService: UpdateService;
  let httpsService: HttpsService;

  beforeEach(() => {
    httpsService = new HttpsService();
    updateService = new UpdateService(httpsService);
  });

  describe("#isUpdated", () => {
    test.each(cases)(
      `should check the local version $localVersion is up to date with the remote $remoteVersion`,
      async ({ localVersion, remoteVersion, isUpdated }) => {
        const mockResponse = { "last-recomended-version": remoteVersion };
        vi.spyOn(httpsService, "getJson").mockResolvedValue(mockResponse);

        expect(await updateService.isUpdated(localVersion)).toBe(isUpdated);
      },
    );
  });
});
