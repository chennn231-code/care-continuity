// Read-only metadata functions; no contents read except executable bytes for hashing.
import fs from 'node:fs';
import path from 'node:path';
import { demand, hash, contained, ContractError, parseJSON, shape } from './contracts.mjs';
import { packageProvenance } from './auditors.mjs';

export function executable(name, searchPath) {
  demand(['docker', 'podman', 'supabase', 'lsof'].includes(name), 'EXECUTABLE_NAME');
  demand(typeof searchPath === 'string'); const hits = [];
  for (const dir of searchPath.split(path.delimiter)) {
    demand(dir && path.isAbsolute(dir), 'PATH_AMBIGUOUS');
    const p = path.join(dir, name);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      const real = fs.realpathSync(p), stat = fs.statSync(real);
      demand(stat.isFile(), 'EXECUTABLE_NOT_FILE');
      hits.push({ original: p, resolved: real, sha256: hash(fs.readFileSync(real)) });
    } catch (e) { if (e.code !== 'ENOENT' && e.code !== 'ENOTDIR') throw new ContractError('EXECUTABLE_INSPECTION_ERROR'); }
  }
  const real = new Set(hits.map(h => h.resolved));
  demand(real.size <= 1, 'PATH_AMBIGUOUS');
  return hits.length ? { ...hits[0], aliases: hits.map(h => h.original) } : null;
}
export function canonicalMetadata(p, approvedRoot = null, io = fs) {
  demand(typeof p === 'string' && path.isAbsolute(p) && !p.includes('\0') && !p.split(path.sep).includes('..') && !p.startsWith('//'), 'PATH_FORM');
  const parts = p.split(path.sep).filter(Boolean), links = []; let current = path.parse(p).root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    try { if (io.lstatSync(current).isSymbolicLink()) links.push(current); }
    catch (e) {
      if (e.code !== 'ENOENT') throw new ContractError('PATH_INSPECTION_ERROR');
      return { original: p, absolute: path.resolve(p), realpath: null, exists: false, links, containment: 'UNESTABLISHED', mode: null, device: null, inode: null };
    }
  }
  const realpath = io.realpathSync(p), stat = io.statSync(realpath);
  let containment = 'NO_APPROVED_ROOT';
  if (approvedRoot !== null) {
    const root = io.realpathSync(approvedRoot);
    demand(contained(root, realpath), 'SYMLINK_ESCAPE');
    // Case folding and normalization are never used to manufacture equality.
    containment = 'COMPONENT_CONTAINED';
  }
  return { original: p, absolute: path.resolve(p), realpath, exists: true, links, containment, mode: (stat.mode & 0o777).toString(8), device: stat.dev, inode: stat.ino };
}
export function tokenPath(p, roots) {
  if (p === null) return null;
  const matches = Object.entries(roots).sort((a, b) => b[1].length - a[1].length);
  for (const [token, root] of matches) if (contained(root, p)) return token + (path.relative(root, p) ? '/' + path.relative(root, p) : '');
  if (p.startsWith('/Applications/Docker.app/')) return '$DOCKER_APP/' + p.slice('/Applications/Docker.app/'.length);
  if (/^\/(?:usr|opt\/homebrew|var\/run|private\/var\/run)\//.test(p)) return p;
  return '$UNAPPROVED_PATH';
}
export function homebrewProvenance(cellarRoot, formulaPath, expected = {}) {
  demand(path.isAbsolute(cellarRoot) && path.isAbsolute(formulaPath), 'PACKAGE_PATH');
  const receiptPath = path.join(cellarRoot, 'INSTALL_RECEIPT.json');
  const binaryPath = path.join(cellarRoot, 'bin', 'supabase');
  const receipt = parseJSON(fs.readFileSync(receiptPath));
  shape(receipt.source, ['tap', 'tap_git_head', 'spec', 'path', 'versions']);
  demand(receipt.source.tap === 'supabase/tap' && receipt.source.path === formulaPath, 'PACKAGE_SOURCE');
  demand(receipt.source.versions?.stable === expected.version && receipt.arch === expected.architecture, 'PACKAGE_VERSION_ARCH');
  const formula = fs.readFileSync(formulaPath, 'utf8');
  const version = formula.match(/^\s*version\s+"([^"]+)"\s*$/m)?.[1];
  const armBlock = formula.match(/on_macos do[\s\S]*?if Hardware::CPU\.arm\?[\s\S]*?url "([^"]+)"\s*\n\s*sha256 "([0-9a-f]{64})"/);
  demand(version === expected.version && armBlock && armBlock[1] === expected.archiveUrl && armBlock[2] === expected.archiveSha256, 'FORMULA_PROVENANCE');
  const binary = executable('supabase', path.dirname(path.dirname(binaryPath)) + path.delimiter + path.dirname(binaryPath));
  demand(binary && binary.resolved === fs.realpathSync(binaryPath), 'PACKAGE_BINARY_LINK');
  const decision = packageProvenance({ versionMatch: version === expected.version, architectureMatch: receipt.arch === expected.architecture, formulaArchiveMatch: armBlock[2] === expected.archiveSha256, receiptFormulaMatch: receipt.source.path === formulaPath, installedBinaryMatch: binary.sha256 === expected.installedBinarySha256 });
  return {
    packageManager: 'Homebrew', packageVersion: version, architecture: receipt.arch,
    formulaArchiveSha256: armBlock[2], installedBinarySha256: binary.sha256,
    sourceTapCommit: receipt.source.tap_git_head,
    result: decision.result, reason: decision.reason,
  };
}
