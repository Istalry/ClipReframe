/** Tracks in-flight cancellable jobs by id so `*:cancel` IPC calls can abort them. */
export class JobRegistry {
  private readonly controllers = new Map<string, AbortController>();

  start(jobId: string): AbortSignal {
    this.cancel(jobId);
    const controller = new AbortController();
    this.controllers.set(jobId, controller);
    return controller.signal;
  }

  finish(jobId: string): void {
    this.controllers.delete(jobId);
  }

  cancel(jobId: string): boolean {
    const controller = this.controllers.get(jobId);
    if (!controller) {
      return false;
    }
    controller.abort();
    this.controllers.delete(jobId);
    return true;
  }

  cancelAll(): void {
    for (const id of [...this.controllers.keys()]) {
      this.cancel(id);
    }
  }
}

export const jobs = new JobRegistry();
