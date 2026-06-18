/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  name: string;
  url: string;
  urls?: string[];
  logo?: string;
  source?: string;
  country?: string;
}

export interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (o: boolean) => void;
  setActiveTab: (t: any) => void;
  activeTab: string;
  setCurrentChannel: (c: any) => void;
  currentChannel: any;
  t: any;
  lang: string;
  setIsCountryModalOpen: (o: boolean) => void;
  selectedCountry: string;
  deferredPrompt: any;
  handleInstallApp: () => void;
  streamMode: string;
  setStreamMode: (m: any) => void;
  customProxyUrl: string;
  setCustomProxyUrl: (u: string) => void;
  proxyHost: string;
  setProxyHost: (h: string) => void;
  proxyPort: string;
  setProxyPort: (p: string) => void;
  proxyType: string;
  setProxyType: (t: any) => void;
  userAgent: string;
  setUserAgent: (ua: string) => void;
  referer: string;
  setReferer: (r: string) => void;
  isServer1Enabled: boolean;
  setIsServer1Enabled: (v: boolean) => void;
  isServer2Enabled: boolean;
  setIsServer2Enabled: (v: boolean) => void;
  isServer3Enabled: boolean;
  setIsServer3Enabled: (v: boolean) => void;
}
