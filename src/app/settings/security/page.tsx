"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Shield, 
  Lock, 
  Smartphone, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Save,
  RefreshCw,
  Users,
  FileText,
  Settings,
  ShieldCheck,
  AlertCircle,
  Download,
  Upload,
  Printer,
  AlertOctagon,
  ShieldX,
  BarChart3,
  ChevronRight
} from "lucide-react";
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import SecurityAnalytics from '@/components/analytics/SecurityAnalytics';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SecuritySettings {
  // Password Policy
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: number;
  
  // Session Management
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  forceLogoutOnPasswordChange: boolean;
  
  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorMethod: "EMAIL" | "APP";
  backupCodesEnabled: boolean;
  
  // Login Security
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  
  // Audit & Monitoring
  auditLoggingEnabled: boolean;
  loginNotificationsEnabled: boolean;
  suspiciousActivityAlerts: boolean;
  
  // Advanced Security
  sslEnforcement: boolean;
  apiRateLimiting: boolean;
  dataEncryptionAtRest: boolean;
}

export default function SecurityPage() {
  const { user, hasPermission, isSuperAdmin, isAdmin, isDepartmentHead, isSystemAuditor, loading, isInitialized } = useUser();
  const router = useRouter();

  // All useState hooks must be called before any conditional logic
  const [settings, setSettings] = useState<SecuritySettings>({
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    forceLogoutOnPasswordChange: true,
    twoFactorEnabled: true,
    twoFactorMethod: "APP",
    backupCodesEnabled: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    auditLoggingEnabled: true,
    loginNotificationsEnabled: true,
    suspiciousActivityAlerts: true,
    sslEnforcement: true,
    apiRateLimiting: true,
    dataEncryptionAtRest: true,
  });

  // Real security status data - must be declared before any conditional logic
  const [securityStatus, setSecurityStatus] = useState({
    overallScore: 0,
    lastScan: new Date().toISOString(),
    vulnerabilities: 0,
    recommendations: 0,
    activeSessions: 0,
    failedAttempts: 0,
    suspiciousActivities: 0,
    totalUsers: 0,
    enabledFeatures: 0,
    recentActivity: [],
    recommendationsList: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("password");

  // Fetch settings and security status from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch security settings
        const settingsResponse = await fetch('/api/settings/security');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData);
        } else {
          console.error('Failed to fetch security settings');
          toast.error('Failed to load security settings');
        }

        // Fetch security status
        const statusResponse = await fetch('/api/security/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setSecurityStatus(statusData);
        } else {
          console.error('Failed to fetch security status');
          toast.error('Failed to load security status');
        }
      } catch (error) {
        console.error('Error fetching security data:', error);
        toast.error('Failed to load security data');
      }
    };

    if (canAccessSecuritySettings()) {
      fetchData();
    }
  }, []);

  // Role-based access control
  const canAccessSecuritySettings = () => {
    if (loading || !isInitialized) return false;
    return isSuperAdmin || isAdmin || hasPermission('Security Settings');
  };

  const canManageAdvancedSecurity = () => {
    return isSuperAdmin || isAdmin;
  };

  const canManageSystemSecurity = () => {
    return isSuperAdmin;
  };

  const canViewSecurityLogs = () => {
    return isSuperAdmin || isAdmin || isSystemAuditor || hasPermission('Audit Logs');
  };

  const canManageEmergencyAccess = () => {
    return isSuperAdmin;
  };

  const canManageDatabaseSecurity = () => {
    return isSuperAdmin || isAdmin;
  };

  // Redirect if no access - only after initialization
  useEffect(() => {
    if (isInitialized && !canAccessSecuritySettings()) {
      toast.error("You don't have permission to access security settings");
      router.push('/dashboard');
    }
  }, [isInitialized, user, router]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Show loading state only during initial load
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="px-6 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!canAccessSecuritySettings()) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="px-6 py-4">
          <Card className="shadow-md rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 p-0">
              <div className="py-4 sm:py-6">
                <div className="flex items-center gap-3 px-4 sm:px-6">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <ShieldX className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Access Denied</h3>
                    <p className="text-red-100 text-sm">You don't have permission to access security settings</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertOctagon className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-semibold text-gray-900">Security Settings Access Restricted</h3>
                <p className="text-gray-600">
                  You do not have the required permissions to access security settings. 
                  Please contact your system administrator if you believe this is an error.
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <Button onClick={() => router.push('/dashboard/admin')}>
                    Return to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/settings')}>
                    Settings Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate security metrics
  const securityMetrics = {
    totalUsers: securityStatus.totalUsers,
    activeSessions: securityStatus.activeSessions,
    failedAttempts: securityStatus.failedAttempts,
    suspiciousActivities: securityStatus.suspiciousActivities,
    enabledFeatures: securityStatus.enabledFeatures
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        toast.success("Security settings updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update security settings");
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error("Failed to update security settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIpAddress = () => {
    if (newIpAddress && !settings.ipWhitelist.includes(newIpAddress)) {
      setSettings(prev => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, newIpAddress]
      }));
      setNewIpAddress("");
      toast.success("IP address added to whitelist");
    }
  };

  const handleRemoveIpAddress = (ip: string) => {
    setSettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(addr => addr !== ip)
    }));
    toast.success("IP address removed from whitelist");
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch updated security status
      const statusResponse = await fetch('/api/security/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSecurityStatus(statusData);
        toast.success("Security data refreshed successfully");
      } else {
        toast.error("Failed to refresh security data");
      }
    } catch (error) {
      console.error('Error refreshing security data:', error);
      toast.error("Failed to refresh security data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewLogs = () => {
    // Scroll to the Security Monitoring section
    const monitoringSection = document.getElementById('security-monitoring');
    if (monitoringSection) {
      monitoringSection.scrollIntoView({ behavior: 'smooth' });
      toast.success("Security Monitoring Dashboard loaded - Viewing comprehensive security analytics");
    } else {
      toast.error("Security Monitoring section not found");
    }
  };

  const handleExportSettings = async () => {
    try {
      // Create a JSON blob with current security settings
      const exportData = {
        exportDate: new Date().toISOString(),
        securitySettings: settings,
        securityStatus: securityStatus,
        exportVersion: "1.0"
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Security settings exported successfully");
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error("Failed to export security settings");
    }
  };

  const handleBackupSettings = async () => {
    try {
      // Create a comprehensive backup with additional metadata
      const backupData = {
        backupDate: new Date().toISOString(),
        backupType: "security_settings",
        version: "1.0",
        systemInfo: {
          totalUsers: securityStatus.totalUsers,
          activeSessions: securityStatus.activeSessions,
          securityScore: securityStatus.overallScore
        },
        securitySettings: settings,
        securityStatus: securityStatus,
        backupNotes: "Automated security settings backup"
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-backup-${new Date().toISOString().split('T')[0]}-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Security settings backup created successfully");
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error("Failed to create security backup");
    }
  };

  const handleRunAudit = async () => {
    try {
      // Simulate audit process
      toast.info("Running security audit...");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate audit results
      const auditResults: {
        auditDate: string;
        overallScore: number;
        findings: Array<{
          category: string;
          status: string;
          details: string;
          recommendation: string;
        }>;
        recommendations: string[];
        vulnerabilities: number;
      } = {
        auditDate: new Date().toISOString(),
        overallScore: securityStatus.overallScore,
        findings: [
          {
            category: "Password Policy",
            status: settings.minPasswordLength >= 8 ? "PASS" : "FAIL",
            details: `Minimum password length: ${settings.minPasswordLength} characters`,
            recommendation: settings.minPasswordLength < 8 ? "Increase minimum password length to 8 characters" : "Password policy is adequate"
          },
          {
            category: "Two-Factor Authentication",
            status: settings.twoFactorEnabled ? "PASS" : "FAIL",
            details: `2FA enabled: ${settings.twoFactorEnabled ? "Yes" : "No"}`,
            recommendation: settings.twoFactorEnabled ? "2FA is properly configured" : "Enable two-factor authentication for enhanced security"
          },
          {
            category: "Session Management",
            status: settings.sessionTimeoutMinutes <= 60 ? "PASS" : "WARNING",
            details: `Session timeout: ${settings.sessionTimeoutMinutes} minutes`,
            recommendation: settings.sessionTimeoutMinutes > 60 ? "Consider reducing session timeout for better security" : "Session timeout is appropriate"
          },
          {
            category: "Login Security",
            status: settings.maxLoginAttempts <= 5 ? "PASS" : "WARNING",
            details: `Max login attempts: ${settings.maxLoginAttempts}`,
            recommendation: settings.maxLoginAttempts > 5 ? "Consider reducing maximum login attempts" : "Login attempt limits are appropriate"
          },
          {
            category: "Advanced Security",
            status: settings.sslEnforcement && settings.apiRateLimiting ? "PASS" : "WARNING",
            details: `SSL Enforcement: ${settings.sslEnforcement}, Rate Limiting: ${settings.apiRateLimiting}`,
            recommendation: "Ensure SSL enforcement and API rate limiting are enabled"
          }
        ],
        recommendations: [],
        vulnerabilities: securityStatus.vulnerabilities
      };

      // Generate recommendations based on findings
      auditResults.findings.forEach(finding => {
        if (finding.status === "FAIL" || finding.status === "WARNING") {
          (auditResults.recommendations as string[]).push(finding.recommendation);
        }
      });

      // Create audit report blob
      const auditBlob = new Blob([JSON.stringify(auditResults, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(auditBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Security audit completed. Found ${auditResults.recommendations.length} recommendations.`);
    } catch (error) {
      console.error('Error running audit:', error);
      toast.error("Failed to run security audit");
    }
  };

  const handlePrintReport = () => {
    try {
      toast.info("Generating security report...");
      // Create a comprehensive security report
      const reportData = {
        reportTitle: "Security Status Report",
        generatedDate: new Date().toLocaleString(),
        securityMetrics: {
          overallScore: securityStatus.overallScore,
          totalUsers: securityStatus.totalUsers,
          activeSessions: securityStatus.activeSessions,
          failedAttempts: securityStatus.failedAttempts,
          suspiciousActivities: securityStatus.suspiciousActivities,
          vulnerabilities: securityStatus.vulnerabilities
        },
        securitySettings: {
          passwordPolicy: {
            minLength: settings.minPasswordLength,
            requireUppercase: settings.requireUppercase,
            requireLowercase: settings.requireLowercase,
            requireNumbers: settings.requireNumbers,
            requireSpecialChars: settings.requireSpecialChars,
            expiryDays: settings.passwordExpiryDays
          },
          sessionManagement: {
            timeoutMinutes: settings.sessionTimeoutMinutes,
            maxConcurrentSessions: settings.maxConcurrentSessions,
            forceLogoutOnPasswordChange: settings.forceLogoutOnPasswordChange
          },
          twoFactorAuth: {
            enabled: settings.twoFactorEnabled,
            method: settings.twoFactorMethod,
            backupCodesEnabled: settings.backupCodesEnabled
          },
          loginSecurity: {
            maxLoginAttempts: settings.maxLoginAttempts,
            lockoutDurationMinutes: settings.lockoutDurationMinutes,
            ipWhitelistEnabled: settings.ipWhitelistEnabled,
            ipWhitelistCount: settings.ipWhitelist.length
          },
          advancedSecurity: {
            auditLoggingEnabled: settings.auditLoggingEnabled,
            loginNotificationsEnabled: settings.loginNotificationsEnabled,
            suspiciousActivityAlerts: settings.suspiciousActivityAlerts,
            sslEnforcement: settings.sslEnforcement,
            apiRateLimiting: settings.apiRateLimiting,
            dataEncryptionAtRest: settings.dataEncryptionAtRest
          }
        },
        recentActivity: securityStatus.recentActivity || [],
        recommendations: securityStatus.recommendationsList || []
      };

      // Create print-friendly HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Popup blocked! Please allow popups for this site to print reports");
        return;
      }
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Security Status Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .section { margin-bottom: 30px; }
              .section h2 { color: #2563eb; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
              .metric { display: flex; justify-content: space-between; margin: 5px 0; }
              .metric strong { color: #374151; }
              .status-pass { color: #059669; }
              .status-fail { color: #dc2626; }
              .status-warning { color: #d97706; }
              .recommendations { background: #f3f4f6; padding: 15px; border-radius: 5px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Security Status Report</h1>
              <p>Generated on ${reportData.generatedDate}</p>
            </div>
            
            <div class="section">
              <h2>Security Metrics</h2>
              <div class="metric"><strong>Overall Security Score:</strong> <span class="status-${reportData.securityMetrics.overallScore >= 80 ? 'pass' : reportData.securityMetrics.overallScore >= 60 ? 'warning' : 'fail'}">${reportData.securityMetrics.overallScore}%</span></div>
              <div class="metric"><strong>Total Users:</strong> ${reportData.securityMetrics.totalUsers}</div>
              <div class="metric"><strong>Active Sessions:</strong> ${reportData.securityMetrics.activeSessions}</div>
              <div class="metric"><strong>Failed Login Attempts:</strong> ${reportData.securityMetrics.failedAttempts}</div>
              <div class="metric"><strong>Suspicious Activities:</strong> ${reportData.securityMetrics.suspiciousActivities}</div>
              <div class="metric"><strong>Vulnerabilities:</strong> ${reportData.securityMetrics.vulnerabilities}</div>
            </div>
            
            <div class="section">
              <h2>Security Configuration Summary</h2>
              <div class="metric"><strong>2FA Enabled:</strong> <span class="status-${reportData.securitySettings.twoFactorAuth.enabled ? 'pass' : 'fail'}">${reportData.securitySettings.twoFactorAuth.enabled ? 'Yes' : 'No'}</span></div>
              <div class="metric"><strong>Audit Logging:</strong> <span class="status-${reportData.securitySettings.advancedSecurity.auditLoggingEnabled ? 'pass' : 'fail'}">${reportData.securitySettings.advancedSecurity.auditLoggingEnabled ? 'Enabled' : 'Disabled'}</span></div>
              <div class="metric"><strong>SSL Enforcement:</strong> <span class="status-${reportData.securitySettings.advancedSecurity.sslEnforcement ? 'pass' : 'fail'}">${reportData.securitySettings.advancedSecurity.sslEnforcement ? 'Enabled' : 'Disabled'}</span></div>
              <div class="metric"><strong>API Rate Limiting:</strong> <span class="status-${reportData.securitySettings.advancedSecurity.apiRateLimiting ? 'pass' : 'fail'}">${reportData.securitySettings.advancedSecurity.apiRateLimiting ? 'Enabled' : 'Disabled'}</span></div>
              <div class="metric"><strong>Data Encryption:</strong> <span class="status-${reportData.securitySettings.advancedSecurity.dataEncryptionAtRest ? 'pass' : 'fail'}">${reportData.securitySettings.advancedSecurity.dataEncryptionAtRest ? 'Enabled' : 'Disabled'}</span></div>
            </div>
            
            <div class="section">
              <h2>Password Policy</h2>
              <div class="metric"><strong>Minimum Length:</strong> ${reportData.securitySettings.passwordPolicy.minLength} characters</div>
              <div class="metric"><strong>Require Uppercase:</strong> ${reportData.securitySettings.passwordPolicy.requireUppercase ? 'Yes' : 'No'}</div>
              <div class="metric"><strong>Require Numbers:</strong> ${reportData.securitySettings.passwordPolicy.requireNumbers ? 'Yes' : 'No'}</div>
              <div class="metric"><strong>Require Special Characters:</strong> ${reportData.securitySettings.passwordPolicy.requireSpecialChars ? 'Yes' : 'No'}</div>
              <div class="metric"><strong>Password Expiry:</strong> ${reportData.securitySettings.passwordPolicy.expiryDays} days</div>
            </div>
            
            <div class="section">
              <h2>Session Management</h2>
              <div class="metric"><strong>Session Timeout:</strong> ${reportData.securitySettings.sessionManagement.timeoutMinutes} minutes</div>
              <div class="metric"><strong>Max Concurrent Sessions:</strong> ${reportData.securitySettings.sessionManagement.maxConcurrentSessions}</div>
              <div class="metric"><strong>Force Logout on Password Change:</strong> ${reportData.securitySettings.sessionManagement.forceLogoutOnPasswordChange ? 'Yes' : 'No'}</div>
            </div>
            
            <div class="section">
              <h2>Login Security</h2>
              <div class="metric"><strong>Max Login Attempts:</strong> ${reportData.securitySettings.loginSecurity.maxLoginAttempts}</div>
              <div class="metric"><strong>Lockout Duration:</strong> ${reportData.securitySettings.loginSecurity.lockoutDurationMinutes} minutes</div>
              <div class="metric"><strong>IP Whitelist Enabled:</strong> ${reportData.securitySettings.loginSecurity.ipWhitelistEnabled ? 'Yes' : 'No'}</div>
              <div class="metric"><strong>IP Whitelist Entries:</strong> ${reportData.securitySettings.loginSecurity.ipWhitelistCount}</div>
            </div>
            
            ${reportData.recommendations.length > 0 ? `
            <div class="section">
              <h2>Recommendations</h2>
              <div class="recommendations">
                ${reportData.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
              </div>
            </div>
            ` : ''}
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for the content to load before printing
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (printError) {
            console.error('Error printing:', printError);
            toast.error("Failed to open print dialog");
          }
        }, 500);
      }
      
      toast.success("Security report opened in new window for printing");
    } catch (error) {
      console.error('Error generating print report:', error);
      toast.error("Failed to generate security report");
    }
  };

  // Track settings changes
  const updateSettings = (updates: Partial<SecuritySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="px-6 py-4">
        <PageHeader
          title="Security Settings"
          subtitle="Configure system security policies and monitoring"
          breadcrumbs={[
            { label: "Settings", href: "/settings" },
            { label: "Security" }
          ]}
        />
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          <SummaryCard
            icon={<Shield className="text-blue-500 w-5 h-5" />}
            label="Security Score"
            value={`${securityStatus.overallScore}%`}
            valueClassName={getSecurityScoreColor(securityStatus.overallScore)}
            sublabel="Overall security rating"
          />
          <SummaryCard
            icon={<Users className="text-blue-500 w-5 h-5" />}
            label="Active Sessions"
            value={securityMetrics.activeSessions}
            valueClassName="text-blue-900"
            sublabel="Currently active users"
          />
          <SummaryCard
            icon={<AlertTriangle className="text-blue-500 w-5 h-5" />}
            label="Failed Attempts"
            value={securityMetrics.failedAttempts}
            valueClassName="text-red-600"
            sublabel="Recent failed logins"
          />
          <SummaryCard
            icon={<AlertCircle className="text-blue-500 w-5 h-5" />}
            label="Vulnerabilities"
            value={securityStatus.vulnerabilities}
            valueClassName="text-red-600"
            sublabel="Security vulnerabilities"
          />
          <SummaryCard
            icon={<ShieldCheck className="text-blue-500 w-5 h-5" />}
            label="Security Features"
            value={securityMetrics.enabledFeatures}
            valueClassName="text-green-600"
            sublabel="Enabled security features"
          />
        </div>

        {/* Quick Actions Panel */}
        <div className="mb-8">
          <QuickActionsPanel
            variant="premium"
            title="Security Quick Actions"
            subtitle={`Essential security tools and shortcuts - ${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrator' : 'Limited Access'}`}
            icon={
              <div className="w-6 h-6 text-white">
                <Shield className="w-6 h-6" />
              </div>
            }
            actionCards={[
              {
                id: 'refresh-security',
                label: 'Refresh Data',
                description: 'Reload security data',
                icon: isRefreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-white" />
                ),
                onClick: handleRefreshData,
                disabled: isRefreshing,
                loading: isRefreshing
              },
              {
                id: 'export-security',
                label: 'Export Settings',
                description: 'Export security configuration',
                icon: <Download className="w-5 h-5 text-white" />,
                onClick: handleExportSettings,
                disabled: !canManageAdvancedSecurity()
              },
              {
                id: 'print-security',
                label: 'Print Report',
                description: 'Print security report',
                icon: <Printer className="w-5 h-5 text-white" />,
                onClick: handlePrintReport
              },
              {
                id: 'backup-settings',
                label: 'Backup Settings',
                description: 'Create settings backup',
                icon: <Upload className="w-5 h-5 text-white" />,
                onClick: handleBackupSettings,
                disabled: !canManageAdvancedSecurity()
              },
              {
                id: 'security-audit',
                label: 'Run Audit',
                description: 'Perform security audit',
                icon: <ShieldCheck className="w-5 h-5 text-white" />,
                onClick: handleRunAudit,
                disabled: !canManageAdvancedSecurity()
              },
                             {
                 id: 'view-logs',
                 label: 'View Logs',
                 description: 'Access security monitoring dashboard',
                 icon: <FileText className="w-5 h-5 text-white" />,
                 onClick: handleViewLogs,
                 disabled: !canViewSecurityLogs()
               }
            ]}
            lastActionTime="5 minutes ago"
            onLastActionTimeChange={() => {}}
            collapsible={true}
            defaultCollapsed={true}
            onCollapseChange={(collapsed) => {
              console.log('Security Quick Actions Panel collapsed:', collapsed);
            }}
          />
        </div>

        {/* Security Settings Tabs */}
        <Card className="shadow-md rounded-xl overflow-hidden p-0">
          <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
            <div className="py-4 sm:py-6">
              <div className="flex items-center gap-3 px-4 sm:px-6">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Security Configuration</h3>
                  <p className="text-blue-100 text-sm">
                    {isSuperAdmin ? "Full system security configuration" : 
                     isAdmin ? "General security settings management" : 
                     "Limited security settings access"}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
                         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 rounded">
                <TabsTrigger value="password" className="flex items-center gap-2 rounded">
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Password</span>
                  <span className="sm:hidden">Pass</span>
                </TabsTrigger>
                <TabsTrigger value="session" className="flex items-center gap-2 rounded">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Session</span>
                  <span className="sm:hidden">Sess</span>
                </TabsTrigger>
                <TabsTrigger value="2fa" className="flex items-center gap-2 rounded">
                  <Smartphone className="w-4 h-4" />
                  2FA
                </TabsTrigger>
                <TabsTrigger value="login" className="flex items-center gap-2 rounded">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                  <span className="sm:hidden">Login</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced" 
                  className="flex items-center gap-2 rounded"
                  disabled={!canManageAdvancedSecurity()}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Advanced</span>
                  <span className="sm:hidden">Adv</span>
                  {!canManageAdvancedSecurity() && (
                    <Badge variant="secondary" className="ml-1 text-xs">Admin+</Badge>
                  )}
                </TabsTrigger>

              </TabsList>

              {/* Password Policy Tab */}
              <TabsContent value="password" className="space-y-6 mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Password Policy</CardTitle>
                    <CardDescription>
                      Configure password requirements and expiration policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="minLength">Minimum Password Length</Label>
                          <Input
                            id="minLength"
                            type="number"
                            value={settings.minPasswordLength}
                            onChange={(e) => updateSettings({
                              minPasswordLength: parseInt(e.target.value)
                            })}
                            min="6"
                            max="32"
                            disabled={!canManageAdvancedSecurity()}
                          />
                          {!canManageAdvancedSecurity() && (
                            <p className="text-xs text-gray-500 mt-1">Requires administrator privileges</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="expiryDays">Password Expiry (days)</Label>
                          <Input
                            id="expiryDays"
                            type="number"
                            value={settings.passwordExpiryDays}
                            onChange={(e) => updateSettings({
                              passwordExpiryDays: parseInt(e.target.value)
                            })}
                            min="30"
                            max="365"
                            disabled={!canManageAdvancedSecurity()}
                          />
                          {!canManageAdvancedSecurity() && (
                            <p className="text-xs text-gray-500 mt-1">Requires administrator privileges</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="uppercase">Require Uppercase Letters</Label>
                            <p className="text-xs text-gray-500">Enforce at least one uppercase letter</p>
                          </div>
                          <Switch
                            id="uppercase"
                            checked={settings.requireUppercase}
                            onCheckedChange={(checked) => updateSettings({
                              requireUppercase: checked
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="lowercase">Require Lowercase Letters</Label>
                          <Switch
                            id="lowercase"
                            checked={settings.requireLowercase}
                            onCheckedChange={(checked) => updateSettings({
                              requireLowercase: checked
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="numbers">Require Numbers</Label>
                          <Switch
                            id="numbers"
                            checked={settings.requireNumbers}
                            onCheckedChange={(checked) => updateSettings({
                              requireNumbers: checked
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="special">Require Special Characters</Label>
                          <Switch
                            id="special"
                            checked={settings.requireSpecialChars}
                            onCheckedChange={(checked) => updateSettings({
                              requireSpecialChars: checked
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Session Management Tab */}
              <TabsContent value="session" className="space-y-6 mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Session Management</CardTitle>
                    <CardDescription>
                      Configure session timeout and concurrent session limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="timeout">Session Timeout (minutes)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          value={settings.sessionTimeoutMinutes}
                          onChange={(e) => updateSettings({
                            sessionTimeoutMinutes: parseInt(e.target.value)
                          })}
                          min="5"
                          max="480"
                        />
                      </div>
                      <div>
                        <Label htmlFor="concurrent">Max Concurrent Sessions</Label>
                        <Input
                          id="concurrent"
                          type="number"
                          value={settings.maxConcurrentSessions}
                          onChange={(e) => updateSettings({
                            maxConcurrentSessions: parseInt(e.target.value)
                          })}
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="forceLogout">Force Logout on Password Change</Label>
                      <Switch
                        id="forceLogout"
                        checked={settings.forceLogoutOnPasswordChange}
                        onCheckedChange={(checked) => updateSettings({
                          forceLogoutOnPasswordChange: checked
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Two-Factor Authentication Tab */}
              <TabsContent value="2fa" className="space-y-6 mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Configure 2FA settings and backup options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="2faEnabled">Enable Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-600">Require 2FA for all users</p>
                      </div>
                      <Switch
                        id="2faEnabled"
                        checked={settings.twoFactorEnabled}
                        onCheckedChange={(checked) => updateSettings({
                          twoFactorEnabled: checked
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="2faMethod">2FA Method</Label>
                      <Select
                        value={settings.twoFactorMethod}
                        onValueChange={(value) => updateSettings({
                          twoFactorMethod: value as "EMAIL" | "APP"
                        })}
                      >
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select 2FA method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APP">Authenticator App</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="backupCodes">Enable Backup Codes</Label>
                        <p className="text-sm text-gray-600">Allow users to generate backup codes</p>
                      </div>
                      <Switch
                        id="backupCodes"
                        checked={settings.backupCodesEnabled}
                        onCheckedChange={(checked) => updateSettings({
                          backupCodesEnabled: checked
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Login Security Tab */}
              <TabsContent value="login" className="space-y-6 mt-6">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Login Security</CardTitle>
                    <CardDescription>
                      Configure login attempt limits and IP restrictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="maxAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxAttempts"
                          type="number"
                          value={settings.maxLoginAttempts}
                          onChange={(e) => updateSettings({
                            maxLoginAttempts: parseInt(e.target.value)
                          })}
                          min="3"
                          max="10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                        <Input
                          id="lockoutDuration"
                          type="number"
                          value={settings.lockoutDurationMinutes}
                          onChange={(e) => updateSettings({
                            lockoutDurationMinutes: parseInt(e.target.value)
                          })}
                          min="5"
                          max="1440"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="ipWhitelist">Enable IP Whitelist</Label>
                        <p className="text-sm text-gray-600">Restrict access to specific IP addresses</p>
                      </div>
                      <Switch
                        id="ipWhitelist"
                        checked={settings.ipWhitelistEnabled}
                        onCheckedChange={(checked) => updateSettings({
                          ipWhitelistEnabled: checked
                        })}
                      />
                    </div>

                    {settings.ipWhitelistEnabled && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter IP address (e.g., 192.168.1.1)"
                            value={newIpAddress}
                            onChange={(e) => setNewIpAddress(e.target.value)}
                          />
                          <Button onClick={handleAddIpAddress}>Add</Button>
                        </div>
                        <div className="space-y-2">
                          {settings.ipWhitelist.map((ip, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{ip}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveIpAddress(ip)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Security Tab */}
              <TabsContent value="advanced" className="space-y-6 mt-6">
                {!canManageAdvancedSecurity() ? (
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldX className="w-5 h-5 text-red-500" />
                        Access Restricted
                      </CardTitle>
                      <CardDescription>
                        Advanced security settings require administrator privileges
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Alert>
                        <AlertOctagon className="h-4 w-4" />
                        <AlertDescription>
                          You need administrator privileges to access advanced security settings. 
                          Please contact your system administrator for assistance.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle>Advanced Security</CardTitle>
                                             <CardDescription>
                         Configure advanced security features and monitoring
                       </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="auditLogging">Enable Audit Logging</Label>
                            <p className="text-sm text-gray-600">Log all security-related activities</p>
                          </div>
                          <Switch
                            id="auditLogging"
                            checked={settings.auditLoggingEnabled}
                            onCheckedChange={(checked) => updateSettings({
                              auditLoggingEnabled: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="loginNotifications">Login Notifications</Label>
                            <p className="text-sm text-gray-600">Send notifications for new logins</p>
                          </div>
                          <Switch
                            id="loginNotifications"
                            checked={settings.loginNotificationsEnabled}
                            onCheckedChange={(checked) => updateSettings({
                              loginNotificationsEnabled: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="suspiciousAlerts">Suspicious Activity Alerts</Label>
                            <p className="text-sm text-gray-600">Alert on suspicious login patterns</p>
                          </div>
                          <Switch
                            id="suspiciousAlerts"
                            checked={settings.suspiciousActivityAlerts}
                            onCheckedChange={(checked) => updateSettings({
                              suspiciousActivityAlerts: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="sslEnforcement">SSL Enforcement</Label>
                            <p className="text-sm text-gray-600">Require HTTPS for all connections</p>
                          </div>
                          <Switch
                            id="sslEnforcement"
                            checked={settings.sslEnforcement}
                            onCheckedChange={(checked) => updateSettings({
                              sslEnforcement: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="rateLimiting">API Rate Limiting</Label>
                            <p className="text-sm text-gray-600">Limit API requests to prevent abuse</p>
                          </div>
                          <Switch
                            id="rateLimiting"
                            checked={settings.apiRateLimiting}
                            onCheckedChange={(checked) => updateSettings({
                              apiRateLimiting: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="dataEncryption">Data Encryption at Rest</Label>
                            <p className="text-sm text-gray-600">Encrypt stored data</p>
                          </div>
                          <Switch
                            id="dataEncryption"
                            checked={settings.dataEncryptionAtRest}
                            onCheckedChange={(checked) => updateSettings({
                              dataEncryptionAtRest: checked
                            })}
                          />
                        </div>

                        {/* Super Admin Only Features */}
                        {isSuperAdmin && (
                          <>
                            <Separator />
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-sm text-blue-600">Super Administrator Features</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="emergencyAccess">Emergency Access</Label>
                                  <p className="text-sm text-gray-600">Enable emergency system access protocols</p>
                                </div>
                                <Switch
                                  id="emergencyAccess"
                                  checked={true}
                                  disabled={true}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="databaseAdmin">Database Administration</Label>
                                  <p className="text-sm text-gray-600">Direct database security management</p>
                                </div>
                                <Switch
                                  id="databaseAdmin"
                                  checked={true}
                                  disabled={true}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="systemOverride">System Configuration Override</Label>
                                  <p className="text-sm text-gray-600">Override system security configurations</p>
                                </div>
                                <Switch
                                  id="systemOverride"
                                  checked={true}
                                  disabled={true}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>




            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span>Unsaved changes</span>
                  </div>
                )}
                {lastSaved && !hasUnsavedChanges && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  disabled={isSaving}
                  className="rounded"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving || !hasUnsavedChanges}
                  className={`rounded ${hasUnsavedChanges ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        

        {/* Security Monitoring Section */}
        <div id="security-monitoring">
          <Card className="shadow-md rounded-xl overflow-hidden p-0">
          <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
              <div className="py-4 sm:py-6">
                <div className="flex items-center gap-3 px-4 sm:px-6">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Security Monitoring</h3>
                                         <p className="text-green-100 text-sm">Comprehensive security analytics and monitoring</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!canViewSecurityLogs() ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldX className="w-5 h-5 text-red-500" />
                      Access Restricted
                    </CardTitle>
                    <CardDescription>
                      Security monitoring requires audit log permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertOctagon className="h-4 w-4" />
                      <AlertDescription>
                        You need audit log permissions to access security monitoring. 
                        Please contact your system administrator for assistance.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                                     {/* Security Analytics */}
                   <div>
                     <SecurityAnalytics />
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Floating Back to Top Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-6 z-50 rounded shadow-md hover:shadow-xl transition-all duration-200 opacity-80 hover:opacity-100"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
        <span className="ml-2 hidden sm:inline">Back to Top</span>
      </Button>
    </div>
  );
} 