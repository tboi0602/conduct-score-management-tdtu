if (process.platform === "win32" && typeof process.geteuid !== "function") {
  process.geteuid = () => process.pid;
}
