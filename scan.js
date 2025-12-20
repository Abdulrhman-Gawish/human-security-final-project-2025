
const Arborist = require("@npmcli/arborist");
const axios = require("axios");
const fs = require("fs");
const path = require("path");


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

  const unique = Array.from(
    new Map(all.map(p => [p.name + "@" + p.version, p])).values()
  );

  return unique;
}


function buildBatchPayload(deps) {
  return {
    queries: deps.map(({ name, version }) => ({
      package: {
        name,
        ecosystem: "npm"
      },
      version
    }))
  };
}


async function queryBatchOSV(deps) {
  const body = buildBatchPayload(deps);

  const response = await axios.post(
    "https://api.osv.dev/v1/querybatch",
    body,
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data.results; 
}


async function generateReport() {
  console.log("\nBuilding dependency tree (direct + transitive)...\n");

  const deps = await getAllDependencies();
  console.log(`Found ${deps.length} total installed packages.\n`);

  console.log("Querying OSV batch API...\n");

  const osvResults = await queryBatchOSV(deps);

  const report = [];

  for (let i = 0; i < deps.length; i++) {
    const pkg = deps[i];
    const vulns = osvResults[i].vulns || [];

    if (vulns.length > 0) {
      report.push({
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: vulns.map(v => ({
          id: v.id,
          summary: v.summary,
          affected_ranges: v.affected?.[0]?.ranges || [],
          severity:
            v.affected?.[0]?.ecosystem_specific?.severity ||
            v.severity ||
            "UNKNOWN"
        }))
      });
    }
  }

  const outPath = path.join(process.cwd(), "osv-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("DONE!");
  console.log("Report saved to: osv-report.json\n");

  if (report.length === 0) {
    console.log(" No vulnerabilities found in your dependency tree.");
  } else {
    console.log(`Found ${report.length} vulnerable packages!`);
  }
}


generateReport().catch(err => {
  console.error("Error:", err);
});
