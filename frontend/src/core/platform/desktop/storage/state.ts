/**
 * In-memory migration lock state tracker.
 */
export class StorageMigrationState {
  private _isMigrating: boolean = false;

  isMigrationInProgress(): boolean {
    return this._isMigrating;
  }

  setMigrationInProgress(inProgress: boolean): void {
    this._isMigrating = inProgress;
  }
}
