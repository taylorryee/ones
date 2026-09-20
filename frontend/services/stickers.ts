import { api } from '@/api';

export type StickerDefinition = {
  id: number;
  slug: string;
  name: string;
  asset_uri: string;
};

export type BallStickerPlacement = {
  id: number;
  player_sticker_id: number;
  sticker: StickerDefinition;
  u: number;
  v: number;
  scale: number;
  rotation: number;
  z_index: number;
};

export type PlacementInput = Pick<
  BallStickerPlacement,
  'u' | 'v' | 'scale' | 'rotation' | 'z_index'
>;

export type OwnedSticker = {
  id: number;
  player_id: number;
  earned_at: string;
  sticker: StickerDefinition;
  ball_placement: Omit<BallStickerPlacement, 'sticker'> | null;
};

export async function getStickerCatalog() {
  const response = await api.get<StickerDefinition[]>('/stickers/');
  return response.data;
}

export async function getStickerInventory() {
  const response = await api.get<OwnedSticker[]>('/stickers/inventory');
  return response.data;
}

export async function getBallStickers(playerId: number) {
  const response = await api.get<BallStickerPlacement[]>(`/stickers/ball/${playerId}`);
  return response.data;
}

export async function placeSticker(playerStickerId: number, placement: PlacementInput) {
  const response = await api.put<BallStickerPlacement>(
    `/stickers/inventory/${playerStickerId}/placement`,
    placement
  );
  return response.data;
}

export async function removeStickerFromBall(playerStickerId: number) {
  await api.delete(`/stickers/inventory/${playerStickerId}/placement`);
}
