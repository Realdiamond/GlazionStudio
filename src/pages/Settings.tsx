import React, { useState, useRef, useEffect } from 'react';
import { Settings, User, Bell, Shield, Palette, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Settings state
  const [notifications, setNotifications] = useState({
    newFeatures: true,
    aiUpdates: true,
    tips: false,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    analytics: true,
    crashReports: true,
    personalization: true,
  });

  const [appearance, setAppearance] = useState({
    theme: 'system',
    fontSize: 'medium',
    messageFontSize: 'medium',
    fontWeight: 'regular',
    animations: true,
  });

  const [profile, setProfile] = useState({
    name: 'RealDiamond',
    email: 'realDiamonddigital@gmail.com',
    bio: 'It is Just us and we aint relenting',
  });

  const [bioCount, setBioCount] = useState(profile.bio.length);
  const maxBioLength = 1000;

  // Handle sticky tabs on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current || !headerRef.current) return;
      
      const container = document.querySelector('.settings-container');
      if (!container) return;
      
      const headerHeight = 56; // Header height (3.5rem = 56px)
      const tabsOriginalTop = headerRef.current.offsetTop + headerRef.current.offsetHeight + 32; // Header + margin
      const currentScrollTop = container.scrollTop;
      
      // Make sticky when scroll position passes where tabs would be under header
      const shouldBeSticky = currentScrollTop >= (tabsOriginalTop - headerHeight);
      setIsTabsSticky(shouldBeSticky);
    };

    const container = document.querySelector('.settings-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Export started",
      description: "Your data export is being prepared. You'll receive an email when ready.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please choose an image smaller than 2MB.",
            variant: "destructive",
          });
          return;
        }
        
        // Check file type
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
          toast({
            title: "Invalid file format",
            description: "Please use JPG, PNG, or GIF format.",
            variant: "destructive",
          });
          return;
        }
        
        // Handle successful upload
        toast({
          title: "Profile photo updated",
          description: "Your new profile photo has been uploaded successfully.",
        });
      }
    };
    input.click();
  };

  const handleBioChange = (value: string) => {
    if (value.length <= maxBioLength) {
      setProfile(prev => ({ ...prev, bio: value }));
      setBioCount(value.length);
    }
  };

  return (
    <>
      <style>{`
        .settings-container {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) transparent;
        }
        
        .settings-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .settings-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .settings-container::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border));
          border-radius: 3px;
        }
        
        .settings-container::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--border));
        }

        .bio-textarea {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) transparent;
        }
        
        .bio-textarea::-webkit-scrollbar {
          width: 4px;
        }
        
        .bio-textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .bio-textarea::-webkit-scrollbar-thumb {
          background-color: hsl(var(--border));
          border-radius: 2px;
        }
      `}</style>
      
      <div className="settings-container h-full overflow-y-auto pr-2">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div ref={headerRef} className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
              <Settings className="h-7 w-7" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            {/* Sticky Tabs */}
            <div 
              ref={tabsRef}
              className={`${isTabsSticky ? 'fixed top-14 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border' : 'relative'}`}
              style={isTabsSticky ? {
                marginLeft: 'calc(var(--sidebar-offset, 0px))',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem'
              } : {}}
            >
              <div className={`${isTabsSticky ? 'max-w-4xl mx-auto' : ''}`}>
                <TabsList className="flex w-full items-center rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto">
                  <div className="flex w-full min-w-max sm:min-w-0">
                    <TabsTrigger value="profile" className="flex-1 text-center whitespace-nowrap px-3 py-2">Profile</TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 text-center whitespace-nowrap px-3 py-2">Notifications</TabsTrigger>
                    <TabsTrigger value="appearance" className="flex-1 text-center whitespace-nowrap px-3 py-2">Appearance</TabsTrigger>
                    <TabsTrigger value="privacy" className="flex-1 text-center whitespace-nowrap px-3 py-2">Privacy</TabsTrigger>
                  </div>
                </TabsList>
              </div>
            </div>

            {/* Add spacing when tabs are sticky */}
            {isTabsSticky && <div className="h-14" />}

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar and Name Row - Centered */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <Avatar 
                        className="h-16 w-16 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-primary/20"
                        onClick={handleAvatarClick}
                      >
                        <AvatarImage src={undefined} alt={profile.name} />
                        <AvatarFallback className="text-lg">
                          {profile.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="name" className="block mb-2">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="border-2 border-border focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="border-2 border-border focus:border-primary"
                    />
                  </div>

                  {/* Bio with character counter */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <div className="relative">
                      <Textarea
                        id="bio"
                        placeholder="Tell us about your pottery journey..."
                        value={profile.bio}
                        onChange={(e) => handleBioChange(e.target.value)}
                        className="bio-textarea resize-none h-24 overflow-y-auto pr-4 border-2 border-border focus:border-primary"
                        maxLength={maxBioLength}
                      />
                    </div>
                    <div className="text-right">
                      <span className={`text-xs ${bioCount > maxBioLength * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {bioCount}/{maxBioLength}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose what notifications you'd like to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="new-features">New Features</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when we release new features
                        </p>
                      </div>
                      <Switch
                        id="new-features"
                        checked={notifications.newFeatures}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, newFeatures: checked }))
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="ai-updates">AI Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about AI model improvements
                        </p>
                      </div>
                      <Switch
                        id="ai-updates"
                        checked={notifications.aiUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, aiUpdates: checked }))
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="tips">Tips & Tutorials</Label>
                        <p className="text-sm text-muted-foreground">
                          Helpful pottery tips and tutorials
                        </p>
                      </div>
                      <Switch
                        id="tips"
                        checked={notifications.tips}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, tips: checked }))
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="marketing">Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">
                          Promotional content and special offers
                        </p>
                      </div>
                      <Switch
                        id="marketing"
                        checked={notifications.marketing}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, marketing: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how GlazionStudio looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label>Theme</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred color scheme
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Light', 'Dark', 'System'].map((theme) => (
                          <Button
                            key={theme}
                            variant={appearance.theme === theme.toLowerCase() ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAppearance(prev => ({ ...prev, theme: theme.toLowerCase() }))}
                          >
                            {theme}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label>Font Size</Label>
                        <p className="text-sm text-muted-foreground">
                          Adjust text size for better readability
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Small', 'Medium', 'Large'].map((size) => (
                          <Button
                            key={size}
                            variant={appearance.fontSize === size.toLowerCase() ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAppearance(prev => ({ ...prev, fontSize: size.toLowerCase() }))}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label>Message Font Size</Label>
                        <p className="text-sm text-muted-foreground">
                          Adjust AI response and message text size
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Small', 'Medium', 'Large'].map((size) => (
                          <Button
                            key={size}
                            variant={appearance.messageFontSize === size.toLowerCase() ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAppearance(prev => ({ ...prev, messageFontSize: size.toLowerCase() }))}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label>Font Weight</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose font weight for chat messages
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Regular', 'Medium', 'Bold'].map((weight) => (
                          <Button
                            key={weight}
                            variant={appearance.fontWeight === weight.toLowerCase() ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAppearance(prev => ({ ...prev, fontWeight: weight.toLowerCase() }))}
                          >
                            {weight}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="animations">Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable smooth animations and transitions
                        </p>
                      </div>
                      <Switch
                        id="animations"
                        checked={appearance.animations}
                        onCheckedChange={(checked) =>
                          setAppearance(prev => ({ ...prev, animations: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Data
                  </CardTitle>
                  <CardDescription>
                    Control how your data is used and stored
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="analytics">Usage Analytics</Label>
                        <p className="text-sm text-muted-foreground">
                          Help improve GlazionStudio by sharing usage data
                        </p>
                      </div>
                      <Switch
                        id="analytics"
                        checked={privacy.analytics}
                        onCheckedChange={(checked) =>
                          setPrivacy(prev => ({ ...prev, analytics: checked }))
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="crash-reports">Crash Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically send crash reports to help fix bugs
                        </p>
                      </div>
                      <Switch
                        id="crash-reports"
                        checked={privacy.crashReports}
                        onCheckedChange={(checked) =>
                          setPrivacy(prev => ({ ...prev, crashReports: checked }))
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Label htmlFor="personalization">Personalization</Label>
                        <p className="text-sm text-muted-foreground">
                          Use your data to provide personalized recommendations
                        </p>
                      </div>
                      <Switch
                        id="personalization"
                        checked={privacy.personalization}
                        onCheckedChange={(checked) =>
                          setPrivacy(prev => ({ ...prev, personalization: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Data Management</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download or delete your personal data
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleExportData}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export Data
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteAccount}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-8 pb-4">
            <Button onClick={handleSave} className="gradient-primary">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;