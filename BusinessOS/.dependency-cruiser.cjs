module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-cross-app-imports",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
    {
      name: "no-shared-package-to-app-imports",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-private-package-imports-from-apps",
      severity: "error",
      from: { path: "^apps/" },
      to: {
        path: "^packages/",
        pathNot: "^(?:packages/[^/]+/src/index\\.ts|packages/ui-web/src/styles\\.css)$",
      },
    },
    {
      name: "no-private-package-imports-from-packages",
      severity: "error",
      from: { path: "^packages/([^/]+)/" },
      to: {
        path: "^packages/",
        pathNot: "^packages/(?:$1/|[^/]+/src/index\\.ts$)",
      },
    },
    {
      name: "no-private-domain-imports",
      severity: "error",
      from: { path: "^apps/([^/]+)/src/modules/([^/]+)/" },
      to: {
        path: "^apps/$1/src/modules/",
        pathNot: "^apps/$1/src/modules/(?:$2/|[^/]+/index\\.ts$)",
      },
    },
    {
      name: "no-unresolved-imports",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    exclude: "(^|/)(node_modules|dist|[.]next|[.]expo)(/|$)|next-env[.]d[.]ts$",
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "require", "node", "default"],
    },
  },
};
