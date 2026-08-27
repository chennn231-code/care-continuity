import { Navigate, useLocation } from 'react-router-dom';

const QUERY_CALLBACK_KEYS = ['code', 'error', 'error_code', 'error_description'];
const HASH_CALLBACK_KEYS = ['access_token', 'refresh_token', 'error', 'error_code', 'error_description', 'type'];

export function RootEntryRoute() {
  const { pathname, search, hash } = useLocation();
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.slice(1));
  const isCallback = pathname === '/' && (
    QUERY_CALLBACK_KEYS.some((key) => query.has(key)) ||
    HASH_CALLBACK_KEYS.some((key) => fragment.has(key))
  );

  // Detect by exact key, but forward the original bytes without normalizing,
  // logging, or dropping callback parameters (including unknown extra keys).
  return <Navigate to={isCallback ? `/auth/confirm${search}${hash}` : '/v2/prototype'} replace />;
}
