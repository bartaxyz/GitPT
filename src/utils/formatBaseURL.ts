export const formatBaseURL = (baseURL: string) => {
  // If it doesn't end with /v1, add it
  if (!baseURL.endsWith("/v1")) {
    return `${baseURL}/v1`;
  }

  return baseURL;
};
