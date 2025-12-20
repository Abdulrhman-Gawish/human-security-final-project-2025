const axios = require("axios");
const fs = require("fs");
const path = require("path");

function loadDeps() {
  const file = path.join(process.cwd(), "feature1-deps.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

// Build OSV batch request body
function buildBatchQuery(deps) {
  return {
    queries: deps.map(d => ({
      package: {
        name: d.name,
        ecosystem: "npm",
      },
      version: d.version,
    })),
  };
}

async function scanOSV() {
  const deps = loadDeps();
  console.log(` Scanning ${deps.length} dependencies via OSV...`);

  const body = buildBatchQuery(deps);

  const res = await axios.post("https://api.osv.dev/v1/querybatch", body, {
    headers: { "Content-Type": "application/json" },
  });

  const results = res.data.results;

  const vulnerabilities = [];

  for (let i = 0; i < results.length; i++) {
    const vulns = results[i].vulns;
    const dep = deps[i];

    if (vulns && vulns.length > 0) {
      vulnerabilities.push({
        package: dep.name,
        version: dep.version,
        depth: dep.depth,
        parents: dep.parents,
        vulns: vulns.map(v => ({
          id: v.id,
          summary: v.summary,
          severity:
            v.affected?.[0]?.ecosystem_specific?.severity || "UNKNOWN",
          details: v.details,
          ranges: v.affected?.[0]?.ranges || [],
        })),
      });
    }
  }

  fs.writeFileSync(
    "feature2-vulnerabilities.json",
    JSON.stringify(vulnerabilities, null, 2)
  );

  console.log(
    `\nFeature 2 DONE: Found ${vulnerabilities.length} vulnerable packages → feature2-vulnerabilities.json`
  );
}

scanOSV();
