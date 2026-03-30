import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { BoardProvider } from './context/BoardContext';
import { Navbar1 } from './components/ui/shadcnblocks-com-navbar1';
import Landing from './pages/Landing';
import Home from './pages/Home';
import BoardView from './pages/BoardView';
import GitHubView from './pages/GitHubView';
import { LayoutDashboard, Book, Sunset, Trees, Zap, HelpCircle, Mail, Activity, FileText } from 'lucide-react';
import './App.css';

const navbarData = {
  logo: {
    url: "/",
    src: "",
    alt: "TaskFlow",
    title: "TaskFlow",
  },
  menu: [
    { title: "Home", url: "/" },
    { title: "Boards", url: "/boards" },
    {
      title: "Products",
      url: "#",
      items: [
        {
          title: "Blog",
          description: "The latest industry news, updates, and info",
          icon: <Book className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Company",
          description: "Our mission is to innovate and empower the world",
          icon: <Trees className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Careers",
          description: "Browse job listing and discover our workspace",
          icon: <Sunset className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Support",
          description: "Get in touch with our support team or visit our community forums",
          icon: <Zap className="size-5 shrink-0" />,
          url: "#",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "Help Center",
          description: "Get all the answers you need right here",
          icon: <HelpCircle className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Contact Us",
          description: "We are here to help you with any questions you have",
          icon: <Mail className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Status",
          description: "Check the current status of our services and APIs",
          icon: <Activity className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Terms of Service",
          description: "Our terms and conditions for using our services",
          icon: <FileText className="size-5 shrink-0" />,
          url: "#",
        },
      ],
    },
    { title: "Pricing", url: "#" },
    { title: "Blog", url: "#" },
  ],
  mobileExtraLinks: [
    { name: "Press", url: "#" },
    { name: "Contact", url: "#" },
    { name: "Imprint", url: "#" },
    { name: "Sitemap", url: "#" },
  ],
  auth: {
    login: { text: "Log in", url: "#" },
    signup: { text: "Sign up", url: "#" },
  },
};

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      <div className="relative z-10">
        <Navbar1 {...navbarData} hideMenu={!isLanding} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/boards" element={<Home />} />
          <Route path="/boards/:boardId" element={<BoardView />} />
          <Route path="/github" element={<GitHubView />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <BoardProvider>
        <AppContent />
      </BoardProvider>
    </BrowserRouter>
  );
}

export default App;
