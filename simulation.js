const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function checkVulnerability(pkgName, version) {
  try {
    const response = await axios.post("https://api.osv.dev/v1/query", {
      package: { name: pkgName, ecosystem: "npm" },
      version: version,
    });

    return response.data.vulns || [];
  } catch (err) {
    console.error(`Error checking ${pkgName}@${version}:`, err.message);
    return [];
  }
}

async function simulateVulnerabilityScan() {
  const pkgPath = path.join(process.cwd(), "package.json");

  const packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  console.log("\nScanning dependencies for vulnerabilities...\n");

  for (const [pkg, versionRange] of Object.entries(deps)) {
    const version = versionRange.replace(/^[^0-9]+/, ""); // remove ^ ~ >=

    console.log(`Checking ${pkg}@${version} ...`);

    const vulns = await checkVulnerability(pkg, version);

    if (vulns.length > 0) {
      console.log(`\nVulnerabilities found in ${pkg}@${version}`);
      vulns.forEach((v) => {
        console.log(`- ID: ${v.id}`);
        console.log(`  Summary: ${v.summary}`);
        console.log(
          `  Severity: ${
            v?.affected?.[0]?.ecosystem_specific?.severity || "Unknown"
          }`
        );
        console.log("---");
      });
    } else {
      console.log(`No vulnerabilities found for ${pkg}@${version}\n`);
    }
  }
}

simulateVulnerabilityScan();
/**
  This script scans all dependencies (Should be build transitive dependencies) listed in a project’s package.json file and checks for known vulnerabilities using the OSV (Open Source Vulnerabilities) API.
  It sends each package name and version to https://api.osv.dev/v1/query and prints any reported vulnerabilities.

  imput fomrat

  {
  "package": {
    "name": "express",
    "ecosystem": "npm"
  },
  "version": "4.18.2"
  }

*/
