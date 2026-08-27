import { useEffect, useState } from 'react';

const initialState = {
  loading: true,
  error: '',
  data: null
};

export default function App() {
  const [apiState, setApiState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;

    async function loadGreeting() {
      try {
        const response = await fetch('/api/hello');

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setApiState({ loading: false, error: '', data });
        }
      } catch (error) {
        if (!cancelled) {
          setApiState({
            loading: false,
            error: error instanceof Error ? error.message : 'Request failed',
            data: null
          });
        }
      }
    }

    loadGreeting();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="intro">
        <div className="orbit-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="eyebrow">Node.js + Express + React</p>
          <h1>Hello World</h1>
          <p className="summary">
            A working starter with a React client connected to an Express API.
          </p>
        </div>
      </section>

      <section className="api-panel" aria-live="polite">
        <div className="panel-header">
          <span className="status-dot" />
          <span>GET /api/hello</span>
        </div>

        {apiState.loading && <p className="response-text">Loading API response...</p>}

        {apiState.error && (
          <p className="response-text error">API error: {apiState.error}</p>
        )}

        {apiState.data && (
          <pre className="response-code">
            {JSON.stringify(apiState.data, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
