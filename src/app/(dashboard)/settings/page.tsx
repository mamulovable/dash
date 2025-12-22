"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Camera, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const [userData, setUserData] = useState<{
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success && result.data.user) {
        const user = result.data.user;
        setUserData(user);
        setName(user.name || "");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        setUserData((prev) => prev ? { ...prev, name } : null);
        alert("Profile updated successfully");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const displayName = userData?.name || clerkUser?.fullName || clerkUser?.firstName || "User";
  const displayEmail = userData?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const displayAvatar = userData?.avatar_url || clerkUser?.imageUrl || "";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <div className="flex gap-6">
            <TabsList className="w-48 h-auto flex-col items-start">
              <TabsTrigger value="account" className="w-full justify-start">
                Account
              </TabsTrigger>
              <TabsTrigger value="usage" className="w-full justify-start">
                Usage & Billing
              </TabsTrigger>
              <TabsTrigger value="team" className="w-full justify-start">
                Team
              </TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="w-full justify-start">
                API Keys
              </TabsTrigger>
              <TabsTrigger value="white-label" className="w-full justify-start">
                White-Label
              </TabsTrigger>
              <TabsTrigger value="preferences" className="w-full justify-start">
                Preferences
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              {/* Account Tab */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                      Update your account information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={displayAvatar} alt={displayName} />
                        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm" disabled>
                          <Camera className="mr-2 h-4 w-4" />
                          Change photo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Profile photos managed by Clerk
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            id="email"
                            value={displayEmail}
                            readOnly
                            className="flex-1"
                          />
                          <Badge variant="success">Verified ✓</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Email managed by Clerk
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Password & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Password and security settings are managed by Clerk
                      </p>
                      <Button variant="outline" disabled>
                        Change Password
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-factor authentication</p>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Managed by Clerk</span>
                        <Button variant="outline" size="sm" disabled>Set up 2FA</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Usage Tab */}
              <TabsContent value="usage">
                <Link href="/settings/usage">View Usage & Billing →</Link>
              </TabsContent>

              {/* Other tabs */}
              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>
                      Manage team members and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Team features coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Notification settings coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api-keys">
                <Card>
                  <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">API key management coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="white-label">
                <Card>
                  <CardHeader>
                    <CardTitle>White-Label Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">White-label features coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">User preferences coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

