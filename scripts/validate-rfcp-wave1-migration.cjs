'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const redirects = [
  ['/guides/how-to-find-government-contracts.html', 'https://federalcontractorportal.aproposgroupllc.com/guides/how-to-find-government-contracts/'],
  ['/guides/naics-code-government-contracts.html', 'https://federalcontractorportal.aproposgroupllc.com/guides/naics-codes-government-contracts/'],
  ['/guides/government-contract-matching-tool.html', 'https://federalcontractorportal.aproposgroupllc.com/federal-contract-opportunity-matching/'],
  ['/guides/sam-gov-registration-small-business.html', 'https://federalcontractorportal.aproposgroupllc.com/guides/sam-gov-registration-small-business/'],
  ['/guides/small-business-set-asides-explained.html', 'https://federalcontractorportal.aproposgroupllc.com/guides/federal-small-business-set-asides/'],
];
const retained = [
  'index.html',
  'about-capgen.html',
  'founder-story.html',
  'guides/index.html',
  'guides/capability-statement-government-contracts.html',
  'guides/sdvosb-government-contracts.html',
  'guides/how-to-write-government-contract-proposal.html',
  'guides/8a-program-eligibility-guide.html',
  'guides/hubzone-certification-guide.html',
  'guides/wosb-government-contracts.html',
  'guides/past-performance-government-contracts.html',
  'guides/teaming-agreements-government-contracts.html',
  'guides/sole-source-contracts-small-business.html',
  'guides/government-contract-types-explained.html',
];

const tomlPath = path.join(root, 'netlify.toml');
const sitemapPath = path.join(root, 'sitemap.xml');
if (!fs.existsSync(tomlPath)) failures.push('netlify.toml missing');
if (!fs.existsSync(sitemapPath)) failures.push('sitemap.xml missing');

const toml = fs.existsSync(tomlPath) ? fs.readFileSync(tomlPath, 'utf8') : '';
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';

for (const [source, destination] of redirects) {
  const sourceBlock = `from = "${source}"`;
  if (!toml.includes(sourceBlock)) failures.push(`missing redirect source ${source}`);
  if (!toml.includes(`to = "${destination}"`)) failures.push(`missing RFCP destination ${destination}`);
  const sourceIndex = toml.indexOf(sourceBlock);
  if (sourceIndex >= 0) {
    const next = toml.indexOf('[[redirects]]', sourceIndex + sourceBlock.length);
    const block = toml.slice(sourceIndex, next >= 0 ? next : toml.length);
    if (!/status\s*=\s*301/.test(block)) failures.push(`${source}: redirect is not 301`);
    if (!/force\s*=\s*true/.test(block)) failures.push(`${source}: redirect is not forced/direct`);
  }
  const oldAbsolute = `https://capgenmkt.aproposgroupllc.com${source}`;
  if (sitemap.includes(oldAbsolute)) failures.push(`migrated URL remains in CapGen sitemap: ${oldAbsolute}`);
}

if (/from\s*=\s*"\/guides\/?"/.test(toml)) failures.push('guide hub must not be redirected in Wave 1');
if (!sitemap.includes('https://capgenmkt.aproposgroupllc.com/guides/')) failures.push('CapGen guide hub missing from sitemap');
for (const file of retained) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`retained CapGen file missing: ${file}`);
}

const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const duplicates = sitemapLocs.filter((url, i) => sitemapLocs.indexOf(url) !== i);
if (duplicates.length) failures.push(`duplicate sitemap URLs: ${[...new Set(duplicates)].join(', ')}`);

if (failures.length) {
  console.error('[capgen-rfcp-wave1] Validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[capgen-rfcp-wave1] PASS — ${redirects.length} exact 301 migrations validated; CapGen brand and Wave 2 content retained.`);
