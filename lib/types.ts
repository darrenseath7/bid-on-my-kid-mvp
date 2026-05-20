export type AuctionState = 'waiting' | 'open' | 'going_once' | 'going_twice' | 'sold' | 'completed';

export type Artwork = {
  id: string;
  auction_id: string;
  child_name: string;
  child_surname: string;
  grade: string;
  framed_image_url: string | null;
  ai_description: string | null;
  ai_intro: string | null;
  sort_order: number;
  status: string;
  sold_amount: number | null;
};

export type Bid = {
  id: string;
  auction_id: string;
  artwork_id: string;
  bidder_name: string;
  amount: number;
  created_at: string;
};
