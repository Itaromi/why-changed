export interface LicenseStatus {
  valid: boolean;
  plan: 'free' | 'pro';
  error?: string;
}

const LEMON_SQUEEZY_API = 'https://api.lemonsqueezy.com/v1/licenses/validate';

export async function checkLicense(licenseKey: string): Promise<LicenseStatus> {
  try {
    const response = await fetch(LEMON_SQUEEZY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ license_key: licenseKey }),
    });

    if (!response.ok) {
      return { valid: false, plan: 'free', error: 'License validation failed' };
    }

    const data = (await response.json()) as {
      valid: boolean;
      license_key?: { status: string };
    };

    if (data.valid && data.license_key?.status === 'active') {
      return { valid: true, plan: 'pro' };
    }

    return {
      valid: false,
      plan: 'free',
      error: 'License key is not active',
    };
  } catch {
    // Network error — fall back to free tier silently
    return { valid: false, plan: 'free', error: 'Could not reach license server' };
  }
}

export async function resolvePlan(): Promise<'free' | 'pro'> {
  const key = process.env.WHY_LICENSE_KEY;
  if (!key) return 'free';

  const status = await checkLicense(key);
  return status.plan;
}
