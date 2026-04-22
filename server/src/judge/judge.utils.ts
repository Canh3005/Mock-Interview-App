export const DRIVER_MARKER = '<<<DRIVER_OUTPUT>>>';

export function parseDriverOutput(stdout: string | null): {
  userStdout: string;
  output: string;
} {
  const full = stdout ?? '';
  const idx = full.indexOf(DRIVER_MARKER);
  if (idx >= 0) {
    return {
      userStdout: full.substring(0, idx).trim(),
      output: full.substring(idx + DRIVER_MARKER.length).trim(),
    };
  }
  return { userStdout: '', output: full.trim() };
}
