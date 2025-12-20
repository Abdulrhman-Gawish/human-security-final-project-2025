const fs = require("fs");
const path = require("path");
const Arborist = require("@npmcli/arborist");
const axios = require("axios");
const semver = require("semver");

const GH_TOKEN = process.env.GH_TOKEN || null;
const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_QUERY_URL = "https://api.osv.dev/v1/query";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const OUTPUT_JSON = path.resolve(process.cwd(), "vuln-report.json");

// Helper: get tree deps and mark direct/transitive
async function getTreeDeps() {
  const arb = new Arborist({ path: process.cwd() });
  const tree = await arb.loadActual();

  const deps = [];

  // Determine direct packages: children of root node
  const directNames = new Set();
  for (const c of tree.children.values()) {
    if (c?.package?.name && c.package.version) {
      directNames.add(c.package.name);
    }
  }

  function walk(node) {
    if (node?.package?.name && node.package.version) {
      deps.push({
        name: node.package.name,
        version: node.package.version,
        isDirect: directNames.has(node.package.name),
        location: node.location || null,
      });
    }
    for (const child of node.children.values()) {
      walk(child);
    }
  }

  walk(tree);
  const uniq = Array.from(new Map(deps.map(d => [d.name + "@" + d.version, d])).values());
  return uniq;
}

async function queryOsvBatch(deps) {
  const body = {
    queries: deps.map(d => ({
      package: { name: d.name, ecosystem: "npm" },
      version: d.version
    }))
  };

  const res = await axios.post(OSV_BATCH_URL, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000
  });

  return res.data.results;
}

