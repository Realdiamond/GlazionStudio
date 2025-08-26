import React, { useState } from 'react';
import { User, Mail, Calendar, Settings, Save, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    nickname: 'John',
    email: 'john.doe@example.com',
    useNickname: false,
  });
  
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleSave = () => {
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const displayName = formData.useNickname ? formData.nickname : formData.fullName;

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header onToggleSidebar={handleToggleSidebar} />
      
      <div className="flex-1 flex relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
        />
        
        <main className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}>
          <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6 pt-20 pb-24">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="" alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{displayName}</CardTitle>
                      <CardDescription>{formData.email}</CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? "outline" : "default"}
                    className={isEditing ? "" : "gradient-primary text-primary-foreground hover:opacity-90"}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Manage your personal details and display preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      value={formData.nickname}
                      onChange={(e) => handleChange('nickname', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="pl-10"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Display Name Preference</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose whether to display your full name or nickname in the app.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="useNickname" className="text-sm">
                      Use Nickname
                    </Label>
                    <Switch
                      id="useNickname"
                      checked={formData.useNickname}
                      onCheckedChange={(checked) => handleChange('useNickname', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your account preferences and security settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      January 15, 2024
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <p className="font-medium">Last Activity</p>
                    <p className="text-sm text-muted-foreground">
                      Today at 2:30 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;