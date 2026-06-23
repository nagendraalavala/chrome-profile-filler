import { ProfileField } from "./profile";

export interface SharedProfile {
  shareId: string;
  shareCode: string;
  profileName: string;
  fields: ProfileField[];
  sharedBy: string;
  sharedAt: number;
  expiresAt: number | null;
}

export interface ShareMetadata {
  shareId: string;
  shareCode: string;
  profileId: string;
  profileName: string;
  sharedAt: number;
  expiresAt: number | null;
}
