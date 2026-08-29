import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as C from '../lib/contracts.mjs';
import * as A from '../lib/auditors.mjs';
import { canonicalMetadata, tokenPath } from '../lib/metadata.mjs';
import { allowedCommand, FORMATS, projectContainerInspectDocument, projectNetworkInspectDocument, projectImageInspectDocument, parseResource, inspectedCall, parseListeners, EXPECTED_IMAGE_ROLES } from '../inspect/prestart.mjs';
import * as F from '../fixtures/synthetic.mjs';
const clone = structuredClone;
const rejects = f => assert.throws(f);

test('strict JSON valid nested booleans/null/arrays', () => assert.equal(C.parseJSON('{"a":[1,true,null,{"x":"ok"}]}').a[3].x, 'ok'));
for (const [label, value] of Object.entries({ duplicate: '{"x":1,"x":2}', escapedDuplicate: '{"x":1,"\\u0078":2}', nestedDuplicate: '{"a":{"x":0,"x":1}}', malformed: '{oops}', truncated: '{"x":', trailing: '{}{}', proto: '{"__proto__":{}}', wrongNumber: '[1e999]', unsafeInteger: '[9007199254740993]', loneSurrogate: '["\\ud800"]', nonJSON: undefined })) test('JSON rejects ' + label, () => rejects(() => C.parseJSON(value)));
test('invalid UTF8 rejected', () => rejects(() => C.parseJSON(Buffer.from([0xff]))));
test('oversize JSON rejected', () => rejects(() => C.parseJSON(' '.repeat(4194305))));
test('too deep JSON rejected', () => rejects(() => C.parseJSON('['.repeat(45) + '0' + ']'.repeat(45))));
test('35-byte synthetic ID accepted', () => assert.equal(C.projectId(F.P), F.P));
for (const p of [null, F.P.slice(0, -1), F.P.toUpperCase(), F.P + ' ', F.P.replace('ww', 'ｗｗ')]) test('invalid ID ' + String(p).length, () => rejects(() => C.projectId(p)));
test('each ownership label matches independently', () => assert.equal(C.ownership(F.labels(), F.P).result, 'PASS'));
for (const mutation of ['missing', 'null', 'empty', 'wrong', 'mixed', 'prefix', 'space', 'unknown', 'wrongType']) test('ownership ' + mutation, () => {
  const l = F.labels(), k = C.LABELS[0];
  if (mutation === 'missing') delete l[k];
  if (mutation === 'null') l[k].value = null;
  if (mutation === 'empty') l[k].value = '';
  if (mutation === 'wrong' || mutation === 'mixed') l[k].value = F.otherP;
  if (mutation === 'prefix') l[k].value = F.P.slice(0, -2);
  if (mutation === 'space') l[k].value += ' ';
  if (mutation === 'unknown') l.extra = 'synthetic';
  if (mutation === 'wrongType') l[k].present = 'true';
  rejects(() => C.ownership(l, F.P));
});
test('historical missing labels preserved distinctly', () => {
  const l = Object.fromEntries(C.LABELS.map(k => [k, { present: false, value: null }])); assert.deepEqual(C.rawLabels(l), l);
  l[C.LABELS[0]].value = ''; rejects(() => C.rawLabels(l));
});
test('resource parser preserves raw name, labels and every binding', () => { const r = parseResource('container', JSON.stringify(F.rawContainer())); assert.equal(r.rawName, '/supabase_db_' + F.P); assert.equal(r.ports.length, 1); });
for (const type of ['missing', 'unknown', 'null', 'wrong', 'secret']) test('resource parser rejects ' + type, () => {
  const r = F.rawContainer(); if (type === 'missing') delete r.labels; if (type === 'unknown') r.Env = []; if (type === 'null') r.ports = null; if (type === 'wrong') r.rawName = ['bad']; if (type === 'secret') r.labels[C.LABELS[0]].value = 'password=' + 'synthetic-test';
  rejects(() => parseResource('container', JSON.stringify(r)));
});
test('container native JSON selects safe fields without host source, env or state error', () => {
  const selected = projectContainerInspectDocument(JSON.stringify(F.nativeContainerDocument()));
  const text = JSON.stringify(selected); assert.equal(text.includes('/daemon/private'), false); assert.equal(text.includes('SYNTHETIC_ENV'), false); assert.equal(text.includes('not-captured'), false);
  const parsed = parseResource('container', selected); assert.equal(parsed.mounts[0].name.value, 'synthetic-volume'); assert.equal(parsed.networks[0].networkId.value, F.net);
});
test('container native missing optional collections remain explicitly missing', () => {
  const raw = F.nativeContainerDocument(); delete raw[0].HostConfig.PortBindings; delete raw[0].NetworkSettings.Ports; delete raw[0].NetworkSettings.Networks; delete raw[0].Mounts;
  const parsed = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw)));
  for (const key of ['portsState', 'plannedPortsState', 'mountsState', 'networksState']) assert.equal(parsed[key], 'MISSING');
  assert.deepEqual([parsed.ports, parsed.plannedPorts, parsed.mounts, parsed.networks], [[], [], [], []]);
});
test('container native null optional collections remain explicitly null', () => {
  const raw = F.nativeContainerDocument(); raw[0].HostConfig.PortBindings = null; raw[0].NetworkSettings.Ports = null; raw[0].NetworkSettings.Networks = null; raw[0].Mounts = null;
  const parsed = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw)));
  for (const key of ['portsState', 'plannedPortsState', 'mountsState', 'networksState']) assert.equal(parsed[key], 'NULL');
});
test('container native empty optional collections remain explicitly empty', () => {
  const raw = F.nativeContainerDocument(); raw[0].HostConfig.PortBindings = {}; raw[0].NetworkSettings.Ports = {}; raw[0].NetworkSettings.Networks = {}; raw[0].Mounts = [];
  const parsed = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw)));
  for (const key of ['portsState', 'plannedPortsState', 'mountsState', 'networksState']) assert.equal(parsed[key], 'EMPTY');
});
test('container native bind mount preserves absent Name and Propagation without Source', () => {
  const raw = F.nativeContainerDocument(); raw[0].Mounts = [{ Type: 'bind', Source: '/private/not-captured', Destination: '/data', RW: false }];
  const mount = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw))).mounts[0];
  assert.equal(mount.name.state, 'MISSING'); assert.equal(mount.propagation.state, 'MISSING'); assert.equal(Object.hasOwn(mount, 'source'), false);
});
test('container native network optional identity and aliases preserve states', () => {
  const raw = F.nativeContainerDocument(); raw[0].NetworkSettings.Networks = { synthetic: { NetworkID: null, Aliases: null } };
  const network = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw))).networks[0];
  assert.equal(network.networkId.state, 'NULL'); assert.equal(network.endpointId.state, 'MISSING'); assert.equal(network.aliases.state, 'NULL');
});
test('container native runtime state missing fields are not fabricated', () => {
  const raw = F.nativeContainerDocument(); delete raw[0].State.Pid; delete raw[0].State.Status;
  const state = parseResource('container', projectContainerInspectDocument(JSON.stringify(raw))).runtimeState;
  assert.equal(state.pid.state, 'MISSING'); assert.equal(state.status.state, 'MISSING');
});
for (const [label, mutate] of [
  ['missing Config', raw => delete raw[0].Config], ['missing State', raw => delete raw[0].State], ['missing HostConfig', raw => delete raw[0].HostConfig],
  ['missing NetworkSettings', raw => delete raw[0].NetworkSettings], ['malformed Mounts', raw => { raw[0].Mounts = {}; }],
  ['malformed mount row', raw => { raw[0].Mounts = [{ Type: 'bind', Destination: '/data', RW: 'yes' }]; }],
  ['malformed Networks', raw => { raw[0].NetworkSettings.Networks = []; }], ['malformed aliases', raw => { raw[0].NetworkSettings.Networks.synthetic = { Aliases: 'bad' }; }],
  ['malformed state integer', raw => { raw[0].State.Pid = 1.5; }],
]) test(`container native malformed shape rejected: ${label}`, () => { const raw = F.nativeContainerDocument(); mutate(raw); rejects(() => projectContainerInspectDocument(JSON.stringify(raw))); });
test('container native JSON rejects empty, malformed and multiple documents', () => { rejects(() => projectContainerInspectDocument('[]')); rejects(() => projectContainerInspectDocument('{')); rejects(() => projectContainerInspectDocument(JSON.stringify([...F.nativeContainerDocument(), ...F.nativeContainerDocument()]))); });
test('container inspect command allows one validated ID without format', () => assert.equal(allowedCommand(['--context', 'desktop-linux', 'container', 'inspect', F.id]), true));
test('container inspect command rejects format template, missing and noncanonical IDs', () => {
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'container', 'inspect', '--format', '{{json .}}', F.id]), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'container', 'inspect']), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'container', 'inspect', 'sha256:' + F.id]), false);
});
const classifyVolumePath = p => C.daemonVolumePathProjection(p, '/var/lib/docker');
test('volume projection accepts standard local volume without persisting Mountpoint', () => {
  const v = parseResource('volume', F.rawVolume(), classifyVolumePath);
  assert.equal(v.driverClass, 'LOCAL'); assert.equal(v.mountpoint.classification, 'DAEMON_STORAGE');
  assert.match(v.mountpoint.identity, /^path:DAEMON_VOLUME:resolved:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(v).includes('/var/lib/docker/volumes'), false);
});
test('volume projection preserves missing optional fields', () => {
  const r = F.rawVolume(); delete r.scope; delete r.mountpoint;
  const v = parseResource('volume', r, classifyVolumePath);
  assert.deepEqual(v.scope, { state: 'MISSING', value: null }); assert.deepEqual(v.mountpoint, { classification: 'MISSING', identity: null });
});
test('volume projection preserves null optional fields', () => {
  const r = F.rawVolume(); r.scope = null; r.mountpoint = null;
  const v = parseResource('volume', r, classifyVolumePath);
  assert.deepEqual(v.scope, { state: 'NULL', value: null }); assert.deepEqual(v.mountpoint, { classification: 'NULL', identity: null });
});
test('volume projection preserves empty optional strings distinctly', () => {
  const r = F.rawVolume(); r.scope = ''; r.mountpoint = '';
  const v = parseResource('volume', r, classifyVolumePath);
  assert.deepEqual(v.scope, { state: 'EMPTY', value: '' }); assert.deepEqual(v.mountpoint, { classification: 'EMPTY', identity: null });
});
test('volume labels null and empty states remain distinct', () => {
  const a = F.rawVolume(); a.labelsState = 'NULL'; const b = F.rawVolume(); b.labelsState = 'EMPTY';
  assert.equal(parseResource('volume', a, classifyVolumePath).labelsState, 'NULL');
  assert.equal(parseResource('volume', b, classifyVolumePath).labelsState, 'EMPTY');
});
test('volume options missing and empty states remain distinct', () => {
  const a = F.rawVolume(); a.optionsState = 'NULL'; const b = F.rawVolume(); b.optionsState = 'EMPTY';
  assert.equal(parseResource('volume', a, classifyVolumePath).optionsState, 'NULL');
  assert.equal(parseResource('volume', b, classifyVolumePath).optionsState, 'EMPTY');
});
test('volume options present never include option values', () => {
  const r = F.rawVolume(); r.optionsState = 'PRESENT_NOT_CAPTURED';
  const v = parseResource('volume', r, classifyVolumePath); assert.equal(v.optionsState, 'PRESENT_NOT_CAPTURED'); assert.equal(Object.hasOwn(v, 'options'), false);
});
test('volume unexpected safe driver is classified without special-casing a resource', () => {
  const r = F.rawVolume(); r.driver = 'synthetic-driver'; assert.equal(parseResource('volume', r, classifyVolumePath).driverClass, 'OTHER_SAFE');
});
test('volume malformed name rejected', () => { const r = F.rawVolume(); r.name = '../bad'; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume missing labels rejected', () => { const r = F.rawVolume(); delete r.labels; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume malformed labels rejected', () => { const r = F.rawVolume(); r.labels = []; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume malformed options state rejected', () => { const r = F.rawVolume(); r.optionsState = {}; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume unexpected safety-relevant field rejected', () => { const r = F.rawVolume(); r.Options = { secret: 'not-inspected' }; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume malformed mountpoint token rejected', () => { const r = F.rawVolume(); rejects(() => parseResource('volume', r, () => ({ classification: 'DAEMON_STORAGE', identity: 'bad' }))); });
test('volume foreign ownership rejected by exact ownership contract', () => { const r = F.rawVolume(); r.labels[C.LABELS[0]].value = F.otherP; const v = parseResource('volume', r, classifyVolumePath); rejects(() => C.ownership(v.labels, F.P)); });
test('volume unapproved ownership label rejected', () => { const r = F.rawVolume(); r.labels.unapproved = { present: true, value: F.P }; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume ambiguous path classification rejected', () => { const r = F.rawVolume(); rejects(() => parseResource('volume', r, () => ({ classification: 'AMBIGUOUS', identity: null }))); });
test('volume pipeline raw parse failure is distinct', () => rejects(() => parseResource('volume', '{')));
test('volume pipeline projection failure is distinct', () => { const r = F.rawVolume(); delete r.driver; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume pipeline tokenization failure is distinct', () => rejects(() => C.daemonVolumePathProjection('relative/path', '/var/lib/docker')));
test('volume pipeline schema failure is distinct', () => { const r = F.rawVolume(); r.scope = []; rejects(() => parseResource('volume', r, classifyVolumePath)); });
test('volume comparator rejects duplicate resources', () => { const v = parseResource('volume', F.rawVolume(), classifyVolumePath); rejects(() => C.uniqueRecords([v, clone(v)], 'name')); });
test('volume comparator rejects unmatched consumer relationship', () => { const g = F.topology(); g.volumes[0].consumers = []; rejects(() => C.graph(g, F.topology())); });
const envelopeSchema = () => JSON.parse(fs.readFileSync(new URL('../schemas/evidence.schema.json', import.meta.url), 'utf8'));
test('schema document uses supported dialect and expected selector', () => assert.equal(C.validateSchemaDocumentHeader(envelopeSchema(), 'Foundation reviewed pre-start evidence envelope').result, 'PASS'));
test('wrong schema selected is distinct', () => { const s = envelopeSchema(); s.title = 'Wrong'; rejects(() => C.validateSchemaDocumentHeader(s, 'Foundation reviewed pre-start evidence envelope')); });
test('unsupported schema dialect is distinct', () => { const s = envelopeSchema(); s.$schema = 'https://example.invalid/unsupported'; rejects(() => C.validateSchemaDocumentHeader(s, 'Foundation reviewed pre-start evidence envelope')); });
test('malformed schema document is rejected before selection', () => rejects(() => C.parseJSON('{')));
test('builtin bridge network is non-candidate', () => assert.equal(parseResource('network', F.builtinNetwork('bridge', 'bridge')).resourceClass, 'BUILTIN_NETWORK'));
test('builtin host network accepts null IPAM without candidate ownership', () => { const n = parseResource('network', F.builtinNetwork('host', 'host')); assert.equal(n.resourceClass, 'BUILTIN_NETWORK'); assert.equal(n.ipamConfigState, 'NULL'); assert.equal(n.ownershipApplicability, 'NOT_APPLICABLE'); });
test('builtin none network is non-candidate', () => assert.equal(parseResource('network', F.builtinNetwork('none', 'null')).resourceClass, 'BUILTIN_NETWORK'));
test('user-defined bridge remains observed, not automatically accepted', () => { const n = parseResource('network', F.rawNetwork()); assert.equal(n.resourceClass, 'USER_DEFINED_NETWORK'); assert.equal(n.ownershipApplicability, 'OBSERVED_LABELS_ONLY'); });
test('network labels missing state is preserved', () => { const r = F.rawNetwork(); r.labelsState = 'NULL'; for (const k of C.LABELS) r.labels[k] = { present: false, value: null }; assert.equal(parseResource('network', r).labelsState, 'NULL'); });
test('network labels empty state is preserved', () => { const r = F.rawNetwork(); r.labelsState = 'EMPTY'; for (const k of C.LABELS) r.labels[k] = { present: false, value: null }; assert.equal(parseResource('network', r).labelsState, 'EMPTY'); });
test('network foreign label fails exact ownership contract', () => { const r = F.rawNetwork(); r.labels[C.LABELS[0]].value = F.otherP; const n = parseResource('network', r); rejects(() => C.ownership(n.labels, F.P)); });
test('network mixed ownership fails exact ownership contract', () => { const r = F.rawNetwork(); r.labels[C.LABELS[1]].value = F.otherP; const n = parseResource('network', r); rejects(() => C.ownership(n.labels, F.P)); });
test('network unknown safe driver is observed as user-defined', () => { const r = F.rawNetwork(); r.driver = 'synthetic-driver'; assert.equal(parseResource('network', r).resourceClass, 'USER_DEFINED_NETWORK'); });
test('network internal and attachable flags are preserved', () => { const r = F.rawNetwork(); r.internal = true; r.attachable = false; const n = parseResource('network', r); assert.equal(n.internal, true); assert.equal(n.attachable, false); });
test('network IPAM null state is distinct', () => { const r = F.rawNetwork(); r.ipamConfigState = 'NULL'; r.ipamConfig = []; assert.equal(parseResource('network', r).ipamConfigState, 'NULL'); });
test('network IPAM empty state is distinct', () => { const r = F.rawNetwork(); r.ipamConfigState = 'EMPTY'; r.ipamConfig = []; assert.equal(parseResource('network', r).ipamConfigState, 'EMPTY'); });
test('network single IPAM config is tokenized', () => { const n = parseResource('network', F.rawNetwork()); assert.equal(n.ipam.length, 1); assert.equal(JSON.stringify(n).includes('172.28.0.0'), false); assert.equal(n.ipam[0].subnet.classification, 'IPV4'); });
test('network multiple IPAM configs are retained', () => { const r = F.rawNetwork(); r.ipamConfig.push({ subnet: 'fd00::/64', gateway: 'fd00::1', ipRange: '', auxiliaryAddresses: { presence: 'ABSENT', count: 0, token: null } }); assert.equal(parseResource('network', r).ipam.length, 2); });
test('network IPv6 IPAM is classified without raw address persistence', () => { const r = F.rawNetwork(); r.ipv6 = true; r.ipamConfig = [{ subnet: 'fd00::/64', gateway: 'fd00::1', ipRange: '', auxiliaryAddresses: { presence: 'ABSENT', count: 0, token: null } }]; const n = parseResource('network', r); assert.equal(n.ipam[0].subnet.classification, 'IPV6'); assert.equal(JSON.stringify(n).includes('fd00::'), false); });
test('network malformed IPAM rejected', () => { const r = F.rawNetwork(); r.ipamConfig = [{ subnet: [], gateway: '', ipRange: '', auxiliaryAddresses: { presence: 'ABSENT', count: 0, token: null } }]; rejects(() => parseResource('network', r)); });
test('network zero attachments preserved separately', () => { const r = F.rawNetwork(); r.attachments = []; assert.deepEqual(parseResource('network', r).attachmentEdges, []); });
test('network one attachment preserved separately', () => assert.equal(parseResource('network', F.rawNetwork()).attachmentEdges.length, 1));
test('network multiple attachments preserved separately', () => { const r = F.rawNetwork(); r.attachments.push({ containerId: 'e'.repeat(64), name: 'other', endpointId: 'f'.repeat(64) }); assert.equal(parseResource('network', r).attachmentEdges.length, 2); });
test('network foreign attachment remains relationship evidence and comparator rejects it', () => { const g = F.topology(); g.networks[0].containers.push('foreign'); rejects(() => C.graph(g, F.topology())); });
test('network malformed attachment rejected', () => { const r = F.rawNetwork(); r.attachments[0].endpointId = null; rejects(() => parseResource('network', r)); });
test('network duplicate attachment edge rejected', () => { const r = F.rawNetwork(); r.attachments.push(clone(r.attachments[0])); rejects(() => parseResource('network', r)); });
test('network comparator rejects missing network', () => { const g = F.topology(); g.networks = []; rejects(() => C.graph(g, F.topology())); });
test('network comparator rejects unexpected network', () => { const g = F.topology(); g.networks.push({ id: 'e'.repeat(64), containers: [] }); rejects(() => C.graph(g, F.topology())); });
test('network comparator rejects duplicate network', () => { const g = F.topology(); g.networks.push(clone(g.networks[0])); rejects(() => C.graph(g, F.topology())); });
test('network ambiguous name cannot imply builtin status', () => { const r = F.builtinNetwork('bridge', 'bridge'); r.driver = 'synthetic-driver'; assert.equal(parseResource('network', r).resourceClass, 'USER_DEFINED_NETWORK'); });
test('network identity mismatch rejected by graph comparator', () => { const g = F.topology(); g.containers[0].networks[0] = 'e'.repeat(64); rejects(() => C.graph(g, F.topology())); });
test('network ownership mismatch rejected independently', () => { const r = F.rawNetwork(); r.labels[C.LABELS[0]].value = F.otherP; rejects(() => C.ownership(parseResource('network', r).labels, F.P)); });
test('network native JSON single builtin projects before semantic parsing', () => {
  const raw = F.nativeNetworkDocument({ Name: 'host', Driver: 'host', IPAM: { Driver: 'default', Config: null }, Options: null, Labels: null, Containers: null });
  const n = parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw)));
  assert.equal(n.resourceClass, 'BUILTIN_NETWORK'); assert.equal(n.ipamConfigState, 'NULL'); assert.deepEqual(n.attachmentEdges, []);
});
test('network native JSON single user-defined projects only selected safe fields', () => {
  const raw = F.nativeNetworkDocument(), selected = projectNetworkInspectDocument(JSON.stringify(raw));
  assert.equal(selected.id, F.net); assert.equal(selected.attachments.length, 1); assert.equal(Object.hasOwn(selected, 'Peers'), false);
  assert.equal(JSON.stringify(selected).includes('172.28.0.0'), true); const n = parseResource('network', selected); assert.equal(JSON.stringify(n).includes('172.28.0.0'), false);
});
test('network native missing IPRange remains absent rather than fabricated null', () => {
  const raw = F.nativeNetworkDocument(); delete raw[0].IPAM.Config[0].IPRange;
  const selected = projectNetworkInspectDocument(JSON.stringify(raw));
  assert.equal(Object.hasOwn(selected.ipamConfig[0], 'ipRange'), false);
  assert.deepEqual(parseResource('network', selected).ipam[0].ipRange, { presence: 'ABSENT', classification: 'ABSENT', token: null });
});
test('network native null IPRange remains distinct', () => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config[0].IPRange = null;
  assert.deepEqual(parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))).ipam[0].ipRange, { presence: 'NULL', classification: 'NULL', token: null });
});
test('network native empty IPRange remains present and empty', () => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config[0].IPRange = '';
  assert.deepEqual(parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))).ipam[0].ipRange, { presence: 'PRESENT', classification: 'EMPTY', token: null });
});
for (const [label, value, classification] of [['IPv4', '10.0.0.0/24', 'IPV4'], ['IPv6', 'fd00::/64', 'IPV6']]) test(`network native valid ${label} IPRange is tokenized`, () => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config[0].IPRange = value;
  const projected = parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))).ipam[0].ipRange;
  assert.equal(projected.presence, 'PRESENT'); assert.equal(projected.classification, classification); assert.equal(JSON.stringify(projected).includes(value), false);
});
for (const value of ['not-a-cidr', '10.0.0.0', '10.0.0.0/33', 'fd00::/129', 'fd00:::/64']) test(`network native malformed CIDR rejected: ${value}`, () => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config[0].IPRange = value;
  rejects(() => parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))));
});
for (const value of [0, true, {}, []]) test(`network native non-string IPRange rejected: ${typeof value}`, () => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config[0].IPRange = value;
  rejects(() => projectNetworkInspectDocument(JSON.stringify(raw)));
});
test('network native missing IPAM Config rejected', () => { const raw = F.nativeNetworkDocument(); delete raw[0].IPAM.Config; rejects(() => projectNetworkInspectDocument(JSON.stringify(raw))); });
test('network native null and empty IPAM Config remain distinct', () => {
  const nullRaw = F.nativeNetworkDocument(); nullRaw[0].IPAM.Config = null;
  const emptyRaw = F.nativeNetworkDocument(); emptyRaw[0].IPAM.Config = [];
  assert.equal(parseResource('network', projectNetworkInspectDocument(JSON.stringify(nullRaw))).ipamConfigState, 'NULL');
  assert.equal(parseResource('network', projectNetworkInspectDocument(JSON.stringify(emptyRaw))).ipamConfigState, 'EMPTY');
});
test('network native mixed IPAM rows preserve absent and present IPRange independently', () => {
  const raw = F.nativeNetworkDocument(); const missing = { ...raw[0].IPAM.Config[0] }; delete missing.IPRange;
  raw[0].IPAM.Config = [missing, { ...raw[0].IPAM.Config[0], IPRange: '10.0.0.0/24' }];
  const ipam = parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))).ipam;
  assert.equal(ipam[0].ipRange.presence, 'ABSENT'); assert.equal(ipam[1].ipRange.presence, 'PRESENT'); assert.equal(ipam[1].ipRange.classification, 'IPV4');
});
const parsedNativeIPAM = rows => {
  const raw = F.nativeNetworkDocument(); raw[0].IPAM.Config = rows;
  return parseResource('network', projectNetworkInspectDocument(JSON.stringify(raw))).ipam;
};
test('network native missing AuxiliaryAddresses remains absent', () => assert.deepEqual(parsedNativeIPAM([{ Subnet: '10.0.0.0/24', Gateway: '10.0.0.1' }])[0].auxiliaryAddresses, { presence: 'ABSENT', count: 0, token: null }));
test('network native null AuxiliaryAddresses remains null', () => assert.deepEqual(parsedNativeIPAM([{ AuxiliaryAddresses: null }])[0].auxiliaryAddresses, { presence: 'NULL', count: 0, token: null }));
test('network native empty AuxiliaryAddresses remains present but empty', () => assert.deepEqual(parsedNativeIPAM([{ AuxiliaryAddresses: {} }])[0].auxiliaryAddresses, { presence: 'EMPTY', count: 0, token: null }));
for (const [label, entries, count] of [
  ['one IPv4', { router: '10.0.0.2' }, 1],
  ['one IPv6', { router6: 'fd00::2' }, 1],
  ['multiple', { router4: '10.0.0.2', router6: 'fd00::2' }, 2],
]) test(`network native AuxiliaryAddresses ${label} map is validated and tokenized`, () => {
  const auxiliary = parsedNativeIPAM([{ AuxiliaryAddresses: entries }])[0].auxiliaryAddresses;
  assert.equal(auxiliary.presence, 'PRESENT'); assert.equal(auxiliary.count, count); assert.match(auxiliary.token, /^network:auxiliary_addresses:sha256:[0-9a-f]{64}$/);
  for (const value of Object.values(entries)) assert.equal(JSON.stringify(auxiliary).includes(value), false);
});
for (const [label, entries] of [
  ['malformed IP', { router: 'not-an-ip' }],
  ['empty key', { '': '10.0.0.2' }],
  ['null value', { router: null }],
  ['number value', { router: 1 }],
  ['nested object', { router: { address: '10.0.0.2' } }],
  ['array value', { router: ['10.0.0.2'] }],
]) test(`network native AuxiliaryAddresses rejects ${label}`, () => rejects(() => parsedNativeIPAM([{ AuxiliaryAddresses: entries }])));
for (const [label, value] of [['scalar string', '10.0.0.2'], ['boolean', true], ['number', 1], ['array', []]]) test(`network native AuxiliaryAddresses rejects ${label} container`, () => rejects(() => parsedNativeIPAM([{ AuxiliaryAddresses: value }])));
test('network native missing Gateway remains absent', () => assert.equal(parsedNativeIPAM([{ Subnet: '10.0.0.0/24' }])[0].gateway.presence, 'ABSENT'));
test('network native null Gateway remains null', () => assert.deepEqual(parsedNativeIPAM([{ Gateway: null }])[0].gateway, { presence: 'NULL', classification: 'NULL', token: null }));
test('network native empty Gateway remains present and empty', () => assert.deepEqual(parsedNativeIPAM([{ Gateway: '' }])[0].gateway, { presence: 'PRESENT', classification: 'EMPTY', token: null }));
for (const [label, value, classification] of [['IPv4', '10.0.0.1', 'IPV4'], ['IPv6', 'fd00::1', 'IPV6']]) test(`network native valid ${label} Gateway is tokenized`, () => {
  const gateway = parsedNativeIPAM([{ Gateway: value }])[0].gateway;
  assert.equal(gateway.classification, classification); assert.equal(JSON.stringify(gateway).includes(value), false);
});
for (const value of ['not-an-ip', '10.0.0.0/24', '999.0.0.1']) test(`network native malformed Gateway rejected: ${value}`, () => rejects(() => parsedNativeIPAM([{ Gateway: value }])));
for (const value of [1, {}, []]) test(`network native wrong-type Gateway rejected: ${typeof value}`, () => rejects(() => parsedNativeIPAM([{ Gateway: value }])));
test('network native missing Subnet remains absent', () => assert.equal(parsedNativeIPAM([{ Gateway: '10.0.0.1' }])[0].subnet.presence, 'ABSENT'));
test('network native null Subnet remains null', () => assert.deepEqual(parsedNativeIPAM([{ Subnet: null }])[0].subnet, { presence: 'NULL', classification: 'NULL', token: null }));
test('network native empty Subnet remains present and empty', () => assert.deepEqual(parsedNativeIPAM([{ Subnet: '' }])[0].subnet, { presence: 'PRESENT', classification: 'EMPTY', token: null }));
for (const [label, value, classification] of [['IPv4', '10.0.0.0/24', 'IPV4'], ['IPv6', 'fd00::/64', 'IPV6']]) test(`network native valid ${label} Subnet is tokenized`, () => {
  const subnet = parsedNativeIPAM([{ Subnet: value }])[0].subnet;
  assert.equal(subnet.classification, classification); assert.equal(JSON.stringify(subnet).includes(value), false);
});
for (const value of ['not-a-cidr', '10.0.0.0', '10.0.0.0/33']) test(`network native malformed Subnet rejected: ${value}`, () => rejects(() => parsedNativeIPAM([{ Subnet: value }])));
for (const value of [1, {}, []]) test(`network native wrong-type Subnet rejected: ${typeof value}`, () => rejects(() => parsedNativeIPAM([{ Subnet: value }])));
test('network native minimal empty IPAM row is represented without fabricated values', () => {
  const row = parsedNativeIPAM([{}])[0];
  for (const key of ['subnet', 'gateway', 'ipRange']) assert.equal(row[key].presence, 'ABSENT');
  assert.equal(row.auxiliaryAddresses.presence, 'ABSENT');
});
test('network native fully populated legal IPAM row is represented', () => {
  const row = parsedNativeIPAM([{ Subnet: '10.0.0.0/24', IPRange: '10.0.0.128/25', Gateway: '10.0.0.1', AuxiliaryAddresses: { router: '10.0.0.2' } }])[0];
  assert.deepEqual([row.subnet.classification, row.ipRange.classification, row.gateway.classification, row.auxiliaryAddresses.presence], ['IPV4', 'IPV4', 'IPV4', 'PRESENT']);
});
test('network native multiple IPAM rows preserve mixed optional presence', () => {
  const rows = parsedNativeIPAM([{ Subnet: '10.0.0.0/24' }, { Gateway: 'fd00::1', AuxiliaryAddresses: {} }]);
  assert.equal(rows.length, 2); assert.equal(rows[0].gateway.presence, 'ABSENT'); assert.equal(rows[1].subnet.presence, 'ABSENT'); assert.equal(rows[1].auxiliaryAddresses.presence, 'EMPTY');
});
test('network native malformed scalar IPAM row rejected', () => rejects(() => parsedNativeIPAM([true])));
test('network native unknown IPAM field fails closed', () => rejects(() => parsedNativeIPAM([{ Subnet: '10.0.0.0/24', UnknownSafetyField: 'synthetic' }])));
test('network native JSON rejects multiple target documents', () => rejects(() => projectNetworkInspectDocument(JSON.stringify([...F.nativeNetworkDocument(), ...F.nativeNetworkDocument()]))));
test('network native JSON rejects empty target document set', () => rejects(() => projectNetworkInspectDocument('[]')));
test('network native JSON rejects malformed and empty stdout', () => { rejects(() => projectNetworkInspectDocument('{')); rejects(() => projectNetworkInspectDocument(Buffer.alloc(0))); });
test('network native JSON rejects disappeared or incomplete document', () => { const raw = F.nativeNetworkDocument(); delete raw[0].IPAM; rejects(() => projectNetworkInspectDocument(JSON.stringify(raw))); });
test('network inspect command allows one validated ID without format', () => assert.equal(allowedCommand(['--context', 'desktop-linux', 'network', 'inspect', F.net]), true));
test('network inspect command rejects empty, invalid and multiple targets', () => {
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'network', 'inspect']), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'network', 'inspect', 'bad']), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'network', 'inspect', F.net, 'e'.repeat(64)]), false);
});
test('network inspect command rejects legacy or malformed format template', () => assert.equal(allowedCommand(['--context', 'desktop-linux', 'network', 'inspect', '--format', '{{json .}}', F.net]), false));
test('network inspect disappeared target is classified without raw stderr', () => {
  const meta={commandClass:'NETWORK_INSPECT',subStage:'UNSPECIFIED',executableSha256:'a'.repeat(64),argumentTemplateId:'NETWORK_NATIVE_JSON_SINGLE'};
  try { inspectedCall(() => { throw Object.assign(new Error(), { status: 1, stderr: Buffer.from('Error response from daemon: network synthetic not found') }); }, ['--context','desktop-linux','network','inspect',F.net], meta); assert.fail(); }
  catch (e) { assert.equal(e.diagnostic.stderrClassification, 'NETWORK_NOT_FOUND'); assert.equal(e.diagnostic.exitCode, 1); }
});
test('network inspect nonzero invalid argument is classified independently', () => {
  const meta={commandClass:'NETWORK_INSPECT',subStage:'UNSPECIFIED',executableSha256:'a'.repeat(64),argumentTemplateId:'NETWORK_NATIVE_JSON_SINGLE'};
  try { inspectedCall(() => { throw Object.assign(new Error(), { status: 1, stderr: Buffer.from('invalid argument synthetic') }); }, ['--context','desktop-linux','network','inspect',F.net], meta); assert.fail(); }
  catch (e) { assert.equal(e.diagnostic.stderrClassification, 'INVALID_ARGUMENT'); }
});
test('network safe stderr distinguishes invalid template and unsupported format', () => {
  assert.equal(C.safeStderrClass(Buffer.from('template: synthetic: executing synthetic at <.Missing>: cannot evaluate field')), 'INVALID_FORMAT_TEMPLATE');
  assert.equal(C.safeStderrClass(Buffer.from('unsupported output format synthetic')), 'UNSUPPORTED_OUTPUT_FORMAT');
});
test('all IPv4/IPv6 port tuples retained', () => { const p = C.ports({ '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '59322' }, { HostIp: '::1', HostPort: '59322' }] }); assert.equal(p.length, 2); assert.equal(C.comparePorts(p, p).result, 'PASS'); });
for (const ip of ['', '0.0.0.0', '::', 'localhost', '127.1', '::ffff:127.0.0.1']) test('HostIP rejected ' + ip, () => rejects(() => C.comparePorts([{ ...F.binding, hostIP: ip }], [F.binding])));
test('wrong port and duplicate tuple rejected', () => { rejects(() => C.comparePorts([{ ...F.binding, hostPort: 54322 }], [F.binding])); rejects(() => C.comparePorts([F.binding, F.binding], [F.binding])); });
test('null unpublished is not missing expected mapping', () => rejects(() => C.comparePorts(C.ports({ '5432/tcp': null }), [F.binding])));
test('containment uses components not prefix', () => { assert.equal(C.contained('/synthetic/root', '/synthetic/root/a'), true); assert.equal(C.contained('/synthetic/root', '/synthetic/root2/a'), false); rejects(() => C.contained('/synthetic/root', '/synthetic/root/../escape')); });
test('canonicalization reads existing fixture metadata without writes', () => { const p = new URL('../fixtures/synthetic.mjs', import.meta.url).pathname; assert.equal(canonicalMetadata(p, path.dirname(p)).containment, 'COMPONENT_CONTAINED'); });
test('escape comparison uses resolved identity', () => { assert.equal(C.contained('/synthetic/root', '/synthetic/outside'), false); assert.notEqual('/synthetic/Root', '/synthetic/root'); });
test('synthetic symlink traversal rejects canonical escape without creating links', () => {
  const io = { lstatSync: p => ({ isSymbolicLink: () => p.endsWith('/link') }), realpathSync: p => p === '/synthetic/root' ? p : '/synthetic/outside', statSync: () => ({ mode: 0o700, dev: 1, ino: 2 }) };
  rejects(() => canonicalMetadata('/synthetic/root/link', '/synthetic/root', io));
});
test('missing metadata is never fabricated realpath', () => {
  const io = { lstatSync: () => { throw Object.assign(new Error(), { code: 'ENOENT' }); } };
  assert.equal(canonicalMetadata('/synthetic/missing', null, io).containment, 'UNESTABLISHED');
});
test('path tokenization preserves approved relative components', () => assert.equal(tokenPath('/synthetic/root/a', { '$ROOT': '/synthetic/root' }), '$ROOT/a'));
test('volume destinations covered exactly', () => assert.equal(C.predictVolumes({ '/data': {} }, [{ destination: '/data' }]).result, 'PASS'));
test('unexpected image volume detected', () => assert.deepEqual(C.predictVolumes({ '/data': {}, '/extra': {} }, [{ destination: '/data' }]).uncovered, ['/extra']));
test('bad volume schema/null/duplicate target rejected', () => { rejects(() => C.predictVolumes(null, [])); rejects(() => C.predictVolumes({ '/data': null }, [])); rejects(() => C.predictVolumes({}, [{ destination: '/data' }, { destination: '/data' }])); });
test('image missing does not trigger pull', () => assert.equal(C.provenance(null, null).result, 'MISSING'));
test('actual digest cannot approve itself', () => assert.equal(C.provenance({ id: F.image }, null).result, 'EXPECTED DIGEST NOT ESTABLISHED'));
test('approved identity comparator', () => {
  const approved = { manifest: 'registry.example/synthetic@sha256:' + 'd'.repeat(64), config: F.image, os: 'linux', architecture: 'arm64', approval: 'INDEPENDENTLY_APPROVED' };
  const im = { id: F.image, repoDigests: [approved.manifest], os: 'linux', architecture: 'arm64' };
  assert.equal(C.provenance(im, approved).result, 'PASS'); rejects(() => C.provenance({ ...im, id: 'sha256:' + 'e'.repeat(64) }, approved)); rejects(() => C.provenance({ ...im, repoDigests: [] }, approved));
});
test('image projection preserves structural fields without raw env values', () => { const p = C.imageProjection(F.rawImage()); assert.equal(p.volumeDestinations[0], '/data'); assert.equal(p.entrypoint.executableClass, 'ABSOLUTE_EXECUTABLE'); assert.equal(p.rawEnvironment, 'NOT_CAPTURED'); assert.equal(JSON.stringify(p).includes('/usr/bin/synthetic'), false); });
test('image empty digests and unsupported platform are structured', () => { const x = F.rawImage(); x.repoDigests = []; assert.equal(C.imageCompatibility(x, { os: 'linux', architecture: 'arm64', variant: '' }).result, 'EMPTY-REPODIGESTS'); x.architecture = 'unknown'; rejects(() => C.imageProjection(x)); });
test('image malformed structured projection rejected', () => { const x = F.rawImage(); x.volumes = { relative: {} }; rejects(() => C.imageProjection(x)); x.volumes = null; x.entrypoint = 'bad'; rejects(() => C.imageProjection(x)); });
test('image native JSON selects only reviewed safe fields', () => {
  const selected = projectImageInspectDocument(JSON.stringify(F.nativeImageDocument()));
  assert.equal(selected.id, F.image); assert.equal(Object.hasOwn(selected, 'Config'), false); assert.equal(Object.hasOwn(selected, 'RootFS'), false);
  const output = JSON.stringify(C.imageProjection(selected));
  assert.equal(output.includes('SYNTHETIC_ENV'), false); assert.equal(output.includes('not-captured'), false); assert.equal(output.includes('/usr/bin/synthetic'), false);
});
test('image native missing optional fields remain explicitly missing', () => {
  const raw = F.nativeImageDocument(); delete raw[0].RepoTags; delete raw[0].RepoDigests; delete raw[0].Variant;
  for (const key of ['Entrypoint', 'Cmd', 'User', 'WorkingDir', 'ExposedPorts', 'Volumes', 'Healthcheck']) delete raw[0].Config[key];
  const projection = C.imageProjection(projectImageInspectDocument(JSON.stringify(raw)));
  for (const key of ['repoTagsState', 'repoDigestsState', 'volumesState', 'exposedPortsState']) assert.equal(projection[key], 'MISSING');
  for (const key of ['variant', 'user', 'workingDir', 'entrypoint', 'cmd', 'healthcheck']) assert.equal(projection[key].state, 'MISSING');
});
test('image native null optional fields remain explicitly null', () => {
  const raw = F.nativeImageDocument(); raw[0].RepoTags = null; raw[0].RepoDigests = null; raw[0].Variant = null;
  for (const key of ['Entrypoint', 'Cmd', 'User', 'WorkingDir', 'ExposedPorts', 'Volumes', 'Healthcheck']) raw[0].Config[key] = null;
  const projection = C.imageProjection(projectImageInspectDocument(JSON.stringify(raw)));
  for (const key of ['repoTagsState', 'repoDigestsState', 'volumesState', 'exposedPortsState']) assert.equal(projection[key], 'NULL');
  for (const key of ['variant', 'user', 'workingDir', 'entrypoint', 'cmd', 'healthcheck']) assert.equal(projection[key].state, 'NULL');
});
test('image native empty optional fields remain explicitly empty', () => {
  const raw = F.nativeImageDocument(); raw[0].RepoTags = []; raw[0].RepoDigests = []; raw[0].Variant = '';
  Object.assign(raw[0].Config, { Entrypoint: [], Cmd: [], User: '', WorkingDir: '', ExposedPorts: {}, Volumes: {}, Healthcheck: {} });
  const projection = C.imageProjection(projectImageInspectDocument(JSON.stringify(raw)));
  for (const key of ['repoTagsState', 'repoDigestsState', 'volumesState', 'exposedPortsState']) assert.equal(projection[key], 'EMPTY');
  for (const key of ['variant', 'user', 'workingDir', 'entrypoint', 'cmd', 'healthcheck']) assert.equal(projection[key].state, 'EMPTY');
});
test('image native healthcheck optional values preserve independent states', () => {
  const raw = F.nativeImageDocument(); raw[0].Config.Healthcheck = { Test: null, Interval: 0, Timeout: null };
  const health = C.imageProjection(projectImageInspectDocument(JSON.stringify(raw))).healthcheck;
  assert.equal(health.test.state, 'NULL'); assert.equal(health.interval.state, 'PRESENT'); assert.equal(health.timeout.state, 'NULL'); assert.equal(health.retries.state, 'MISSING');
});
for (const [label, mutate] of [
  ['multiple documents', raw => raw.push(structuredClone(raw[0]))],
  ['missing Config', raw => delete raw[0].Config],
  ['wrong Variant type', raw => { raw[0].Variant = 1; }],
  ['wrong Entrypoint type', raw => { raw[0].Config.Entrypoint = 'bad'; }],
  ['relative Volume key', raw => { raw[0].Config.Volumes = { relative: {} }; }],
  ['invalid ExposedPorts key', raw => { raw[0].Config.ExposedPorts = { bad: {} }; }],
  ['unknown Healthcheck field', raw => { raw[0].Config.Healthcheck.Unknown = 1; }],
  ['negative Healthcheck value', raw => { raw[0].Config.Healthcheck.Interval = -1; }],
]) test(`image native malformed shape rejected: ${label}`, () => { const raw = F.nativeImageDocument(); mutate(raw); rejects(() => C.imageProjection(projectImageInspectDocument(JSON.stringify(raw)))); });
test('image native JSON rejects empty, malformed and extra target documents', () => { rejects(() => projectImageInspectDocument('[]')); rejects(() => projectImageInspectDocument('{')); rejects(() => projectImageInspectDocument(JSON.stringify([...F.nativeImageDocument(), ...F.nativeImageDocument()]))); });
test('image inspect command allows one validated sha256 ID without format', () => assert.equal(allowedCommand(['--context', 'desktop-linux', 'image', 'inspect', F.image]), true));
test('image inspect command rejects format template, missing and noncanonical IDs', () => {
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'image', 'inspect', '--format', '{{json .}}', F.image]), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'image', 'inspect']), false);
  assert.equal(allowedCommand(['--context', 'desktop-linux', 'image', 'inspect', F.image.slice(7)]), false);
});
test('role inventory remains complete and unique', () => { assert.equal(EXPECTED_IMAGE_ROLES.length, 14); assert.equal(new Set(EXPECTED_IMAGE_ROLES.map(x => x[0])).size, 14); });
test('diagnostic distinguishes spawn, CLI exit and argument failure', () => { const valid = ['--version'],meta={commandClass:'DOCKER_VERSION',subStage:'D-02',executableSha256:'a'.repeat(64),argumentTemplateId:'CLIENT_VERSION'}; try { inspectedCall(() => { throw Object.assign(new Error(), { code: 'ENOENT' }); }, valid, meta); } catch (e) { assert.equal(e.diagnostic.stage, 'SUBPROCESS_SPAWN'); } try { inspectedCall(() => { throw Object.assign(new Error(), { status: 1, stderr: Buffer.from('synthetic') }); }, valid, meta); } catch (e) { assert.equal(e.diagnostic.stage, 'DOCKER_CLI_EXIT'); assert.equal(e.diagnostic.stderrClassification, 'UNKNOWN_SAFE_CLASSIFICATION'); } rejects(() => inspectedCall(() => Buffer.alloc(0), ['start'], meta)); });
for (const [text,expected] of [['Cannot connect to the Docker daemon','DOCKER_DAEMON_UNREACHABLE'],['permission denied','PERMISSION_DENIED'],['context synthetic not found','CONTEXT_NOT_FOUND'],['unknown flag: --bad','CLI_USAGE_ERROR'],['client version 1 is too old','API_VERSION_ERROR'],['unrecognized synthetic','UNKNOWN_SAFE_CLASSIFICATION']]) test('safe stderr classification '+expected,()=>assert.equal(C.safeStderrClass(Buffer.from(text)),expected));
test('collector does not alter expected values or retry', () => { const c = C.collectEvidence([{ kind: 'synthetic', data: { result: 'PASS' } }], ['GATE_6B_PENDING']); assert.equal(c.expectedValuesChanged, false); assert.equal(c.retryPerformed, false); });
test('freshness distinguishes missing ID and inspection error', () => { assert.equal(C.freshness(F.baseline(), null).result, 'AMBIGUOUS'); assert.equal(C.freshness({ complete: false }, F.P).result, 'INSPECTION-ERROR'); assert.equal(C.freshness(F.baseline(), F.P).result, 'FRESH-QUALIFIED'); });
test('existing stopped DB / volume cannot be fresh', () => { const b = F.baseline(); b.containers.push({ id: F.id, name: 'supabase_db_' + F.P }); assert.equal(C.freshness(b, F.P).result, 'EXISTING'); b.containers = []; b.volumes.push({ name: 'supabase_db_' + F.P }); assert.equal(C.freshness(b, F.P).result, 'EXISTING'); });
test('collision detects historical ID and exact names without labels', () => { assert.equal(C.collision(F.baseline(), F.P, [F.P]).result, 'FAIL'); const b = F.baseline(); b.volumes.push({ name: 'supabase_db_' + F.P, labels: Object.fromEntries(C.LABELS.map(k => [k, { present: false, value: null }])) }); assert.equal(C.collision(b, F.P, []).result, 'FAIL'); });
test('fixture topology graph accepted', () => assert.equal(C.graph(F.topology(), F.topology()).result, 'PASS'));
test('duplicate graph edges cannot normalize away', () => { const g = F.topology(); g.containers[0].networks.push(F.net); rejects(() => C.graph(g, g)); });
for (const mutation of ['foreignNetwork', 'foreignVolume', 'missingNetwork', 'duplicate', 'wrongImage', 'extraBind']) test('graph rejects ' + mutation, () => {
  const g = F.topology();
  if (mutation === 'foreignNetwork') g.networks[0].containers.push('foreign');
  if (mutation === 'foreignVolume') g.volumes[0].consumers.push('foreign');
  if (mutation === 'missingNetwork') g.networks = [];
  if (mutation === 'duplicate') g.containers.push(clone(g.containers[0]));
  if (mutation === 'wrongImage') g.containers[0].image = 'sha256:' + 'e'.repeat(64);
  if (mutation === 'extraBind') g.containers[0].binds.push({ source: '/synthetic/outside', destination: '/data', rw: true });
  rejects(() => C.graph(g, F.topology()));
});
test('drift never updates baseline', () => { const a = { x: 1 }; assert.equal(C.drift(a, { x: 2 }).result, 'FAIL'); assert.equal(a.x, 1); });
test('complete event sequence separate from runtime set', () => { const e = ['create', 'start', 'die', 'destroy'].map((action, n) => ({ action, ordinal: n + 1, id: F.id })); assert.equal(C.eventLedger(e, [F.id]).result, 'PASS'); rejects(() => C.eventLedger(e.slice(0, -1), [F.id])); rejects(() => C.eventLedger([...e, e[0]], [F.id])); });
test('all SQL-C branches represented', () => assert.equal(A.sqlExclusion(F.sql()).rows.length, 11));
test('roles never disabled by migration flag', () => { const s = F.sql(); s.roles = { present: true, reachable: false, proof: 'FIXED_READER_DISABLED' }; assert.equal(A.sqlExclusion(s).result, 'BLOCKED'); });
test('missing SQL proof or branch cannot pass', () => { const s = F.sql(); s.vault.proof = null; assert.equal(A.sqlExclusion(s).result, 'BLOCKED'); delete s.functions; rejects(() => A.sqlExclusion(s)); });
test('SQL reachable and explicitly disabled remain distinct', () => { const s = F.sql(); s.seed = { present: true, reachable: true, proof: null }; assert.equal(A.sqlExclusion(s).rows.find(r => r.key === 'seed').result, 'PRESENT-AND-REACHABLE'); s.seed = { present: true, reachable: false, proof: 'FIXED_READER_DISABLED' }; assert.equal(A.sqlExclusion(s).result, 'PASS'); });
test('literal TOML has no defaults/fallback', () => { assert.equal(A.literalConfig('project_id = "' + F.P + '"\n[analytics]\nenabled = false')['analytics.enabled'], false); for (const x of ['[auth]\nsecret = "synthetic"', 'project_id = "env(TEST)"', '[analytics]\nenabled = false\nenabled = true']) rejects(() => A.literalConfig(x)); });
test('config reader equivalence rejects missing and drift', () => { const input = Object.fromEntries(Object.entries(A.CONFIG).map(([k, t]) => [k, t === 'boolean' ? false : t === 'number' ? 59322 : t === 'empty' ? [] : F.P])); assert.equal(A.effectiveInputs(input, clone(input), clone(input), { result: 'PASS' }).result, 'PASS'); const b = clone(input); b['db.port'] = 54322; rejects(() => A.effectiveInputs(input, input, b, { result: 'PASS' })); delete b.project_id; rejects(() => A.effectiveInputs(input, input, b, { result: 'PASS' })); });
test('fixed input catalog records key metadata and suppresses values', () => { const c = A.fixedInputCatalog('project_id = "synthetic"\n[db]\nport = 5432 # safe\npassword = "synthetic"'); assert.equal(c.result, 'PASS'); assert.equal(JSON.stringify(c).includes('5432'), false); assert.equal(c.rows.find(r => r.key === 'db.password').category, 'PRESENT / SECRET'); });
test('source consumer equivalence detects competing precedence', () => { const one = { field: 'port', source: 'config', consumer: 'cli', fingerprint: 'one' }; assert.equal(A.sourceConsumerEquivalence([one, { ...one, source: 'env' }]).result, 'PASS'); assert.equal(A.sourceConsumerEquivalence([one, { ...one, source: 'env', fingerprint: 'two' }]).result, 'BLOCKED'); });
test('early environment projection never returns values', () => { const e = A.environmentProjection({ SUPABASE_ACCESS_TOKEN: 'synthetic', DOCKER_CONTEXT: 'desktop-linux' }); assert.equal(e.rows.find(r => r.key === 'SUPABASE_ACCESS_TOKEN').state, 'SECRET-SENSITIVE'); assert.equal(JSON.stringify(e).includes('desktop-linux'), false); });
test('known irrelevant browser client hash is isolated',()=>{const e=A.environmentProjection({NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S:'synthetic'});assert.equal(e.result,'PASS');assert.equal(e.rows.find(r=>r.key==='NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S').state,'KNOWN-IRRELEVANT / NOT FORWARDED');assert.equal(A.DOCKER_CHILD_ENV.includes('NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S'),false);assert.equal(JSON.stringify(e).includes('synthetic'),false);});
test('unknown ambient key fails closed',()=>assert.equal(A.environmentProjection({NODE_UNKNOWN_SYNTHETIC:'x'}).result,'BLOCKED'));
test('reader coverage complete, pending and gap dispositions',()=>{const rows=A.READER_CATEGORIES.map(category=>({category,fixedSourcePath:'FIXED',readerFunction:'READER',inputSource:'SOURCE',precedence:'FIXED',securityRelevance:'SECURITY',helperAdapter:'ADAPTER',testCoverage:'TESTED',disposition:'COVERED'}));assert.equal(A.readerCoverage(rows).result,'PASS');rows[0].disposition='GATE-6B-PENDING';assert.equal(A.readerCoverage(rows).result,'PARTIAL');rows[0].disposition='GAP';assert.equal(A.readerCoverage(rows).result,'BLOCKED');});
test('H14 preserves blocked, missing and partial without self approval',()=>{const rows=Array.from({length:22},(_,i)=>({source:'source-'+i,status:'PASS'}));assert.equal(C.h14Aggregate(rows).result,'PASS');rows[0].status='BLOCKED_BY_DAEMON_STAGE';assert.equal(C.h14Aggregate(rows).result,'BLOCKED');rows[0].status='MISSING';const out=C.h14Aggregate(rows);assert.equal(out.result,'PARTIAL');assert.equal(out.expectedValuesChanged,false);assert.equal(out.retryPerformed,false);});
test('env values never returned', () => { const e = A.environmentPresence({ PGPASSWORD: 'synthetic-secret-not-real' }); assert.equal(e.result, 'BLOCKED'); assert.equal(JSON.stringify(e).includes('synthetic-secret-not-real'), false); });
test('telemetry state not conflated with transmission', () => { const q = A.optionalQualifiers(F.optional()); assert.equal(q.telemetryTransmission, 'DISABLED'); assert.equal(q.telemetryState, 'WRITER_CONTAINMENT_REQUIRED'); assert.equal(q.vector, 'DISABLED'); });
test('all pgdelta enables and vector socket fail', () => { assert.equal(A.optionalQualifiers({ ...F.optional(), pgdeltaEnvironment: true }).pgdelta, 'CONDITIONALLY EXTERNAL'); assert.equal(A.optionalQualifiers({ ...F.optional(), analyticsEnabled: true }).vector, 'VECTOR SOCKET EXPOSURE BLOCKER'); });
test('egress is configuration only', () => { const g = F.egressInput(); assert.equal(A.egress(g).result, 'PASS'); g.providers = { enabled: true, targetClass: 'external' }; assert.equal(A.egress(g).result, 'BLOCKED'); });
test('binary hash not source proof', () => { assert.equal(A.binaryCorrespondence('a'.repeat(64), 'a'.repeat(64)).result, 'PARTIAL-ACCEPTABLE'); assert.equal(A.binaryCorrespondence('a'.repeat(64), 'b'.repeat(64)).result, 'BLOCKED'); });
test('package provenance matching remains partial, contradiction blocks', () => { const f = { versionMatch: true, architectureMatch: true, formulaArchiveMatch: true, receiptFormulaMatch: true, installedBinaryMatch: true }; assert.equal(A.packageProvenance(f).result, 'PARTIAL-ACCEPTABLE'); assert.equal(A.packageProvenance({ ...f, formulaArchiveMatch: false }).result, 'BLOCKED'); });
for (const host of ['ssh://synthetic', 'tcp://127.0.0.1:2375', 'unix:///synthetic/wrong.sock']) test('endpoint fails closed ' + host, () => rejects(() => A.endpointGuard(host, ['unix:///var/run/docker.sock'])));
test('only exact approved socket passes', () => assert.equal(A.endpointGuard('unix:///var/run/docker.sock', ['unix:///var/run/docker.sock']).result, 'PASS'));
test('listener parser keeps tuple and safe process class', () => { const r = parseListeners('p123\ncnode\nn127.0.0.1:59320\n', 59320, 'TCP'); assert.equal(r[0].bindClass, 'IPV4_LOOPBACK'); assert.equal(r[0].pid, 123); });
for (const [label, a, b] of [['same basename different parent','/a/temp','/b/temp'],['symlink and real path','/a/link','/a/real'],['unicode-looking','/a/é','/a/é'],['case','/a/A','/a/a'],['relative absolute','/a/relative','/relative'],['temp home','/tmp/x','/home/x'],['session unrelated','/session/x','/other/x']]) test('path tokens do not collide: ' + label, () => assert.notEqual(C.stablePathToken('OTHER', a, a).originalToken, C.stablePathToken('OTHER', b, b).originalToken));
for (const value of [{ Env: [] }, { raw_logs: 'synthetic' }, { message: 'password=synthetic' }, { message: 'postgres://synthetic:synthetic@host' }, { message: '-----BEGIN PRIVATE KEY-----' }]) test('unsafe output rejected ' + Object.keys(value)[0], () => rejects(() => C.scanSafe(value)));
test('safe schemas contain no wildcard raw capture', () => { for (const t of Object.values(FORMATS)) { assert.equal(t.includes('{{json .}}'), false); assert.equal(t.includes('{{json .Config.Env}}'), false); assert.equal(t.includes('{{json .Labels}}'), false); } });
test('envelope has strict fields and cannot report runtime PASS', () => {
  const e = { schema_version: '1', helper_id: 'FOUNDATION-PRESTART-1', helper_sha256: 'a'.repeat(64), timestamp: '2000-01-01T00:00:00.000Z', phase: 'READ_ONLY_PRESTART', subject: 'LOCAL_METADATA_NOT_EXECUTION_SESSION', result: 'PARTIAL', findings: [], error: null };
  assert.equal(C.validateEnvelope(e).result, 'PARTIAL'); rejects(() => C.validateEnvelope({ ...e, result: 'PASS' })); rejects(() => C.validateEnvelope({ ...e, findings: [{ kind: 'unknown', data: {} }] })); rejects(() => C.validateEnvelope({ ...e, raw_output: 'synthetic' }));
});
test('command guard accepts only fixed readonly projection commands', () => { assert.equal(allowedCommand(['--version']), true); assert.equal(allowedCommand(['--context', 'desktop-linux', 'info', '--format', FORMATS.daemon]), true); });
test('context cannot inject a CLI option', () => assert.equal(allowedCommand(['context', 'inspect', '--help', '--format', '{{json .Endpoints.docker.Host}}']), false));
for (const command of [['start'], ['stop'], ['image', 'pull', 'synthetic'], ['system', 'prune'], ['context', 'use', 'default'], ['--context', 'default', 'container', 'inspect', '--format', '{{json .}}', F.id], ['--context', 'default', 'run', 'synthetic']]) test('mutation/raw command denied ' + command.join(' '), () => assert.equal(allowedCommand(command), false));
test('source mutation audit: collector only execFileSync allowlist, no writer/network imports', () => {
  const files = ['../inspect/prestart.mjs', '../lib/contracts.mjs', '../lib/auditors.mjs', '../lib/metadata.mjs'];
  for (const f of files) { const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8'); assert.doesNotMatch(s, /\b(?:writeFile|appendFile|mkdir|mkdtemp|unlink|rmdir|rename|chmod|chown|rmSync|spawn|execSync|fetch)\s*\(/); assert.doesNotMatch(s, /from ['"](?:node:)?(?:http|https|net|tls)['"]/); assert.doesNotMatch(s, /process\.env\[[^\]]+\]\s*=/); }
});
