export interface LoadingTask {
  name: string;
  action: () => Promise<void> | void;
  /** Max retries if the task fails (default: 2). Total attempts will be retries + 1 */
  retries?: number;
  /** Timeout in milliseconds per attempt (default: 20000) */
  timeoutMs?: number;
  /** Custom text to show during retries in English */
  retryName?: string;
  /** Callback executed after each attempt completes (whether success or error) */
  onAttemptComplete?: (attempt: number, success: boolean, error?: any) => Promise<void> | void;
}

export interface LoadingScreenProps {
  /** Indicates if the loading screen should be shown (for backwards compatibility) */
  isLoading?: boolean;
  /** Actual tasks to execute during loading */
  tasks?: LoadingTask[];
  /** Optional callback upon loading completion */
  onComplete?: () => void;
}

export interface UseLoadingTasksOptions {
  isLoading?: boolean;
  tasks?: LoadingTask[];
  onComplete?: () => void;
}

export interface UseLoadingTasksResult {
  progress: number;
  action: string;
  isFadingOut: boolean;
  isMounted: boolean;
}
