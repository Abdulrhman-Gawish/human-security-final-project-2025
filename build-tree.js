const Arborist = require("@npmcli/arborist");
const fs = require("fs");

function traverse(node, depth, path, result) {
  if (!node || !node.package) return;

  const pkgName = node.package.name;
  const pkgVersion = node.package.version;

  result.push({
    name: pkgName,
    version: pkgVersion,
    depth,
    path,
  });

  if (node.children && node.children.size > 0) {
    for (const child of node.children.values()) {
      traverse(child, depth + 1, path.concat(pkgName), result);
    }
  }
}

async function buildDependencyTree() {
  console.log(" Building dependency tree...");

  const arb = new Arborist({ path: process.cwd() });
  const tree = await arb.loadActual();

  const result = [];
  traverse(tree, 0, [], result);

  fs.writeFileSync("feature1-deps.json", JSON.stringify(result, null, 2));

  console.log(`Feature 1 DONE: Extracted ${result.length} dependencies → feature1-deps.json`);
}

buildDependencyTree();
