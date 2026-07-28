import { MODULE_REGISTRY, type ModuleRegistryEntry } from "@/lib/modules/module-registry";

export function getVisibleModules(userPermissions: Set<string>): ModuleRegistryEntry[] {
  return MODULE_REGISTRY.filter((m) => userPermissions.has(m.requiredPermission));
}