import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from './i18n/index.jsx';
import { ProfileProvider } from './state/ProfileContext.jsx';
import { Footer, Header } from './components/Chrome.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Results from './pages/Results.jsx';
import SchemeDetail from './pages/SchemeDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Compare from './pages/Compare.jsx';
import Assistant from './pages/Assistant.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/results" element={<Results />} />
            <Route path="/scheme/:id" element={<SchemeDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </ProfileProvider>
    </I18nProvider>
  );
}
