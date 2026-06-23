export const formatBaseURL = (baseURL: string) => {
  // Drop any trailing slash(es) first so we never produce "host//v1".
  const trimmed = baseURL.replace(/\/+$/, "");

  // If it doesn't end with /v1, add it
  if (!trimmed.endsWith("/v1")) {
    return `${trimmed}/v1`;
  }

  return trimmed;
};
