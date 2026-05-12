// @ts-nocheck
import { Book, Menu, Sunset, Trees, Zap, Bell, X as XIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LogoIcon = ({ src, alt }) => {
  if (src) {
    return <img src={src} className="w-8" alt={alt} />;
  }
  return (
    <div className="w-8 h-8 rounded-xl overflow-hidden">
      <img
        src="/esperia.png"
        alt={alt || "Esperia logo"}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

const AVATAR_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#e11d48",
];

function getUserColor(email) {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++)
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getUserInitials(email) {
  if (!email) return "U";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function appNavPathActive(currentPath, url) {
  if (url === "/boards") {
    return currentPath === "/boards" || currentPath.startsWith("/boards/");
  }
  return currentPath === url;
}

function AppNavLink({ to, currentPath, children, className }) {
  const active = appNavPathActive(currentPath, to);
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}

const Navbar1 = ({
  logo = {
    url: "/",
    src: "https://www.shadcnblocks.com/images/block/block-1.svg",
    alt: "logo",
    title: "Trello",
  },
  hideMenu = false,
  menu = [
    { title: "Home", url: "#" },
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
          icon: <Zap className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Contact Us",
          description: "We are here to help you with any questions you have",
          icon: <Sunset className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Status",
          description: "Check the current status of our services and APIs",
          icon: <Trees className="size-5 shrink-0" />,
          url: "#",
        },
        {
          title: "Terms of Service",
          description: "Our terms and conditions for using our services",
          icon: <Book className="size-5 shrink-0" />,
          url: "#",
        },
      ],
    },
    { title: "Pricing", url: "#" },
    { title: "Blog", url: "#" },
  ],
  mobileExtraLinks = [
    { name: "Press", url: "#" },
    { name: "Contact", url: "#" },
    { name: "Imprint", url: "#" },
    { name: "Sitemap", url: "#" },
  ],
  auth = {
    login: { text: "Log in", url: "#" },
    signup: { text: "Sign up", url: "#" },
    session: null,
  },
  /** When the marketing `menu` is hidden, show these in-app links (e.g. Boards, Analytics). */
  appNav = null,
}) => {
  const session = auth.session;
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifData = useNotifications();
  const {
    notifications: notifs,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = notifData;
  const navigate = useNavigate();
  return (
    <section className="py-4 sticky top-0 z-40 bg-background/60 backdrop-blur-xl border-b border-border/40">
      <div className="mx-auto px-4">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link to={logo.url} className="flex items-center gap-2">
              <LogoIcon src={logo.src} alt={logo.alt} />
              <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-tight">
                {logo.title}
              </span>
            </Link>
            {appNav && appNav.length > 0 && (
              <div className="hidden sm:flex items-center gap-0.5 border-l border-border/60 pl-4 ml-1">
                {appNav.map((item) => (
                  <AppNavLink
                    key={`${item.url}-${item.title}`}
                    to={item.url}
                    currentPath={location.pathname}
                  >
                    {item.title}
                  </AppNavLink>
                ))}
              </div>
            )}
            {!hideMenu && (
              <div className="flex items-center">
                <NavigationMenu>
                  <NavigationMenuList>
                    {menu.map((item) => renderMenuItem(item))}
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md"
                style={{ backgroundColor: getUserColor(session.email) }}
                title={session.email}
              >
                {getUserInitials(session.email)}
              </div>
            )}
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  {/* Notification bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifs((v) => !v)}
                      className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Bell className="w-4.5 h-4.5 text-muted-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                    {showNotifs && (
                      <>
                        <div
                          className="fixed inset-0 z-50"
                          onClick={() => setShowNotifs(false)}
                        />
                        <div className="absolute top-full right-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-hidden animate-slide-down">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                            <span className="text-sm font-semibold">
                              Notifications
                            </span>
                            <div className="flex items-center gap-1">
                              {unreadCount > 0 && (
                                <button
                                  onClick={markAllAsRead}
                                  className="text-[11px] text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-secondary/40 transition-colors"
                                >
                                  Mark all read
                                </button>
                              )}
                              <button
                                onClick={() => setShowNotifs(false)}
                                className="p-1 rounded-lg hover:bg-secondary transition-colors"
                              >
                                <XIcon className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-[55vh]">
                            {notifs.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Bell className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                              </div>
                            ) : (
                              notifs.map((n) => (
                                <button
                                  key={n.id}
                                  onClick={() => {
                                    markAsRead(n.id);
                                    if (n.board_id)
                                      navigate(`/boards/${n.board_id}`);
                                    setShowNotifs(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 border-b border-border/20 hover:bg-secondary/30 transition-colors flex items-start gap-3 ${
                                    !n.read ? "bg-primary/5" : ""
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-pink-500" : "bg-transparent"}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm leading-snug ${!n.read ? "font-semibold" : "text-muted-foreground"}`}
                                    >
                                      {n.title}
                                    </p>
                                    {n.body && (
                                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                        {n.body}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                      {formatNotifTime(n.created_at)}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={session.onSignOut}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to={auth.login.url}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    {auth.login.text}
                  </Link>
                  <Link
                    to={auth.signup.url}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    {auth.signup.text}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link to={logo.url} className="flex items-center gap-2">
              <LogoIcon src={logo.src} alt={logo.alt} />
              <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-tight">
                {logo.title}
              </span>
            </Link>
            <Sheet>
              <SheetTrigger
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                )}
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link to={logo.url} className="flex items-center gap-2">
                      <LogoIcon src={logo.src} alt={logo.alt} />
                      <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-tight">
                        {logo.title}
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="my-6 flex flex-col gap-6">
                  {appNav && appNav.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {appNav.map((item) => (
                        <AppNavLink
                          key={`m-${item.url}-${item.title}`}
                          to={item.url}
                          currentPath={location.pathname}
                          className="justify-start rounded-lg px-3 py-2.5 text-base"
                        >
                          {item.title}
                        </AppNavLink>
                      ))}
                    </div>
                  )}
                  {!hideMenu && (
                    <>
                      <Accordion
                        type="single"
                        collapsible
                        className="flex w-full flex-col gap-4"
                      >
                        {menu.map((item) => renderMobileMenuItem(item))}
                      </Accordion>
                      <div className="border-t py-4">
                        <div className="grid grid-cols-2 justify-start">
                          {mobileExtraLinks.map((link, idx) => (
                            <a
                              key={idx}
                              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                              href={link.url}
                            >
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex justify-center py-2">
                    {session && (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-background shadow-md"
                        style={{ backgroundColor: getUserColor(session.email) }}
                      >
                        {getUserInitials(session.email)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {session ? (
                      <>
                        <span
                          className="text-sm text-muted-foreground px-1 truncate"
                          title={session.email}
                        >
                          {session.email}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={session.onSignOut}
                        >
                          Sign out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={auth.login.url}
                          className={cn(buttonVariants({ variant: "outline" }))}
                        >
                          {auth.login.text}
                        </Link>
                        <Link
                          to={auth.signup.url}
                          className={cn(buttonVariants())}
                        >
                          {auth.signup.text}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title} className="text-muted-foreground">
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 p-3">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <NavigationMenuLink asChild>
                  <a
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
                    href={subItem.url}
                  >
                    {subItem.icon}
                    <div>
                      <div className="text-sm font-semibold">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <p className="text-sm leading-snug text-muted-foreground">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </a>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink asChild>
        <a
          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
          href={item.url}
        >
          {item.title}
        </a>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <a
              key={subItem.title}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
              href={subItem.url}
            >
              {subItem.icon}
              <div>
                <div className="text-sm font-semibold">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-muted-foreground">
                    {subItem.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a key={item.title} href={item.url} className="font-semibold">
      {item.title}
    </a>
  );
};

function formatNotifTime(dateStr) {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export { Navbar1 };
