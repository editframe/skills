interface EnvType {
  WEB_HOST: string;
  GRAPHQL_URL: string;
  GRAPHQL_WS_URL: string;
}

interface WithEnvProps {
  children: (env: EnvType) => React.ReactNode;
}

/**
 * Higher-order component that provides environment variables as render props
 */
export function WithEnv({ children }: WithEnvProps) {
  // Get environment from client-side window.ENV or server-side global
  const env: EnvType = (typeof window !== 'undefined' && window.ENV) ||
    (globalThis as any).__ENV_CONTEXT__;

  if (!env) {
    return null;
  }

  return <>{children(env)}</>;
}
