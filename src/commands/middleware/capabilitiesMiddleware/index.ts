import { ghCapability } from "./ghCapability.js";
import { gitCapability } from "./gitCapability.js";
import { glabCapability } from "./glabCapability.js";

type Capability = "git" | "gh" | "glab";

type CapabilityResolver = () => void;

const capabilities: Record<Capability, CapabilityResolver> = {
  git: gitCapability,
  gh: ghCapability,
  glab: glabCapability,
};

export const capabilitiesMiddleware = (requiredCapabilities: Capability[]) => {
  requiredCapabilities.forEach((capabilityKey) => {
    const resolver = capabilities[capabilityKey];

    if (!resolver) {
      throw new Error(`Capability ${capabilityKey} not found`);
    }

    resolver();
  });
};
