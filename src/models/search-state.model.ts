import type { WorkerStatus } from "@/services/files/files.worker.service.js";

export class SearchStatus {
  public pendingSearchTasks = 0;
  public completedSearchTasks = 0;
  public pendingStatsCalculation = 0;
  public completedStatsCalculation = 0;
  public resultsFound = 0;
  public pendingDeletions = 0;
  public workerStatus: WorkerStatus = "stopped";
  public workersJobs: number[] = [];

  newResult(): void {
    this.resultsFound++;
    this.pendingStatsCalculation++;
  }

  completeStatCalculation(): void {
    this.pendingStatsCalculation--;
    this.completedStatsCalculation++;
  }
}
