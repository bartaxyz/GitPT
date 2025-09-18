export enum Host {
  GITHUB = "github",
  GITLAB = "gitlab",
}

export const requestTermShort = {
  [Host.GITHUB]: "PR",
  [Host.GITLAB]: "MR",
};
