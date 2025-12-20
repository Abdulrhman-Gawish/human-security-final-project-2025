const Arborist = require("@npmcli/arborist");

async function getAllDependencies() {
  const arb = new Arborist({ path: process.cwd() });
  const tree = await arb.loadActual();

  const all = [];

  function traverse(node) {
    if (!node || !node.package) return;

    const name = node.package.name;
    const version = node.package.version;

    if (name && version) {
      all.push({ name, version });
    }

    for (const child of node.children.values()) {
      traverse(child);
    }
  }

  traverse(tree);

  // remove duplicates
  return Array.from(new Map(all.map(p => [p.name + "@" + p.version, p])).values());
}

getAllDependencies().then(list => {
  console.log("Total dependencies:", list.length);
  console.log(list);
});
