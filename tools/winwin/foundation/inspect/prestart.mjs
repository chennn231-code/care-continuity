// INSPECTION ONLY. No writer, shell, download, Supabase invocation or retry.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { demand, ContractError, object, hash, parseJSON, safeText, scanSafe, identity, shape, rawLabels, LABELS, ports, uniqueRecords, exactSet, freshness, provenance, imageProjection, commandDiagnostic, collectEvidence, validateEnvelope, stablePathToken, daemonVolumePathProjection, networkAddressProjection, networkAuxiliaryProjection, safeStderrClass, h14Aggregate } from '../lib/contracts.mjs';
import { endpointGuard, environmentProjection, fixedInputCatalog, sourceConsumerEquivalence, binaryCorrespondence, readerCoverage, READER_CATEGORIES, DOCKER_CHILD_ENV, optionalQualifiers, egress } from '../lib/auditors.mjs';
import { executable, canonicalMetadata, tokenPath, homebrewProvenance } from '../lib/metadata.mjs';

const labels = t => '{' + LABELS.map(k => `\"${k}\":{\"present\":{{ $p := false }}{{ range $k, $v := ${t} }}{{ if eq $k \"${k}\" }}{{ $p = true }}{{ end }}{{ end }}{{ $p }},\"value\":{{ if $p }}{{ json (index ${t} \"${k}\") }}{{ else }}null{{ end }}}`).join(',') + '}';
const jf = (n, s) => `\"${n}\":{{json ${s}}}`;
const mapState = t => `{{if eq ${t} nil}}\"NULL\"{{else if eq (len ${t}) 0}}\"EMPTY\"{{else}}\"PRESENT_NOT_CAPTURED\"{{end}}`;
export const FORMATS = Object.freeze({
  volume:'{' + [jf('name','.Name'),jf('driver','.Driver'),jf('scope','.Scope'),jf('mountpoint','.Mountpoint'),'\"labelsState\":'+mapState('.Labels'),'\"optionsState\":'+mapState('.Options'),'\"labels\":'+labels('.Labels')].join(',') + '}',
  daemon:'{' + [jf('id','.ID'),jf('engine','.ServerVersion'),jf('os','.OperatingSystem'),jf('osType','.OSType'),jf('architecture','.Architecture'),jf('root','.DockerRootDir')].join(',') + '}',
  context:'{' + [jf('name','.Name'),jf('host','.Endpoints.docker.Host'),jf('skipTLSVerify','.Endpoints.docker.SkipTLSVerify'),'\"tlsMaterialPresent\":{{if .TLSMaterial}}true{{else}}false{{end}}'].join(',') + '}',
  connectivity:'{{json .Server.Version}}',
});
export const EXPECTED_IMAGE_ROLES = Object.freeze([['PG','supabase/postgres:17.6.1.159'],['Kong','library/kong:2.8.1'],['Mailpit','axllent/mailpit:v1.30.2'],['REST','postgrest/postgrest:v16.1'],['PG_META','supabase/postgres-meta:v0.98.0'],['Studio','supabase/studio:2026.08.17-sha-0c1da8f'],['Imgproxy','darthsim/imgproxy:v3.8.0'],['Edge','supabase/edge-runtime:v1.74.3'],['Vector','timberio/vector:0.53.0-alpine'],['Pooler','supabase/supavisor:2.9.7'],['Auth','supabase/gotrue:v2.195.0'],['Realtime','supabase/realtime:v2.129.0'],['Storage','supabase/storage-api:v1.69.11'],['Analytics','supabase/logflare:1.50.2']]);
const safeArgs = a => a.map(x => /^(?:sha256:)?[0-9a-f]{64}$/.test(x) ? 'RESOURCE_ID' : Object.values(FORMATS).includes(x) ? 'FIXED_PROJECTION_TEMPLATE' : /^\{\{/.test(x) ? 'FIXED_FORMAT_TEMPLATE' : 'FIXED_OR_VALIDATED_TOKEN');
export function allowedCommand(args) {
  if ([['--version'],['context','show']].some(x => JSON.stringify(x) === JSON.stringify(args))) return true;
  if (args.length === 5 && args[0] === 'context' && args[1] === 'inspect' && /^[A-Za-z0-9][\w.-]*$/.test(args[2]) && args[3] === '--format' && args[4] === FORMATS.context) return true;
  if (args[0] !== '--context' || !/^[A-Za-z0-9][\w.-]*$/.test(args[1])) return false;
  const a = args.slice(2);
  const lists = [['ps','-a','--no-trunc','--format','{{json .ID}}'],['volume','ls','--format','{{json .Name}}'],['network','ls','--no-trunc','--format','{{json .ID}}'],['image','ls','--no-trunc','--quiet']];
  if (lists.some(x => JSON.stringify(x) === JSON.stringify(a))) return true;
  if (a.length === 3 && a[0] === 'version' && a[1] === '--format' && a[2] === FORMATS.connectivity) return true;
  if (a.length === 3 && a[0] === 'info' && a[1] === '--format' && a[2] === FORMATS.daemon) return true;
  if (a.length === 3 && a[0] === 'container' && a[1] === 'inspect' && /^[0-9a-f]{64}$/.test(a[2])) return true;
  if (a.length === 3 && a[0] === 'network' && a[1] === 'inspect' && /^[0-9a-f]{64}$/.test(a[2])) return true;
  if (a.length === 3 && a[0] === 'image' && a[1] === 'inspect' && /^sha256:[0-9a-f]{64}$/.test(a[2])) return true;
  return a.length === 5 && a[0] === 'volume' && a[1] === 'inspect' && a[2] === '--format' && a[3] === FORMATS.volume && /^[\w][\w.:/@+-]{0,511}$/.test(a[4]);
}
class InspectionFailure extends ContractError { constructor(code, diagnostic) { super(code); this.diagnostic = diagnostic; } }
export function inspectedCall(executor, args, meta = {}) {
  const m = { commandClass:meta.commandClass??'DOCKER_METADATA',subStage:meta.subStage??'UNSPECIFIED',executableSha256:meta.executableSha256??null,argumentTemplateId:meta.argumentTemplateId??'UNSPECIFIED' };
  try { demand(allowedCommand(args),'COMMAND_NOT_ALLOWLISTED'); }
  catch(e) { throw new InspectionFailure('ARGUMENT_CONSTRUCTION_ERROR',commandDiagnostic('ARGUMENT_CONSTRUCTION',{...m,argumentCategories:safeArgs(args),parserCategory:e.code??'REJECTED'})); }
  try { return executor(args); }
  catch(e) { const spawn=!Number.isSafeInteger(e?.status); throw new InspectionFailure(spawn?'SUBPROCESS_SPAWN_ERROR':'DOCKER_CLI_EXIT',commandDiagnostic(spawn?'SUBPROCESS_SPAWN':'DOCKER_CLI_EXIT',{...m,exitCode:Number.isSafeInteger(e?.status)?e.status:null,signal:typeof e?.signal==='string'?e.signal:null,argumentCategories:safeArgs(args),stderrClassification:safeStderrClass(e?.stderr),stdoutPresence:Boolean(e?.stdout?.length)})); }
}
const decoded=(b,meta={})=>{try{const v=new TextDecoder('utf8',{fatal:true}).decode(b);demand(v.endsWith('\n'),'OUTPUT_TRUNCATED');return v.slice(0,-1);}catch(e){throw new InspectionFailure('STDOUT_PARSE_ERROR',commandDiagnostic('STDOUT_PARSE',{...meta,argumentCategories:['BOUNDED_UTF8'],stdoutPresence:Boolean(b?.length),parserCategory:e.code??'UTF8'}));}};
const parsed=(b,meta={})=>{try{return parseJSON(b);}catch(e){throw new InspectionFailure('STDOUT_PARSE_ERROR',commandDiagnostic('STDOUT_PARSE',{...meta,argumentCategories:['STRUCTURED_JSON'],stdoutPresence:Boolean(b?.length),parserCategory:e.code??'JSON'}));}};
const collectionState = value => value === null || value === undefined ? 'NULL' : (demand(object(value), 'NETWORK_COLLECTION_TYPE'), Object.keys(value).length ? 'PRESENT_NOT_CAPTURED' : 'EMPTY');
const nativePresence = (owner, key, value) => !Object.hasOwn(owner, key) ? 'MISSING' : value === null ? 'NULL' : (Array.isArray(value) || object(value)) && (Array.isArray(value) ? value.length : Object.keys(value).length) === 0 || typeof value === 'string' && value.length === 0 ? 'EMPTY' : 'PRESENT';
export function projectContainerInspectDocument(raw, meta = {}) {
  try {
    const documents = parseJSON(raw);
    demand(Array.isArray(documents) && documents.length === 1 && object(documents[0]), 'CONTAINER_INSPECT_DOCUMENT');
    const source = documents[0];
    demand(typeof source.Id === 'string' && /^[0-9a-f]{64}$/.test(source.Id), 'CONTAINER_NATIVE_ID');
    demand(typeof source.Name === 'string' && /^\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(source.Name), 'CONTAINER_NATIVE_NAME');
    demand(typeof source.Image === 'string' && /^(?:sha256:)?[0-9a-f]{64}$/.test(source.Image), 'CONTAINER_NATIVE_IMAGE');
    demand(object(source.Config) && object(source.State) && object(source.HostConfig) && object(source.NetworkSettings), 'CONTAINER_NATIVE_REQUIRED_OBJECT');
    const stateField = (key, type) => {
      if (!Object.hasOwn(source.State, key)) return { state: 'MISSING', value: null };
      const value = source.State[key]; demand(value === null || typeof value === type, `CONTAINER_NATIVE_STATE_${key.toUpperCase()}`);
      if (typeof value === 'string') safeText(value);
      return { state: nativePresence(source.State, key, value), value };
    };
    const runtimeState = {
      status: stateField('Status', 'string'), running: stateField('Running', 'boolean'), paused: stateField('Paused', 'boolean'),
      restarting: stateField('Restarting', 'boolean'), oomKilled: stateField('OOMKilled', 'boolean'), dead: stateField('Dead', 'boolean'),
      pid: stateField('Pid', 'number'), exitCode: stateField('ExitCode', 'number'),
    };
    for (const field of ['pid', 'exitCode']) if (runtimeState[field].state === 'PRESENT') demand(Number.isSafeInteger(runtimeState[field].value), 'CONTAINER_NATIVE_STATE_INTEGER');
    const mapField = (owner, key, code) => {
      if (!Object.hasOwn(owner, key)) return { state: 'MISSING', value: {} };
      demand(owner[key] === null || object(owner[key]), code);
      return { state: nativePresence(owner, key, owner[key]), value: owner[key] ?? {} };
    };
    const portState = mapField(source.NetworkSettings, 'Ports', 'CONTAINER_NATIVE_PORTS');
    const plannedPortState = mapField(source.HostConfig, 'PortBindings', 'CONTAINER_NATIVE_PLANNED_PORTS');
    const mountValue = Object.hasOwn(source, 'Mounts') ? source.Mounts : undefined;
    demand(mountValue === undefined || mountValue === null || Array.isArray(mountValue), 'CONTAINER_NATIVE_MOUNTS');
    const mounts = (mountValue ?? []).map(row => {
      demand(object(row) && typeof row.Type === 'string' && typeof row.Destination === 'string' && typeof row.RW === 'boolean', 'CONTAINER_NATIVE_MOUNT_ROW');
      safeText(row.Type); safeText(row.Destination);
      for (const key of ['Name', 'Propagation']) demand(!Object.hasOwn(row, key) || row[key] === null || typeof row[key] === 'string', `CONTAINER_NATIVE_MOUNT_${key.toUpperCase()}`);
      return {
        type: row.Type, destination: row.Destination, rw: row.RW,
        name: { state: nativePresence(row, 'Name', row.Name), value: Object.hasOwn(row, 'Name') ? row.Name : null },
        propagation: { state: nativePresence(row, 'Propagation', row.Propagation), value: Object.hasOwn(row, 'Propagation') ? row.Propagation : null },
      };
    });
    const networkValue = Object.hasOwn(source.NetworkSettings, 'Networks') ? source.NetworkSettings.Networks : undefined;
    demand(networkValue === undefined || networkValue === null || object(networkValue), 'CONTAINER_NATIVE_NETWORKS');
    const networks = Object.entries(networkValue ?? {}).map(([name, row]) => {
      identity(name); demand(object(row), 'CONTAINER_NATIVE_NETWORK_ROW');
      for (const key of ['NetworkID', 'EndpointID']) demand(!Object.hasOwn(row, key) || row[key] === null || typeof row[key] === 'string', `CONTAINER_NATIVE_NETWORK_${key.toUpperCase()}`);
      demand(!Object.hasOwn(row, 'Aliases') || row.Aliases === null || Array.isArray(row.Aliases) && row.Aliases.every(value => typeof value === 'string'), 'CONTAINER_NATIVE_NETWORK_ALIASES');
      return {
        name,
        networkId: { state: nativePresence(row, 'NetworkID', row.NetworkID), value: Object.hasOwn(row, 'NetworkID') ? row.NetworkID : null },
        endpointId: { state: nativePresence(row, 'EndpointID', row.EndpointID), value: Object.hasOwn(row, 'EndpointID') ? row.EndpointID : null },
        aliases: { state: nativePresence(row, 'Aliases', row.Aliases), values: row.Aliases ?? [] },
      };
    });
    const labelSource = Object.hasOwn(source.Config, 'Labels') ? source.Config.Labels : undefined;
    demand(labelSource === undefined || labelSource === null || object(labelSource), 'CONTAINER_NATIVE_LABELS');
    const labels = Object.fromEntries(LABELS.map(key => {
      const present = object(labelSource) && Object.hasOwn(labelSource, key); if (present) identity(labelSource[key]);
      return [key, { present, value: present ? labelSource[key] : null }];
    }));
    return {
      id: source.Id, rawName: source.Name, image: source.Image, runtimeState,
      portsState: portState.state, ports: portState.value, plannedPortsState: plannedPortState.state, plannedPorts: plannedPortState.value,
      mountsState: nativePresence(source, 'Mounts', mountValue), mounts,
      networksState: nativePresence(source.NetworkSettings, 'Networks', networkValue), networks, labels,
    };
  } catch (e) {
    throw new InspectionFailure('STDOUT_PARSE_ERROR', commandDiagnostic('STDOUT_PARSE', { ...meta, argumentCategories: ['NATIVE_STRUCTURED_JSON', 'SINGLE_CONTAINER_DOCUMENT', 'SAFE_FIELD_SELECTION'], stdoutPresence: Boolean(raw?.length), parserCategory: e.code ?? 'CONTAINER_JSON' }));
  }
}
export function projectNetworkInspectDocument(raw, meta = {}) {
  try {
    const documents = parseJSON(raw);
    demand(Array.isArray(documents) && documents.length === 1 && object(documents[0]), 'NETWORK_INSPECT_DOCUMENT');
    const source = documents[0];
    for (const key of ['Id', 'Name', 'Driver', 'Scope']) demand(typeof source[key] === 'string', `NETWORK_NATIVE_${key.toUpperCase()}`);
    for (const key of ['Internal', 'Attachable', 'Ingress', 'ConfigOnly', 'EnableIPv6']) demand(typeof source[key] === 'boolean', `NETWORK_NATIVE_${key.toUpperCase()}`);
    demand(object(source.IPAM), 'NETWORK_NATIVE_IPAM');
    demand(source.IPAM.Driver === null || typeof source.IPAM.Driver === 'string', 'NETWORK_NATIVE_IPAM_DRIVER');
    demand(source.IPAM.Config === null || Array.isArray(source.IPAM.Config), 'NETWORK_NATIVE_IPAM_CONFIG');
    const ipamConfig = (source.IPAM.Config ?? []).map(row => {
      demand(object(row), 'NETWORK_NATIVE_IPAM_ROW');
      const fields = ['Subnet', 'IPRange', 'Gateway', 'AuxiliaryAddresses'];
      demand(Object.keys(row).every(key => fields.includes(key)), 'UNKNOWN_NATIVE_IPAM_FIELD');
      for (const key of ['Subnet', 'IPRange', 'Gateway']) demand(!Object.hasOwn(row, key) || row[key] === null || typeof row[key] === 'string', `NETWORK_NATIVE_IPAM_${key.toUpperCase()}`);
      demand(!Object.hasOwn(row, 'AuxiliaryAddresses') || row.AuxiliaryAddresses === null || object(row.AuxiliaryAddresses), 'NETWORK_NATIVE_AUXILIARY_ADDRESSES');
      const projected = { auxiliaryAddresses: networkAuxiliaryProjection(Object.hasOwn(row, 'AuxiliaryAddresses') ? row.AuxiliaryAddresses : undefined) };
      if (Object.hasOwn(row, 'Subnet')) projected.subnet = row.Subnet;
      if (Object.hasOwn(row, 'Gateway')) projected.gateway = row.Gateway;
      if (Object.hasOwn(row, 'IPRange')) projected.ipRange = row.IPRange;
      return projected;
    });
    demand(source.Containers === null || object(source.Containers), 'NETWORK_NATIVE_CONTAINERS');
    const attachments = Object.entries(source.Containers ?? {}).map(([containerId, row]) => {
      identity(containerId); demand(object(row), 'NETWORK_NATIVE_CONTAINER_ROW');
      demand(typeof row.Name === 'string' && typeof row.EndpointID === 'string', 'NETWORK_NATIVE_CONTAINER_FIELDS');
      return { containerId, name: row.Name, endpointId: row.EndpointID };
    });
    demand(source.Labels === null || object(source.Labels), 'NETWORK_NATIVE_LABELS');
    const labels = Object.fromEntries(LABELS.map(key => {
      const present = object(source.Labels) && Object.hasOwn(source.Labels, key);
      if (present) identity(source.Labels[key]);
      return [key, { present, value: present ? source.Labels[key] : null }];
    }));
    demand(source.Options === null || object(source.Options), 'NETWORK_NATIVE_OPTIONS');
    return {
      id: source.Id, name: source.Name, driver: source.Driver, scope: source.Scope,
      internal: source.Internal, attachable: source.Attachable, ingress: source.Ingress,
      configOnly: source.ConfigOnly, ipv6: source.EnableIPv6, ipamDriver: source.IPAM.Driver,
      ipamConfigState: source.IPAM.Config === null ? 'NULL' : source.IPAM.Config.length ? 'PRESENT_NOT_CAPTURED' : 'EMPTY',
      ipamConfig, optionsState: collectionState(source.Options), labelsState: collectionState(source.Labels), attachments, labels,
    };
  } catch (e) {
    throw new InspectionFailure('STDOUT_PARSE_ERROR', commandDiagnostic('STDOUT_PARSE', { ...meta, argumentCategories: ['NATIVE_STRUCTURED_JSON', 'SINGLE_NETWORK_DOCUMENT'], stdoutPresence: Boolean(raw?.length), parserCategory: e.code ?? 'NETWORK_JSON' }));
  }
}
export function projectImageInspectDocument(raw, meta = {}) {
  try {
    const documents = parseJSON(raw);
    demand(Array.isArray(documents) && documents.length === 1 && object(documents[0]), 'IMAGE_INSPECT_DOCUMENT');
    const source = documents[0];
    demand(typeof source.Id === 'string' && /^sha256:[0-9a-f]{64}$/.test(source.Id), 'IMAGE_NATIVE_ID');
    for (const key of ['Os', 'Architecture']) demand(typeof source[key] === 'string', `IMAGE_NATIVE_${key.toUpperCase()}`);
    const projected = { id: source.Id, os: source.Os, architecture: source.Architecture };
    const optionalAliases = (nativeKey, key) => {
      if (!Object.hasOwn(source, nativeKey)) return;
      demand(source[nativeKey] === null || Array.isArray(source[nativeKey]) && source[nativeKey].every(value => typeof value === 'string' && value.length <= 512), `IMAGE_NATIVE_${nativeKey.toUpperCase()}`);
      projected[key] = source[nativeKey];
    };
    optionalAliases('RepoTags', 'repoTags');
    optionalAliases('RepoDigests', 'repoDigests');
    if (Object.hasOwn(source, 'Variant')) {
      demand(source.Variant === null || typeof source.Variant === 'string', 'IMAGE_NATIVE_VARIANT');
      projected.variant = source.Variant;
    }
    demand(object(source.Config), 'IMAGE_NATIVE_CONFIG');
    const config = source.Config;
    const copyOptional = (nativeKey, key, valid, code) => {
      if (!Object.hasOwn(config, nativeKey)) return;
      demand(valid(config[nativeKey]), code);
      projected[key] = config[nativeKey];
    };
    const argv = value => value === null || Array.isArray(value) && value.every(item => typeof item === 'string' && item.length <= 4096);
    const optionalString = value => value === null || typeof value === 'string' && value.length <= 1024;
    const keyMap = value => value === null || object(value) && Object.values(value).every(item => item === null || object(item) && Object.keys(item).length === 0);
    copyOptional('Entrypoint', 'entrypoint', argv, 'IMAGE_NATIVE_ENTRYPOINT');
    copyOptional('Cmd', 'cmd', argv, 'IMAGE_NATIVE_CMD');
    copyOptional('User', 'user', optionalString, 'IMAGE_NATIVE_USER');
    copyOptional('WorkingDir', 'workingDir', optionalString, 'IMAGE_NATIVE_WORKING_DIR');
    copyOptional('ExposedPorts', 'exposedPorts', keyMap, 'IMAGE_NATIVE_EXPOSED_PORTS');
    copyOptional('Volumes', 'volumes', keyMap, 'IMAGE_NATIVE_VOLUMES');
    if (Object.hasOwn(config, 'Healthcheck')) {
      const healthcheck = config.Healthcheck;
      demand(healthcheck === null || object(healthcheck), 'IMAGE_NATIVE_HEALTHCHECK');
      if (object(healthcheck)) {
        const allowed = ['Test', 'Interval', 'Timeout', 'Retries', 'StartPeriod', 'StartInterval'];
        demand(Object.keys(healthcheck).every(key => allowed.includes(key)), 'UNKNOWN_NATIVE_HEALTHCHECK_FIELD');
        if (Object.hasOwn(healthcheck, 'Test')) demand(argv(healthcheck.Test), 'IMAGE_NATIVE_HEALTHCHECK_TEST');
        for (const key of allowed.slice(1)) if (Object.hasOwn(healthcheck, key)) demand(healthcheck[key] === null || Number.isSafeInteger(healthcheck[key]) && healthcheck[key] >= 0, `IMAGE_NATIVE_HEALTHCHECK_${key.toUpperCase()}`);
      }
      projected.healthcheck = healthcheck;
    }
    // Native image inspect also returns environment, labels, history and rootfs
    // material. None of those unapproved fields enter this safe projection.
    return projected;
  } catch (e) {
    throw new InspectionFailure('STDOUT_PARSE_ERROR', commandDiagnostic('STDOUT_PARSE', { ...meta, argumentCategories: ['NATIVE_STRUCTURED_JSON', 'SINGLE_IMAGE_DOCUMENT', 'SAFE_FIELD_SELECTION'], stdoutPresence: Boolean(raw?.length), parserCategory: e.code ?? 'IMAGE_JSON' }));
  }
}
export function parseResource(kind, raw, pathClassifier = null) {
  const r = typeof raw === 'string' || Buffer.isBuffer(raw) ? parsed(raw) : raw;
  try {
    if (kind === 'container') {
      shape(r, ['id', 'rawName', 'image', 'runtimeState', 'portsState', 'ports', 'plannedPortsState', 'plannedPorts', 'mountsState', 'mounts', 'networksState', 'networks', 'labels']);
      demand(/^\/[\w][\w.-]*$/.test(r.rawName)); identity(r.id); identity(r.image); rawLabels(r.labels);
      for (const key of ['portsState', 'plannedPortsState', 'mountsState', 'networksState']) demand(['MISSING', 'NULL', 'EMPTY', 'PRESENT'].includes(r[key]), 'CONTAINER_PRESENCE_STATE');
      shape(r.runtimeState, ['status', 'running', 'paused', 'restarting', 'oomKilled', 'dead', 'pid', 'exitCode']);
      for (const [key, descriptor] of Object.entries(r.runtimeState)) {
        shape(descriptor, ['state', 'value']); demand(['MISSING', 'NULL', 'EMPTY', 'PRESENT'].includes(descriptor.state), 'CONTAINER_STATE_PRESENCE');
        const expectedType = ['pid', 'exitCode'].includes(key) ? 'number' : key === 'status' ? 'string' : 'boolean';
        demand(descriptor.value === null || typeof descriptor.value === expectedType, 'CONTAINER_STATE_TYPE');
      }
      demand(Array.isArray(r.mounts) && Array.isArray(r.networks));
      const descriptor = (value, type, code) => { shape(value, ['state', 'value']); demand(['MISSING', 'NULL', 'EMPTY', 'PRESENT'].includes(value.state), code); demand(value.value === null || typeof value.value === type, code); if (typeof value.value === 'string') safeText(value.value); };
      r.mounts.forEach(m => { shape(m, ['type', 'destination', 'rw', 'name', 'propagation']); safeText(m.type); safeText(m.destination); demand(typeof m.rw === 'boolean'); descriptor(m.name, 'string', 'CONTAINER_MOUNT_NAME'); descriptor(m.propagation, 'string', 'CONTAINER_MOUNT_PROPAGATION'); });
      r.networks.forEach(n => { shape(n, ['name', 'networkId', 'endpointId', 'aliases']); identity(n.name); descriptor(n.networkId, 'string', 'CONTAINER_NETWORK_ID'); descriptor(n.endpointId, 'string', 'CONTAINER_ENDPOINT_ID'); shape(n.aliases, ['state', 'values']); demand(['MISSING', 'NULL', 'EMPTY', 'PRESENT'].includes(n.aliases.state) && Array.isArray(n.aliases.values), 'CONTAINER_NETWORK_ALIASES'); n.aliases.values.forEach(safeText); });
      return { id: r.id, name: r.rawName.slice(1), rawName: r.rawName, image: r.image, runtimeState: r.runtimeState, portsState: r.portsState, ports: ports(r.ports), plannedPortsState: r.plannedPortsState, plannedPorts: ports(r.plannedPorts), mountsState: r.mountsState, mounts: r.mounts, networksState: r.networksState, networks: r.networks, labels: r.labels };
    }
    if (kind === 'volume') {
      const allowed = ['name', 'driver', 'scope', 'mountpoint', 'labelsState', 'optionsState', 'labels'];
      const required = ['name', 'driver', 'labelsState', 'optionsState', 'labels'];
      demand(r !== null && typeof r === 'object' && !Array.isArray(r), 'VOLUME_OBJECT');
      demand(Object.keys(r).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(r, k)), 'VOLUME_FIELD_SET');
      identity(r.name); identity(r.driver);
      demand(r.scope === undefined || r.scope === null || typeof r.scope === 'string', 'VOLUME_SCOPE_TYPE'); if (typeof r.scope === 'string') safeText(r.scope);
      demand(['NULL', 'EMPTY', 'PRESENT_NOT_CAPTURED'].includes(r.labelsState), 'VOLUME_LABELS_STATE');
      demand(['NULL', 'EMPTY', 'PRESENT_NOT_CAPTURED'].includes(r.optionsState), 'VOLUME_OPTIONS_STATE');
      rawLabels(r.labels); demand(r.mountpoint === undefined || r.mountpoint === null || typeof r.mountpoint === 'string', 'VOLUME_MOUNTPOINT_TYPE');
      const mountpoint = pathClassifier ? pathClassifier(r.mountpoint) : r.mountpoint === undefined ? { classification: 'MISSING', identity: null } : r.mountpoint === null ? { classification: 'NULL', identity: null } : r.mountpoint === '' ? { classification: 'EMPTY', identity: null } : { classification: 'UNCLASSIFIED_NOT_PERSISTED', identity: null };
      shape(mountpoint, ['classification', 'identity']);
      demand(['DAEMON_STORAGE', 'OUTSIDE_DAEMON_STORAGE', 'UNCLASSIFIED_NOT_PERSISTED', 'MISSING', 'NULL', 'EMPTY'].includes(mountpoint.classification), 'VOLUME_MOUNTPOINT_CLASS');
      demand(mountpoint.identity === null || /^path:DAEMON_VOLUME:resolved:[0-9a-f]{64}$/.test(mountpoint.identity), 'VOLUME_MOUNTPOINT_TOKEN');
      const scope = r.scope === undefined ? { state: 'MISSING', value: null } : r.scope === null ? { state: 'NULL', value: null } : r.scope === '' ? { state: 'EMPTY', value: '' } : { state: 'PRESENT', value: r.scope };
      return { name: r.name, driver: r.driver, driverClass: r.driver === 'local' ? 'LOCAL' : 'OTHER_SAFE', scope, labelsState: r.labelsState, optionsState: r.optionsState, mountpoint, labels: r.labels };
    }
    if (kind === 'network') {
      shape(r, ['id', 'name', 'driver', 'scope', 'internal', 'attachable', 'ingress', 'configOnly', 'ipv6', 'ipamDriver', 'ipamConfigState', 'ipamConfig', 'optionsState', 'labelsState', 'attachments', 'labels']);
      for (const k of ['id', 'name', 'driver']) identity(r[k]);
      demand(r.scope === null || typeof r.scope === 'string', 'NETWORK_SCOPE_TYPE'); if (typeof r.scope === 'string') safeText(r.scope);
      demand(r.ipamDriver === null || typeof r.ipamDriver === 'string', 'NETWORK_IPAM_DRIVER_TYPE'); if (typeof r.ipamDriver === 'string') safeText(r.ipamDriver);
      for (const k of ['internal', 'attachable', 'ingress', 'configOnly', 'ipv6']) demand(typeof r[k] === 'boolean', `NETWORK_${k.toUpperCase()}_TYPE`);
      demand(['NULL', 'EMPTY', 'PRESENT_NOT_CAPTURED'].includes(r.ipamConfigState), 'NETWORK_IPAM_STATE');
      demand(['NULL', 'EMPTY', 'PRESENT_NOT_CAPTURED'].includes(r.optionsState), 'NETWORK_OPTIONS_STATE');
      demand(['NULL', 'EMPTY', 'PRESENT_NOT_CAPTURED'].includes(r.labelsState), 'NETWORK_LABELS_STATE');
      demand(Array.isArray(r.ipamConfig), 'NETWORK_IPAM_CONFIG_TYPE'); rawLabels(r.labels);
      const ipam = r.ipamConfig.map(row => {
        demand(object(row), 'NETWORK_IPAM_ROW');
        const allowed = ['subnet', 'gateway', 'ipRange', 'auxiliaryAddresses'], required = ['auxiliaryAddresses'];
        demand(Object.keys(row).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(row, key)), 'NETWORK_IPAM_FIELD_SET');
        shape(row.auxiliaryAddresses, ['presence', 'count', 'token']);
        demand(['ABSENT', 'NULL', 'EMPTY', 'PRESENT'].includes(row.auxiliaryAddresses.presence), 'NETWORK_AUXILIARY_PRESENCE');
        demand(Number.isSafeInteger(row.auxiliaryAddresses.count) && row.auxiliaryAddresses.count >= 0, 'NETWORK_AUXILIARY_COUNT');
        demand(row.auxiliaryAddresses.token === null || /^network:auxiliary_addresses:sha256:[0-9a-f]{64}$/.test(row.auxiliaryAddresses.token), 'NETWORK_AUXILIARY_TOKEN');
        demand(row.auxiliaryAddresses.presence === 'PRESENT' ? row.auxiliaryAddresses.count > 0 && row.auxiliaryAddresses.token !== null : row.auxiliaryAddresses.count === 0 && row.auxiliaryAddresses.token === null, 'NETWORK_AUXILIARY_STATE');
        const optionalAddress = (key, field) => Object.hasOwn(row, key)
          ? { presence: row[key] === null ? 'NULL' : 'PRESENT', ...networkAddressProjection(row[key], field) }
          : { presence: 'ABSENT', classification: 'ABSENT', token: null };
        const subnet = optionalAddress('subnet', 'SUBNET'), gateway = optionalAddress('gateway', 'GATEWAY'), ipRange = optionalAddress('ipRange', 'IP_RANGE');
        return { subnet, gateway, ipRange, auxiliaryAddresses: row.auxiliaryAddresses, auxiliaryAddressCount: row.auxiliaryAddresses.count };
      });
      demand(Array.isArray(r.attachments), 'NETWORK_ATTACHMENTS_TYPE');
      const attachmentEdges = r.attachments.map(a => { shape(a, ['containerId', 'name', 'endpointId']); identity(a.containerId); safeText(a.name); identity(a.endpointId); return { containerId: a.containerId, name: a.name, endpointId: a.endpointId }; });
      uniqueRecords(attachmentEdges, 'containerId');
      const builtinDrivers = { bridge: 'bridge', host: 'host', none: 'null' };
      const resourceClass = Object.hasOwn(builtinDrivers, r.name) && builtinDrivers[r.name] === r.driver ? 'BUILTIN_NETWORK' : 'USER_DEFINED_NETWORK';
      const scope = r.scope === null ? { state: 'NULL', value: null } : r.scope === '' ? { state: 'EMPTY', value: '' } : { state: 'PRESENT', value: r.scope };
      const ipamDriver = r.ipamDriver === null ? { state: 'NULL', value: null } : r.ipamDriver === '' ? { state: 'EMPTY', value: '' } : { state: 'PRESENT', value: r.ipamDriver };
      return { id: r.id, name: r.name, driver: r.driver, scope, resourceClass, ownershipApplicability: resourceClass === 'BUILTIN_NETWORK' ? 'NOT_APPLICABLE' : 'OBSERVED_LABELS_ONLY', internal: r.internal, attachable: r.attachable, ingress: r.ingress, configOnly: r.configOnly, ipv6: r.ipv6, ipamDriver, ipamConfigState: r.ipamConfigState, ipam, optionsState: r.optionsState, labelsState: r.labelsState, attachmentEdges, labels: r.labels };
    }
  } catch (e) {
    throw new InspectionFailure('SCHEMA_VALIDATION_ERROR', commandDiagnostic('SCHEMA_VALIDATION', { commandClass: `${kind.toUpperCase()}_PROJECTION`, argumentCategories: ['SELECTED_FIELDS'], stdoutPresence: true, parserCategory: e.code ?? 'SCHEMA' }));
  }
  throw new ContractError('RESOURCE_CLASS');
}
export function parseListeners(text,port,protocol){demand(Number.isInteger(port)&&port>=59320&&port<=59329&&['TCP','UDP'].includes(protocol));const out=[];let c={};for(const l of text.split('\n')){if(!l)continue;const t=l[0],v=l.slice(1);if(t==='p'){if(Object.keys(c).length)out.push(c);c={pid:/^\d+$/.test(v)?+v:null};}else if(t==='c')c.processClass=/^[\w.+-]{1,128}$/.test(v)?v:'REDACTED';else if(t==='n')c.bindClass=v.includes('127.0.0.1')?'IPV4_LOOPBACK':v.includes('::1')?'IPV6_LOOPBACK':v.includes('*')?'WILDCARD':'OTHER';}if(Object.keys(c).length)out.push(c);return out.map(r=>({port,protocol,listening:true,pid:r.pid??null,processClass:r.processClass??'UNKNOWN',bindClass:r.bindClass??'UNKNOWN'}));}

