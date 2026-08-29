// Entirely synthetic, never a reserved session identity or real environment config.
import { LABELS } from '../lib/contracts.mjs';
import { SQL_INPUTS, EGRESS } from '../lib/auditors.mjs';
export const P = 'wwfnd-20000101t000000z-000000000000';
export const otherP = 'wwfnd-20000101t000000z-111111111111';
export const labels = () => Object.fromEntries(LABELS.map(k => [k, { present: true, value: P }]));
export const id = 'a'.repeat(64), image = 'sha256:' + 'b'.repeat(64), net = 'c'.repeat(64);
export const binding = { containerPort: 5432, protocol: 'tcp', hostIP: '127.0.0.1', hostPort: 59322 };
export const rawContainer = () => ({ id, rawName: '/supabase_db_' + P, image,
  runtimeState: {
    status: { state: 'PRESENT', value: 'exited' }, running: { state: 'PRESENT', value: false }, paused: { state: 'PRESENT', value: false }, restarting: { state: 'PRESENT', value: false },
    oomKilled: { state: 'PRESENT', value: false }, dead: { state: 'PRESENT', value: false }, pid: { state: 'PRESENT', value: 0 }, exitCode: { state: 'PRESENT', value: 0 },
  },
  portsState: 'PRESENT', ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '59322' }] }, plannedPortsState: 'EMPTY', plannedPorts: {},
  mountsState: 'PRESENT', mounts: [{ type: 'volume', name: { state: 'PRESENT', value: 'synthetic-volume' }, destination: '/data', rw: true, propagation: { state: 'EMPTY', value: '' } }],
  networksState: 'PRESENT', networks: [{ name: 'synthetic-network', networkId: { state: 'PRESENT', value: net }, endpointId: { state: 'PRESENT', value: 'd'.repeat(64) }, aliases: { state: 'PRESENT', values: ['db'] } }], labels: labels() });
export const nativeContainerDocument = (overrides = {}) => [{
  Id: id, Name: '/supabase_db_' + P, Image: image,
  State: { Status: 'exited', Running: false, Paused: false, Restarting: false, OOMKilled: false, Dead: false, Pid: 0, ExitCode: 0, Error: 'not-captured' },
  Config: { Labels: Object.fromEntries(LABELS.map(k => [k, P])), Env: ['SYNTHETIC_ENV=not-captured'] },
  HostConfig: { PortBindings: {}, NetworkMode: 'default' },
  Mounts: [{ Type: 'volume', Name: 'synthetic-volume', Source: '/daemon/private/not-captured', Destination: '/data', RW: true, Propagation: '' }],
  NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '59322' }] }, Networks: { 'synthetic-network': { NetworkID: net, EndpointID: 'd'.repeat(64), Aliases: ['db'], IPAddress: 'not-captured' } } },
  Path: '/not-captured', Args: ['not-captured'], ...overrides,
}];
export const rawVolume = () => ({ name: 'synthetic-volume', driver: 'local', scope: 'local', mountpoint: '/var/lib/docker/volumes/synthetic-volume/_data', labelsState: 'PRESENT_NOT_CAPTURED', optionsState: 'EMPTY', labels: labels() });
export const rawNetwork = () => ({ id: net, name: 'synthetic-network', driver: 'bridge', scope: 'local', internal: false, attachable: true, ingress: false, configOnly: false, ipv6: false, ipamDriver: 'default', ipamConfigState: 'PRESENT_NOT_CAPTURED', ipamConfig: [{ subnet: '172.28.0.0/16', gateway: '172.28.0.1', ipRange: '', auxiliaryAddresses: { presence: 'ABSENT', count: 0, token: null } }], optionsState: 'EMPTY', labelsState: 'PRESENT_NOT_CAPTURED', attachments: [{ containerId: id, name: 'synthetic', endpointId: 'd'.repeat(64) }], labels: labels() });
export const builtinNetwork = (name, driver) => ({ id: net, name, driver, scope: 'local', internal: false, attachable: false, ingress: false, configOnly: false, ipv6: false, ipamDriver: 'default', ipamConfigState: 'NULL', ipamConfig: [], optionsState: 'EMPTY', labelsState: 'NULL', attachments: [], labels: Object.fromEntries(LABELS.map(k => [k, { present: false, value: null }])) });
export const nativeNetworkDocument = (overrides = {}) => [{
  Id: net, Name: 'synthetic-network', Driver: 'bridge', Scope: 'local', Internal: false, Attachable: true, Ingress: false, ConfigOnly: false, EnableIPv6: false,
  IPAM: { Driver: 'default', Config: [{ Subnet: '172.28.0.0/16', Gateway: '172.28.0.1', IPRange: '' }] },
  Options: {}, Labels: Object.fromEntries(LABELS.map(k => [k, P])),
  Containers: { [id]: { Name: 'synthetic', EndpointID: 'd'.repeat(64), IPv4Address: '172.28.0.2/16' } },
  Peers: null, Services: null, ...overrides,
}];
export const rawImage = () => ({ id: image, repoTags: ['registry.example/synthetic:1'], repoDigests: ['registry.example/synthetic@sha256:' + 'd'.repeat(64)], os: 'linux', architecture: 'arm64', variant: '', volumes: { '/data': {} }, user: '1000', workingDir: '/work', exposedPorts: { '5432/tcp': {} }, entrypoint: ['/usr/bin/synthetic'], cmd: ['serve'], healthcheck: { Test: ['CMD', 'synthetic'], Interval: 10, Timeout: 5, Retries: 3, StartPeriod: 1 } });
export const nativeImageDocument = (overrides = {}) => [{
  Id: image,
  RepoTags: ['registry.example/synthetic:1'],
  RepoDigests: ['registry.example/synthetic@sha256:' + 'd'.repeat(64)],
  Os: 'linux',
  Architecture: 'arm64',
  Variant: '',
  Config: {
    Entrypoint: ['/usr/bin/synthetic'], Cmd: ['serve'], User: '1000', WorkingDir: '/work',
    ExposedPorts: { '5432/tcp': {} }, Volumes: { '/data': {} },
    Healthcheck: { Test: ['CMD', 'synthetic'], Interval: 10, Timeout: 5, Retries: 3, StartPeriod: 1 },
    Env: ['SYNTHETIC_ENV=not-captured'], Labels: { synthetic: 'not-captured' }, StopSignal: 'SIGTERM',
  },
  RootFS: { Type: 'layers', Layers: ['sha256:' + 'e'.repeat(64)] }, History: [], Size: 123,
  ...overrides,
}];
export const baseline = () => ({ complete: true, containers: [], volumes: [], networks: [] });
export const topology = () => ({ containers: [{ id, image, networks: [net], volumes: ['synthetic-volume'], binds: [], ports: [binding] }], volumes: [{ name: 'synthetic-volume', consumers: [id] }], networks: [{ id: net, containers: [id] }] });
export const sql = () => Object.fromEntries(SQL_INPUTS.map(k => [k, { present: false, reachable: false, proof: 'COMPLETE_PATH_METADATA' }]));
export const optional = () => ({ telemetryDisabled: '1', doNotTrack: '1', notifierDisabled: '1', debug: false, consent: 'denied', versionEmpty: true, pgdeltaConfig: false, pgdeltaEnvironment: false, schemaPathsEmpty: true, analyticsEnabled: false });
export const egressInput = () => Object.fromEntries(EGRESS.map(k => [k, { enabled: false, targetClass: 'unknown' }]));
