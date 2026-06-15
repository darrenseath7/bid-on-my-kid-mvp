import AuctionClient from "../AuctionClient";

type AuctionPageProps = {
  params: Promise<{ auctionId: string }>;
};

export default async function AuctionPage({ params }: AuctionPageProps) {
  const { auctionId } = await params;

  return <AuctionClient initialAuctionCode={auctionId} />;
}
