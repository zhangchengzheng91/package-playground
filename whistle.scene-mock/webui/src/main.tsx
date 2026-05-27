import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AntdAppProvider from '@/antd-app-provider';
import AppShell from '@/app-shell';
import RulesListPage from '@/rules/rules-page';
import VariablesProjectsPage from '@/variables/variables-projects-page';
import VariablesSearchPage from '@/variables/variables-search-page';
import { ROUTER_BASENAME } from '@/router-basename';
import './globals.css';

function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AntdAppProvider>
        <Routes>
          <Route
            element={<AppShell />}
          >
            <Route index element={<Navigate to="/variables/projects" replace />} />
            <Route path="variables" element={<Outlet />}>
              <Route index element={<Navigate to="search" replace />} />
              <Route path="search" element={<VariablesSearchPage />} />
              <Route path="projects" element={<VariablesProjectsPage />} />
            </Route>
            <Route path="rules" element={<RulesListPage />} />
          </Route>
        </Routes>
      </AntdAppProvider>
    </BrowserRouter>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

createRoot(rootEl).render(<App />);
