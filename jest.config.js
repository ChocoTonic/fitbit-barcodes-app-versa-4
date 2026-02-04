export default {
    testEnvironment: "node",
    testMatch: ["**/tests/**/*.test.js"],
    transform: {},
    moduleFileExtensions: ["js"],
    collectCoverage: true,
    coverageReporters: ["lcov", "text"],
    coverageDirectory: "./",
};
