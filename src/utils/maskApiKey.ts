export const maskApiKey = (apiKey: string): string => {
  if (apiKey.length <= 10) {
    return "*".repeat(apiKey.length);
  }

  const firstFour = apiKey.substring(0, 4);
  const lastFour = apiKey.substring(apiKey.length - 4);
  return `${firstFour}...${lastFour}`;
};
