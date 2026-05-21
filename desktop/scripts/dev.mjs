import { spawn } from "node:child_process";

const run = (command, args, options = {}) => {
  const child = spawn(command, args, {
    shell: true,
    stdio: "inherit",
    ...options,
  });
  return child;
};

const waitForVite = async () => {
  const url = "http://127.0.0.1:5173";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Vite dev server did not become ready in time.");
};

const electronBuild = run("npm", ["run", "build:electron"]);

electronBuild.on("exit", async (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const vite = run("npm", ["run", "vite"]);
  await waitForVite();
  const electronEnv = {
    ...process.env,
    VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  const electron = run("npx", ["electron", "."], {
    env: electronEnv,
  });

  const shutdown = () => {
    vite.kill();
    electron.kill();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
