module.exports = {
  apps: [
    {
      name: "ethans-eggs",
      cwd: __dirname + "/server",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
