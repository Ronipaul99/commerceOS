import { readdirSync, readFileSync } from "node:fs";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

export function findings(label, source) {
  const tree = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true);
  const result = [];
  const dynamic = new Set(["eval", "Function"]);
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const expr = node.expression;
      const name = ts.isIdentifier(expr) ? expr.text
        : ts.isPropertyAccessExpression(expr) ? expr.name.text
          : ts.isElementAccessExpression(expr) && ts.isStringLiteral(expr.argumentExpression)
            ? expr.argumentExpression.text : undefined;
      const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
      if (dynamic.has(name)) result.push({ label, line, rule: "DYNAMIC_CODE" });
      if (name === "exec" || name === "execSync") {
        // A regex's exec method is unrelated to child-process execution.
        if (ts.isIdentifier(expr) || (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)
          && ["childProcess", "proc", "child_process"].includes(expr.expression.text))) {
          result.push({ label, line, rule: "SHELL_EXEC" });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return result;
}

function sources(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    if (entry.name.startsWith(".") || ["node_modules", "dist", "coverage", "fixtures", "tests", "public", "test"].includes(entry.name)) return [];
    return entry.isDirectory() ? sources(file) : entry.isFile() && /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/.test(file) ? [file] : [];
  });
}

if (process.argv[1]?.endsWith("sast.mjs")) {
  const files = ["apps", "packages"].flatMap(sources);
  for (const file of files) {
    for (const finding of findings(file, readFileSync(file, "utf8"))) {
      console.error([finding.label, finding.line, finding.rule].join(":"));
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log("Targeted static analysis passed for " + files.length + " source files.");
}
