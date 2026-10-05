import { navigation as fallbackNavigation } from "@/data/travel";
import type { CmsMenu } from "@/components/cms/CmsProvider";

export const getV2Navigation = (menus: CmsMenu[]) => {
  const source = menus.length ? menus : fallbackNavigation;
  return source.filter((item) => item.href && item.label).slice(0, 6);
};

export const cleanPhone = (phone?: string) => (phone || "").replace(/[^+\d]/g, "");