const coverageRows=()=>READER_CATEGORIES.map(category=>({category,fixedSourcePath:category==='config.toml'?'PROTECTED_REPOSITORY_CONFIG':'FIXED_CONTRACT_SOURCE',readerFunction:category==='config.toml'?'fixedInputCatalog':'SECURITY_RELEVANT_ADAPTER',inputSource:category,precedence:'FROZEN_OR_GATE_6B',securityRelevance:'TOPOLOGY_OR_EXECUTION_BOUNDARY',helperAdapter:category==='config.toml'?'CATALOG_ONLY':'EXPLICIT_CLASSIFIER',testCoverage:'SYNTHETIC_CONTRACT',disposition:['dotenv readers','linked metadata','migrations','roles','seed','schema','vault','buckets','functions','Auth hooks/providers','SMTP','analytics/vector','pg-delta','image/registry resolution','proxy'].includes(category)?'GATE-6B-PENDING':'COVERED'}));
const diagMeta=(docker,subStage,template,commandClass)=>({commandClass,subStage,executableSha256:docker.sha256,argumentTemplateId:template});

export function runInspection(){
  const findings=[],add=(kind,data)=>{scanSafe(data);findings.push({kind,data});};let error=null,diagnostic=null,daemonBlocked=null;
  const src=fileURLToPath(import.meta.url),root=path.resolve(path.dirname(src),'..'),sourceFiles=['inspect/prestart.mjs','lib/contracts.mjs','lib/auditors.mjs','lib/metadata.mjs','schemas/evidence.schema.json'];
  const hashes=sourceFiles.map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))})),aggregate=hash(JSON.stringify(hashes));
  const roots={'$HOME':os.homedir(),'$OS_TEMP':fs.realpathSync(os.tmpdir()),'$REPOSITORY':process.cwd()},tokenize=p=>tokenPath(p,roots),stages=[];
  const success=(subStage,exe,template)=>stages.push({subStage,executableSha256:exe,argumentTemplateId:template,result:'PASS',exitCode:0,signal:null,stdoutParseStatus:'PASS',stderrClassification:'ABSENT'});
  try{
    add('source',{hashes,runtime:process.version,runtimeSha256:hash(fs.readFileSync(process.execPath))});
    const env=environmentProjection(process.env);add('ambientPresence',{result:env.result,rows:env.rows.filter(r=>r.state!=='ABSENT')});demand(env.result==='PASS','AMBIENT_ENV_UNKNOWN');
    const cli=executable('supabase',process.env.PATH);demand(cli,'SUPABASE_BINARY_MISSING');const bv=binaryCorrespondence(cli.sha256,'06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014');add('supabaseBinary',{original:tokenize(cli.original),resolved:tokenize(cli.resolved),sha256:cli.sha256,version:'2.115.0_EXPECTED_NOT_EXECUTED',...bv});demand(bv.result!=='BLOCKED');
    const prov=homebrewProvenance('/opt/homebrew/Cellar/supabase/2.115.0','/opt/homebrew/Library/Taps/supabase/homebrew-tap/Formula/supabase.rb',{version:'2.115.0',architecture:'arm64',archiveUrl:'https://github.com/supabase/cli/releases/download/v2.115.0/supabase_2.115.0_darwin_arm64.tar.gz',archiveSha256:'5b25574efd0a67905073085783da3659737d237e5137e3adfe1a9858e94f40dc',installedBinarySha256:'06179215a136f183ed24841e177e605fe15bf3e1ac1b6edac8312da71e835014'});add('provenance',prov);demand(prov.result!=='BLOCKED');
    const tmp=canonicalMetadata(os.tmpdir()),sbp=process.env.SUPABASE_HOME||path.join(os.homedir(),'.supabase'),home=canonicalMetadata(sbp);for(const[kind,m,cat]of[['tempMetadata',tmp,'TEMP'],['supabaseHomeMetadata',home,'SUPABASE_HOME']]){const t=stablePathToken(cat,m.original,m.realpath);add(kind,{original:t.originalToken,realpath:t.resolvedToken,exists:m.exists,mode:m.mode,device:m.device,inode:m.inode,symlinks:m.links.map(x=>stablePathToken(cat,x,fs.realpathSync(x)).originalToken),containment:'NO_APPROVED_ISOLATED_SESSION',contentsRead:false});}
    const cp=path.join(process.cwd(),'supabase','config.toml'),cat=fixedInputCatalog(fs.readFileSync(cp,'utf8')),coverage=readerCoverage(coverageRows());add('readerCoverage',coverage);demand(!coverage.rows.some(r=>r.disposition==='GAP'),'READER_GAP');const equivalence=sourceConsumerEquivalence([{field:'temp_parent',source:'PROCESS_OS_TMPDIR',consumer:'NODE_HELPER',fingerprint:stablePathToken('TEMP',tmp.original,tmp.realpath).resolvedToken}]);add('inputProjection',{configSource:{pathClass:'PROTECTED_REPOSITORY_CONFIG_NOT_EXECUTION_INPUT',metadataOnly:false,catalogResult:cat.result,keyCount:cat.rows.length},environment:env,equivalence,result:'GATE-6B-PENDING_NOT_EXECUTION_CONFIG'});
    const optional=optionalQualifiers({telemetryDisabled:Object.hasOwn(process.env,'SUPABASE_TELEMETRY_DISABLED')?'1':null,doNotTrack:Object.hasOwn(process.env,'DO_NOT_TRACK')?'1':null,notifierDisabled:Object.hasOwn(process.env,'SUPABASE_UPDATE_NOTIFIER')?'1':null,debug:false,consent:'unknown',versionEmpty:true,pgdeltaConfig:false,pgdeltaEnvironment:Object.hasOwn(process.env,'PGDELTA_ENABLED'),schemaPathsEmpty:false,analyticsEnabled:false}),eg=egress(Object.fromEntries(['registry','proxy','smtp','providers','hooks','serviceHostname','storageCloud','edgeWorkload','analytics','notifier','telemetry','packages'].map(k=>[k,{enabled:false,targetClass:'unknown'}])));add('optionalControls',{telemetry:{transmission:optional.telemetryTransmission,state:optional.telemetryState},notifier:optional.notifier,pgdelta:optional.pgdelta,vector:optional.vector,egress:{result:eg.result,assurance:eg.assurance}});
    const docker=executable('docker',process.env.PATH),podman=executable('podman',process.env.PATH);demand(docker,'DOCKER_CLIENT_MISSING');success('D-01',docker.sha256,'EXECUTABLE_RESOLUTION');add('dockerExecutable',{original:tokenize(docker.original),resolved:tokenize(docker.resolved),aliases:docker.aliases.map(tokenize),sha256:docker.sha256,podmanReachable:Boolean(podman)});demand(!podman,'PODMAN_FALLBACK_REACHABLE');demand(['/Applications/Docker.app/Contents/Resources/bin/docker','/usr/bin/docker'].includes(docker.resolved),'DOCKER_CLASS');
    const childEnv=Object.fromEntries(DOCKER_CHILD_ENV.filter(k=>Object.hasOwn(process.env,k)).map(k=>[k,process.env[k]])),raw=args=>{demand(hash(fs.readFileSync(docker.resolved))===docker.sha256,'EXECUTABLE_DRIFT');return execFileSync(docker.resolved,args,{env:childEnv,encoding:'buffer',timeout:15000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});},call=(args,meta)=>inspectedCall(raw,args,meta);
    let meta=diagMeta(docker,'D-02','CLIENT_VERSION','DOCKER_CLIENT_VERSION'),version=decoded(call(['--version'],meta),meta);demand(/^Docker version [0-9]+\.[0-9]+\.[0-9]+, build [A-Za-z0-9.-]+$/.test(version),'CLIENT_VERSION_PARSE');success('D-02',docker.sha256,'CLIENT_VERSION');
    meta=diagMeta(docker,'D-03','CONTEXT_SHOW','DOCKER_CONTEXT_SHOW');const context=decoded(call(['context','show'],meta),meta);demand(/^[A-Za-z0-9][\w.-]*$/.test(context));success('D-03',docker.sha256,'CONTEXT_SHOW');
    meta=diagMeta(docker,'D-04','CONTEXT_SAFE_PROJECTION','DOCKER_CONTEXT_INSPECT');const contextData=parsed(call(['context','inspect',context,'--format',FORMATS.context],meta),meta);shape(contextData,['name','host','skipTLSVerify','tlsMaterialPresent']);demand(contextData.name===context&&typeof contextData.skipTLSVerify==='boolean'&&typeof contextData.tlsMaterialPresent==='boolean');endpointGuard(contextData.host,['unix:///var/run/docker.sock','unix://'+path.join(os.homedir(),'.docker/run/docker.sock')]);const socket=fs.realpathSync(contextData.host.slice(7));demand(fs.statSync(socket).isSocket());success('D-04',docker.sha256,'CONTEXT_SAFE_PROJECTION');add('dockerContext',{version,context,endpoint:'unix://'+tokenize(contextData.host.slice(7)),socketRealpath:tokenize(socket),classification:contextData.tlsMaterialPresent?'LOCAL_UNIX_SOCKET_TLS_METADATA_PRESENT':'LOCAL_UNIX_SOCKET_NO_TLS_METADATA'});
    const query=(args,m)=>call(['--context',context,...args],m);let daemon=null,baseline=null,rawImages=[];
    try{meta=diagMeta(docker,'D-05','SERVER_VERSION_JSON','DAEMON_CONNECTIVITY');const server=parsed(query(['version','--format',FORMATS.connectivity],meta),meta);safeText(server);success('D-05',docker.sha256,'SERVER_VERSION_JSON');meta=diagMeta(docker,'D-06','DAEMON_SAFE_PROJECTION','DAEMON_IDENTITY');daemon=parsed(query(['info','--format',FORMATS.daemon],meta),meta);shape(daemon,['id','engine','os','osType','architecture','root']);identity(daemon.id);success('D-06',docker.sha256,'DAEMON_SAFE_PROJECTION');add('daemon',{id:daemon.id,engine:daemon.engine,os:daemon.os,architecture:daemon.architecture,root:'$DAEMON_STORAGE',localEndpoint:true,rootPathObserved:true,networkDefaultPolicy:'GATE-6B / GATE-7 VERIFICATION REQUIRED'});}catch(e){if(!(e instanceof InspectionFailure))throw e;daemonBlocked=e.code;diagnostic=e.diagnostic;}
    add('dockerStages',{records:stages});
    if(daemon){
      const listArgs={containers:['ps','-a','--no-trunc','--format','{{json .ID}}'],volumes:['volume','ls','--format','{{json .Name}}'],networks:['network','ls','--no-trunc','--format','{{json .ID}}']};
      const list=(args,cls)=>{const m=diagMeta(docker,'UNSPECIFIED','RESOURCE_LIST',cls),b=query(args,m);if(!b.length)return[];const v=decoded(b,m).split('\n').map(x=>parsed(Buffer.from(x+'\n'),m));v.forEach(identity);exactSet(v,v);return v;};
      const before=Object.fromEntries(Object.entries(listArgs).map(([k,a])=>[k,list(a,k.toUpperCase()+'_LIST')]));
      baseline={complete:true,containers:[],volumes:[],networks:[]};
      const mountClass=p=>daemonVolumePathProjection(p,daemon.root),networkInspectionRecords=[];
      for(const[plural,ids]of Object.entries(before)){
        const kind=plural.slice(0,-1);
        for(const id of ids){
          const network=kind==='network';
          const container=kind==='container';
          const template=network?'NETWORK_NATIVE_JSON_SINGLE':container?'CONTAINER_NATIVE_JSON_SAFE_SELECTION':'RESOURCE_SAFE_PROJECTION';
          const m=diagMeta(docker,'UNSPECIFIED',template,kind.toUpperCase()+'_INSPECT');
          const rawResource=query(network?['network','inspect',id]:container?['container','inspect',id]:[kind,'inspect','--format',FORMATS[kind],id],m);
          const selected=network?projectNetworkInspectDocument(rawResource,m):container?projectContainerInspectDocument(rawResource,m):rawResource;
          baseline[plural].push(parseResource(kind,selected,mountClass));
          if(network)networkInspectionRecords.push({targetToken:'network:target:sha256:'+hash(Buffer.from(id,'utf8')),commandTemplateId:template,exitCode:0,signal:null,stdoutPresence:Boolean(rawResource.length),stdoutParseCategory:'NATIVE_SINGLE_DOCUMENT_PASS',stderrClassification:'ABSENT'});
        }
        uniqueRecords(baseline[plural],kind==='volume'?'name':'id');
      }
      add('networkInspections',{records:networkInspectionRecords});
      add('baseline',baseline);
      add('freshness',freshness(baseline,null));
      add('collision',{result:'PARTIAL',reason:'SESSION_ID_NOT_RESERVED_HOST_LISTENERS_SEPARATE',reservedPortCollisions:baseline.containers.flatMap(c=>c.ports.filter(p=>p.hostPort>=59320&&p.hostPort<=59329).map(p=>({containerId:c.id,...p})))});
      const m=diagMeta(docker,'UNSPECIFIED','IMAGE_ID_LIST','IMAGE_LIST'),io=query(['image','ls','--no-trunc','--quiet'],m),ids=io.length?decoded(io,m).split('\n'):[];
      ids.forEach(x=>demand(/^sha256:[0-9a-f]{64}$/.test(x)));
      const images=[];
      for(const id of new Set(ids)){const imeta=diagMeta(docker,'UNSPECIFIED','IMAGE_NATIVE_JSON_SAFE_SELECTION','IMAGE_INSPECT'),im=projectImageInspectDocument(query(['image','inspect',id],imeta),imeta),projection=imageProjection(im);rawImages.push(im);images.push({...projection,identityApproval:provenance({...im,repoDigests:im.repoDigests??[]},null),commandPayload:'STRUCTURAL_ONLY',anonymousPrediction:'ROLE_MOUNTS_GATE_6B_PENDING'});}
      add('images',{images,approvedDigestEvidence:'REQUIRED',completeness:'COMPLETE_LOCAL_IMAGE_ID_LIST',aliasRows:ids.length});
      const roles=EXPECTED_IMAGE_ROLES.map(([role,reference])=>{const im=rawImages.find(x=>(x.repoTags??[]).includes(reference));if(!im)return{role,reference,status:'IMAGE-MISSING',imageId:null,repoDigests:[],platform:null,config:null,volumeCoverage:'IMAGE EVIDENCE PENDING'};const projection=imageProjection(im);return{role,reference,status:'DIGEST APPROVAL PENDING',imageId:im.id,repoDigests:(im.repoDigests??[]).filter(d=>d.startsWith(reference.split(':')[0]+'@sha256:')),platform:{os:projection.os,architecture:projection.architecture,variant:projection.variant},config:projection,volumeCoverage:'GATE-6B-PENDING'};});
      add('imageRoles',{roles,requiredPresent:'GATE-6B-PENDING_EFFECTIVE_PROFILE',requiredMissing:roles.filter(r=>r.status==='IMAGE-MISSING').map(r=>r.role),digestApproval:'HUMAN_APPROVAL_PENDING'});
      const graph={containers:baseline.containers.map(c=>({id:c.id,name:c.name,image:c.image,mounts:c.mounts,networks:c.networks,ports:c.ports})),volumes:baseline.volumes.map(v=>({name:v.name,driver:v.driver,mountpoint:v.mountpoint,consumers:baseline.containers.filter(c=>c.mounts.some(m=>m.type==='volume'&&m.name.value===v.name)).map(c=>c.id)})),networks:baseline.networks.map(n=>({id:n.id,name:n.name,driver:n.driver,attachments:n.attachmentEdges}))};
      add('graph',{...graph,completeness:'PERSISTENT_BASELINE_ONLY'});
    }
    const lsof=executable('lsof',process.env.PATH);demand(lsof,'LSOF_MISSING');const listeners=[];for(let p=59320;p<=59329;p++)for(const protocol of['TCP','UDP']){const args=['-nP',`-i${protocol}:${p}`,...(protocol==='TCP'?['-sTCP:LISTEN']:[]),'-Fpcn'];let b=Buffer.alloc(0);try{b=execFileSync(lsof.resolved,args,{env:childEnv,encoding:'buffer',timeout:5000,maxBuffer:512*1024,stdio:['ignore','pipe','pipe']});}catch(e){if(e.status!==1)throw new InspectionFailure('HOST_LISTENER_INSPECTION_ERROR',commandDiagnostic(Number.isSafeInteger(e.status)?'DOCKER_CLI_EXIT':'SUBPROCESS_SPAWN',{subStage:'HOST-LISTENER',executableSha256:lsof.sha256,argumentTemplateId:'FIXED_PORT_RANGE',exitCode:Number.isSafeInteger(e.status)?e.status:null,commandClass:'HOST_LISTENER',argumentCategories:['FIXED_RANGE','FIXED_PROTOCOL'],stderrClassification:safeStderrClass(e.stderr),stdoutPresence:Boolean(e.stdout?.length)}));b=e.stdout??Buffer.alloc(0);}if(b.length)listeners.push(...parseListeners(new TextDecoder('utf8',{fatal:true}).decode(b),p,protocol));}add('listeners',{range:'59320-59329',records:listeners,result:listeners.length?'PORT COLLISION BLOCKER':'PASS'});
    const sources=[['helper manifest/checksums','PASS'],['binary identity','PASS'],['Docker executable/context','PASS'],['daemon identity',daemon?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['resource baseline',baseline?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['freshness classification',baseline?'PARTIAL':'BLOCKED_BY_DAEMON_STAGE'],['local image inventory',daemon?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['image config projection',daemon?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['image declared volumes',daemon?'GATE-6B-PENDING':'BLOCKED_BY_DAEMON_STAGE'],['mounts',daemon?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['networks',daemon?'PASS':'BLOCKED_BY_DAEMON_STAGE'],['port listeners','PASS'],['config-reader coverage',coverage.result],['environment projection',env.result],['SQL-C exclusion readiness','GATE-6B-PENDING'],['temp/home','PASS'],['telemetry',optional.telemetryTransmission],['notifier',optional.notifier],['pg-delta',optional.pgdelta],['Vector',optional.vector],['egress',eg.result],['phase-gated blockers','GATE-6B-PENDING']].map(([source,status])=>({source,status}));add('h14',h14Aggregate(sources));const col=collectEvidence(findings,daemonBlocked?[daemonBlocked]:[]);add('collection',{findingKinds:Object.keys(col.byKind),blockers:col.blockers,expectedValuesChanged:false,retryPerformed:false,repairPerformed:false,cleanupPerformed:false});if(daemonBlocked)error=daemonBlocked;
  }catch(e){error=e instanceof ContractError?e.code:'INSPECTION_FAILED';if(e instanceof InspectionFailure)diagnostic=e.diagnostic;}
  if(diagnostic)add('diagnostic',diagnostic);
  return validateEnvelope({schema_version:'1',helper_id:'FOUNDATION-PRESTART-1',helper_sha256:aggregate,timestamp:new Date().toISOString(),phase:'READ_ONLY_PRESTART',subject:'LOCAL_METADATA_NOT_EXECUTION_SESSION',result:error?'BLOCKED':'PARTIAL',findings,error});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{demand(process.argv.length===2);process.stdout.write(JSON.stringify(runInspection(),null,2)+'\n');}catch{process.stderr.write('EVIDENCE_OUTPUT_REJECTED_NOT_PERSISTED\n');process.exitCode=1;}}
