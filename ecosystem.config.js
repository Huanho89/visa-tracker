module.exports = {
  apps: [
    {
      name: "visa-tracker",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    }
  ]
};
