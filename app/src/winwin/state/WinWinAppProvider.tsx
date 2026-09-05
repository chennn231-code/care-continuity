import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { PublicError, SessionView } from '../contracts/frontendContract';
import type { VerticalSliceService } from '../contracts/verticalSliceService';

type SessionState =
  | Readonly<{ status: 'checking' }>
  | Readonly<{ status: 'signedIn'; session: SessionView }>
  | Readonly<{ status: 'signedOut' }>
  | Readonly<{ status: 'recoverableError'; error: PublicError }>
  | Readonly<{ status: 'unavailable' }>;

type WinWinAppContextValue = Readonly<{
  service: VerticalSliceService;
  sessionState: SessionState;
  contextGeneration: number;
  retrySession: () => void;
  invalidateProtectedContext: () => void;
}>;

const WinWinAppContext = createContext<WinWinAppContextValue | null>(null);

export function WinWinAppProvider({
  service,
  children
}: Readonly<{ service: VerticalSliceService; children: ReactNode }>) {
  const [sessionState, setSessionState] = useState<SessionState>({ status: 'checking' });
  const [contextGeneration, setContextGeneration] = useState(0);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const requestGeneration = useRef(0);

  useEffect(() => {
    const request = ++requestGeneration.current;
    setSessionState({ status: 'checking' });

    void service.resolveSession().then((result) => {
      if (request !== requestGeneration.current) return;
      if (result.result === 'SUCCESS') {
        setSessionState(result.data.disposition === 'SIGNED_IN'
          ? { status: 'signedIn', session: result.data }
          : { status: 'signedOut' });
        return;
      }
      if (result.result === 'TEMPORARY_FAILURE') {
        setSessionState({ status: 'recoverableError', error: result.error });
        return;
      }
      setSessionState({ status: 'unavailable' });
    });

    return () => { requestGeneration.current++; };
  }, [service, sessionAttempt]);

  const retrySession = useCallback(() => setSessionAttempt((attempt) => attempt + 1), []);
  const invalidateProtectedContext = useCallback(() => {
    requestGeneration.current++;
    setContextGeneration((generation) => generation + 1);
    setSessionState({ status: 'unavailable' });
  }, []);

  const value = useMemo<WinWinAppContextValue>(() => ({
    service,
    sessionState,
    contextGeneration,
    retrySession,
    invalidateProtectedContext
  }), [service, sessionState, contextGeneration, retrySession, invalidateProtectedContext]);

  return <WinWinAppContext.Provider value={value}>{children}</WinWinAppContext.Provider>;
}

export function useWinWinApp() {
  const context = useContext(WinWinAppContext);
  if (!context) throw new Error('useWinWinApp must be used within WinWinAppProvider');
  return context;
}