// OSV single vuln query (fallback to get full details for given id)
async function queryOsvById(id) {
  try {
    const res = await axios.post(OSV_QUERY_URL, { id }, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

// Fetch GHSA details via GitHub GraphQL
async function fetchGhsaDetailsFromGitHub(ghsaId) {
  if (!GH_TOKEN) return null;

  const query = `
    query($ghsaId: String!) {
      securityAdvisory(ghsaId: $ghsaId) {
        ghsaId
        summary
        description
        severity
        identifiers {
          type
          value
        }
        references {
          url
        }
        vulnerabilities(first: 100) {
          nodes {
            package {
              ecosystem
              name
            }
            vulnerableVersionRange
            firstPatchedVersion {
              identifier
            }
          }
        }
      }
    }`;

  try {
    const res = await axios.post(GITHUB_GRAPHQL_URL,
      {
        query,
        variables: { ghsaId }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GH_TOKEN}`,
          "User-Agent": "osv-ghsa-scanner"
        },
        timeout: 20000
      }
    );

    if (res.data && res.data.data && res.data.data.securityAdvisory) {
      return res.data.data.securityAdvisory;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// determine source string
function detectSource(id) {
  if (!id) return "OSV";
  if (id.startsWith("GHSA")) return "GHSA";
  if (id.startsWith("CVE")) return "NVD";
  return "OSV";
}

// collect affected ranges & patched versions from OSV 'affected' object
function extractAffectedFromOsv(osvData) {
  if (!osvData || !Array.isArray(osvData.affected) || osvData.affected.length === 0) return [];
  const out = [];
  for (const a of osvData.affected) {
    const pkg = a.package || {};
    const ranges = (a.ranges || []).map(r => {
      const events = (r.events || []).map(e => JSON.stringify(e));
      return {
        type: r.type,
        events: (r.events || []).map(ev => {
          if (ev.fixed) return { fixed: ev.fixed };
          if (ev.introduced) return { introduced: ev.introduced };
          if (ev.limit) return { limit: ev.limit };
          return ev;
        })
      };
    });
    out.push({
      package: { ecosystem: pkg.ecosystem, name: pkg.name },
      ranges
    });
  }
  return out;
}

// Compare and recommend upgrade version (very simple): choose first patched version found in GHSA or OSV
function chooseUpgradeRecommendation(vulnDetail, depVersion) {
  if (!vulnDetail) return null;

  // try GHSA vulnerabilities nodes (if present)
  if (vulnDetail.vulnerabilities && Array.isArray(vulnDetail.vulnerabilities.nodes) && vulnDetail.vulnerabilities.nodes.length) {
    for (const node of vulnDetail.vulnerabilities.nodes) {
      const patched = node.firstPatchedVersion && node.firstPatchedVersion.identifier;
      if (patched) {
        // if depVersion is semver and patched is semver, suggest it
        if (semver.valid(depVersion) && semver.valid(patched)) {
          if (semver.lt(depVersion, patched)) return patched;
        } else {
          // fallback: return patched
          return patched;
        }
      }
    }
  }

  // OSV 'affected' may include events with fixed versions
  if (vulnDetail.affected && Array.isArray(vulnDetail.affected)) {
    for (const a of vulnDetail.affected) {
      for (const r of (a.ranges || [])) {
        for (const e of (r.events || [])) {
          if (e.fixed) {
            if (semver.valid(depVersion) && semver.valid(e.fixed)) {
              if (semver.lt(depVersion, e.fixed)) return e.fixed;
            } else {
              return e.fixed;
            }
          }
        }
      }
    }
  }

  return null;
}

async function scanWithOSVAndGHSA() {
  const deps = await getTreeDeps();
  if (!deps || deps.length === 0) {
    console.log("No dependencies found.");
    return;
  }

  console.log(`Scanning ${deps.length} unique packages (this may take a few seconds)...`);

  const osvResults = await queryOsvBatch(deps);

  const report = {
    generatedAt: new Date().toISOString(),
    depsCount: deps.length,
    results: []
  };

  let totalVulns = 0;

  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    const osvRes = osvResults[i] || {};
    const vulns = osvRes.vulns || [];

    if (!vulns || vulns.length === 0) continue;

    const pkgEntry = {
      name: dep.name,
      version: dep.version,
      isDirect: !!dep.isDirect,
      vulns: []
    };

    for (const v of vulns) {
      totalVulns++;

      const id = v.id;
      const source = detectSource(id);

      let summary = v.summary || null;
      let severity = (v.severity && v.severity.length > 0) ? `${v.severity[0].type}:${v.severity[0].score || "?"}` : null;
      let references = (v.references || []).map(r => r.url).filter(Boolean);
      let affected = v.affected || null;
      let detailed = null;
      let ghsaData = null;

      // If summary or severity missing, fetch detailed OSV object for this id
      let osvDetail = null;
      try {
        const osvd = await queryOsvById(id);
        if (osvd) {
          // osv returns vulnerability object or { id, summary, details, affected, references, severity }
          osvDetail = osvd;
          if (!summary) summary = osvd.summary || osvd.details || null;
          if (!severity && osvd.severity && osvDetail.severity.length) {
            severity = `${osvd.severity[0].type}:${osvd.severity[0].score || "?"}`;
          }
          if ((!references || references.length === 0) && osvDetail.references) {
            references = (osvDetail.references || []).map(r => r.url).filter(Boolean);
          }
          if (!affected && osvDetail.affected) {
            affected = osvDetail.affected;
          }
        }
      } catch (e) {
      }

      // If GHSA -> try GitHub GraphQL for full advisory (preferred)
      if (source === "GHSA" && GH_TOKEN) {
        try {
          const gh = await fetchGhsaDetailsFromGitHub(id);
          if (gh) {
            ghsaData = gh;
            // prefer GitHub fields
            summary = gh.summary || gh.description || summary;
            if (gh.severity) severity = gh.severity;
            if (gh.references && gh.references.length) references = gh.references.map(r => r.url).filter(Boolean);
            // collect affected ranges and patches from vulnerabilities.nodes
            if (gh.vulnerabilities && gh.vulnerabilities.nodes && gh.vulnerabilities.nodes.length) {
              affected = gh.vulnerabilities.nodes.map(n => ({
                package: n.package,
                vulnerableVersionRange: n.vulnerableVersionRange,
                firstPatchedVersion: n.firstPatchedVersion ? n.firstPatchedVersion.identifier : null
              }));
            }
            detailed = {
              source: "GitHub Advisory API",
              ghsaId: gh.ghsaId,
              description: gh.description || null
            };
          }
        } catch (e) {
        }
      }

      // Choose upgrade recommendation
      const upgradeTo = chooseUpgradeRecommendation(ghsaData || osvDetail || v, dep.version);

      const vulnEntry = {
        id,
        source,
        summary: summary || "No summary available",
        severity: severity || "Unknown",
        references,
        affected: affected ? (Array.isArray(affected) ? affected : [affected]) : [],
        firstPatched: upgradeTo || null,
        upgradeRecommended: upgradeTo ? `Upgrade to ${upgradeTo}` : null,
        raw_osv: osvDetail || null,
        raw_ghsa: ghsaData || null,
      };

      pkgEntry.vulns.push(vulnEntry);

      // Console pretty print per vuln
      console.log(`🚨 [${dep.isDirect ? "DIRECT" : "TRANSITIVE"}] ${dep.name}@${dep.version}`);
      console.log(`  ► ${id}`);
      console.log(`     Source: ${vulnEntry.source}`);
      console.log(`     Severity: ${vulnEntry.severity}`);
      if (vulnEntry.firstPatched) {
        console.log(`     Fixed / Suggested upgrade: ${vulnEntry.firstPatched}`);
      }
      if (vulnEntry.references && vulnEntry.references.length) {
        console.log(`     References:`);
        vulnEntry.references.slice(0,5).forEach(r => console.log(`       - ${r}`));
      }
      console.log(`     Summary: ${vulnEntry.summary}\n`);
    } // end for each vuln

    report.results.push(pkgEntry);
  } // end for deps

  report.summary = {
    totalDependencies: deps.length,
    totalVulnerabilities: totalVulns,
    generatedAt: new Date().toISOString()
  };

  // Save JSON report
  try {
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
    console.log(`Report saved to ${OUTPUT_JSON}`);
  } catch (e) {
    console.error("Failed to write report file:", e.message);
  }

  console.log("Scan complete.");
}

scanWithOSVAndGHSA().catch(err => {
  console.error("Scanner error:", err && err.message ? err.message : err);
});
