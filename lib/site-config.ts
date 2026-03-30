const getConfiguredSiteUrl = (): string | undefined => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return siteUrl ? siteUrl : undefined;
};

export const getSiteUrl = (): string | undefined => getConfiguredSiteUrl();

export const getRequiredSiteUrl = (): string => {
  const siteUrl = getConfiguredSiteUrl();

  if (!siteUrl) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SITE_URL.",
    );
  }

  return siteUrl;
};
