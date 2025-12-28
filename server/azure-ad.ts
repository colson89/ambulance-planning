import { ConfidentialClientApplication, Configuration, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node';
import { storage } from './storage';
import { decryptPassword } from './crypto-utils';

const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

interface AzureAdUserInfo {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
}

export async function getAzureAdClient(): Promise<ConfidentialClientApplication | null> {
  const config = await storage.getAzureAdConfig();
  if (!config || !config.enabled || !config.tenantId || !config.clientId || !config.clientSecretEncrypted) {
    return null;
  }

  const clientSecret = decryptPassword(config.clientSecretEncrypted);
  if (!clientSecret) {
    console.error('Failed to decrypt Azure AD client secret');
    return null;
  }

  const msalConfig: Configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: clientSecret
    }
  };

  return new ConfidentialClientApplication(msalConfig);
}

export async function getAuthorizationUrl(redirectUri: string): Promise<string | null> {
  const client = await getAzureAdClient();
  if (!client) return null;

  const authCodeUrlParameters: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: redirectUri,
    prompt: 'select_account'
  };

  try {
    return await client.getAuthCodeUrl(authCodeUrlParameters);
  } catch (error) {
    console.error('Failed to get Azure AD authorization URL:', error);
    return null;
  }
}

export async function handleCallback(code: string, redirectUri: string): Promise<AzureAdUserInfo | null> {
  const client = await getAzureAdClient();
  if (!client) return null;

  const tokenRequest: AuthorizationCodeRequest = {
    code: code,
    scopes: SCOPES,
    redirectUri: redirectUri
  };

  try {
    const response = await client.acquireTokenByCode(tokenRequest);
    
    if (!response || !response.accessToken) {
      console.error('No access token received from Azure AD');
      return null;
    }

    const userInfo = await fetchUserInfo(response.accessToken);
    return userInfo;
  } catch (error) {
    console.error('Failed to acquire token from Azure AD:', error);
    return null;
  }
}

async function fetchUserInfo(accessToken: string): Promise<AzureAdUserInfo | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user info from Microsoft Graph:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      mail: data.mail || null,
      userPrincipalName: data.userPrincipalName,
      displayName: data.displayName,
      givenName: data.givenName || null,
      surname: data.surname || null
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

export async function isAzureAdEnabled(): Promise<boolean> {
  const config = await storage.getAzureAdConfig();
  return !!(config && config.enabled && config.tenantId && config.clientId && config.clientSecretEncrypted);
}

export async function getAzureAdConfigForClient(): Promise<{ enabled: boolean; configured: boolean }> {
  const config = await storage.getAzureAdConfig();
  const configured = !!(config && config.tenantId && config.clientId && config.clientSecretEncrypted);
  return {
    enabled: config?.enabled ?? false,
    configured
  };
}
