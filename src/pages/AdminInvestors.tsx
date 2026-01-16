import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Users, Monitor, Smartphone, MapPin, Clock, UserCheck, Activity, LogOut } from "lucide-react";
import { getAdminSession, clearAdminSession } from "@/lib/adminAuth";

interface LoginEvent {
  id: number;
  username: string;
  user_agent: string;
  ip_address: string;
  logged_in_at: string;
  city?: string;
  country?: string;
  region?: string;
}

interface UniqueUser {
  username: string;
  totalLogins: number;
  lastLogin: string;
  firstLogin: string;
  devices: string[];
  browsers: string[];
  locations: string[];
  ips: string[];
}

const VERCEL_API_URL = "/api/get-logins";

const AdminInvestors = () => {
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const adminUser = getAdminSession();

  // Redirect if not authenticated
  useEffect(() => {
    if (!adminUser) {
      navigate("/admin/login");
    }
  }, [adminUser, navigate]);

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  if (!adminUser) {
    return null;
  }

  const fetchLogins = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(VERCEL_API_URL);
      if (!response.ok) throw new Error("Failed to fetch login data");
      const data = await response.json();
      setLogins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogins();
  }, []);

  const getDeviceType = (userAgent: string) => {
    if (!userAgent) return "Unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return "Mobile";
    }
    return "Desktop";
  };

  const getBrowser = (userAgent: string) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    return "Other";
  };

  const getOS = (userAgent: string) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
    return "Other";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getLocation = (login: LoginEvent) => {
    if (login.city && login.country) {
      return `${login.city}, ${login.country}`;
    }
    if (login.country) return login.country;
    return "—";
  };

  // Calculate unique users with aggregated stats
  const uniqueUsers = useMemo<UniqueUser[]>(() => {
    const userMap = new Map<string, UniqueUser>();

    logins.forEach((login) => {
      const existing = userMap.get(login.username);
      const device = getDeviceType(login.user_agent);
      const browser = getBrowser(login.user_agent);
      const location = getLocation(login);

      if (existing) {
        existing.totalLogins++;
        if (new Date(login.logged_in_at) > new Date(existing.lastLogin)) {
          existing.lastLogin = login.logged_in_at;
        }
        if (new Date(login.logged_in_at) < new Date(existing.firstLogin)) {
          existing.firstLogin = login.logged_in_at;
        }
        if (!existing.devices.includes(device)) existing.devices.push(device);
        if (!existing.browsers.includes(browser)) existing.browsers.push(browser);
        if (location !== "—" && !existing.locations.includes(location)) existing.locations.push(location);
        if (!existing.ips.includes(login.ip_address)) existing.ips.push(login.ip_address);
      } else {
        userMap.set(login.username, {
          username: login.username,
          totalLogins: 1,
          lastLogin: login.logged_in_at,
          firstLogin: login.logged_in_at,
          devices: [device],
          browsers: [browser],
          locations: location !== "—" ? [location] : [],
          ips: [login.ip_address],
        });
      }
    });

    return Array.from(userMap.values()).sort(
      (a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
    );
  }, [logins]);

  const stats = useMemo(() => ({
    totalLogins: logins.length,
    uniqueUsers: uniqueUsers.length,
    desktopLogins: logins.filter((l) => getDeviceType(l.user_agent) === "Desktop").length,
    mobileLogins: logins.filter((l) => getDeviceType(l.user_agent) === "Mobile").length,
    todayLogins: logins.filter((l) => {
      const today = new Date();
      const loginDate = new Date(l.logged_in_at);
      return loginDate.toDateString() === today.toDateString();
    }).length,
  }), [logins, uniqueUsers]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Activity Dashboard</h1>
            <p className="text-muted-foreground">
              Logged in as <span className="font-medium">{adminUser.email}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogins} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayLogins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Desktop</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.desktopLogins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mobile</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mobileLogins}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Unique Users</TabsTrigger>
            <TabsTrigger value="events">All Login Events</TabsTrigger>
          </TabsList>

          {/* Unique Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Unique Users ({uniqueUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8 text-destructive">
                    <p>Error: {error}</p>
                    <Button onClick={fetchLogins} variant="outline" className="mt-4">
                      Try Again
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading user data...
                  </div>
                ) : uniqueUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Total Logins</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>First Login</TableHead>
                        <TableHead>Devices</TableHead>
                        <TableHead>Browsers</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead>IPs Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniqueUsers.map((user) => (
                        <TableRow key={user.username}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.totalLogins}x</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatRelativeTime(user.lastLogin)}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(user.firstLogin)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.devices.map((d) => (
                                <Badge key={d} variant="outline" className="text-xs">
                                  {d}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.browsers.map((b) => (
                                <Badge key={b} variant="outline" className="text-xs">
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.locations.length > 0 ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {user.locations.join(", ")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {user.ips.length} unique
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  All Login Events ({logins.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8 text-destructive">
                    <p>Error: {error}</p>
                    <Button onClick={fetchLogins} variant="outline" className="mt-4">
                      Try Again
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading login events...
                  </div>
                ) : logins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No login events recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Login Time</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Browser</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logins.map((login) => (
                        <TableRow key={login.id}>
                          <TableCell className="font-medium">{login.username}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{formatRelativeTime(login.logged_in_at)}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(login.logged_in_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getDeviceType(login.user_agent) === "Mobile" ? "secondary" : "outline"}>
                              {getDeviceType(login.user_agent)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getOS(login.user_agent)}</TableCell>
                          <TableCell className="text-sm">{getBrowser(login.user_agent)}</TableCell>
                          <TableCell>
                            {getLocation(login) !== "—" ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {getLocation(login)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {login.ip_address}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminInvestors;
