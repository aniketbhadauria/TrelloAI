import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { BoardProvider, useBoards } from "./context/BoardContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Navbar1 } from "./components/ui/shadcnblocks-com-navbar1";
import Landing from "./features/boards/LandingPage";
import Home from "./features/boards/HomePage";
import BoardView from "./features/board-view/BoardViewPage";
import ArchivePage from "./features/boards/ArchivePage";
import Login from "./features/auth/LoginPage";
import Signup from "./features/auth/SignupPage";
import {
  Book,
  Sunset,
  Trees,
  Zap,
  HelpCircle,
  Mail,
  Activity,
  FileText,
} from "lucide-react";

const navbarDataBase = {
  logo: {
    url: "/",
    src: "",
    alt: "Trello",
    title: "Trello",
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
          description:
            "Get in touch with our support team or visit our community forums",
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
};

// eslint-disable-next-line react/prop-types
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";
  const { session, signOut } = useAuth();
  const { persistBoardsNow } = useBoards();

  const appNav =
    session && !isLanding
      ? [
          { title: "Boards", url: "/boards" },
          { title: "Archive", url: "/archive" },
        ]
      : null;

  const navbarData = {
    ...navbarDataBase,
    appNav,
    auth: {
      login: { text: "Log in", url: "/login" },
      signup: { text: "Sign up", url: "/signup" },
      session: session?.user?.email
        ? {
            email: session.user.email,
            onSignOut: async () => {
              try {
                await persistBoardsNow();
              } catch (error) {
                console.error(
                  "Unable to persist boards before sign out:",
                  error,
                );
              }
              await signOut();
              navigate("/", { replace: true });
            },
          }
        : null,
    },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      <div className="relative z-10">
        <Navbar1 {...navbarData} hideMenu={!isLanding} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/boards"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boards/:boardId"
            element={
              <ProtectedRoute>
                <BoardView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/archive"
            element={
              <ProtectedRoute>
                <ArchivePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
