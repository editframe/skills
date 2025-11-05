const path = require("node:path");

module.exports = {
  plugins: [
    require("tailwindcss")({
      content: [path.join(__dirname, "src/**/*.ts")],
    }),
    require("autoprefixer")(),
  ],
};
