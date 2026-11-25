import TourRequestDetailScreen from "@/features/tourist/components/TourRequestDetailScreen";

export const metadata = {
  title: "Chi tiết yêu cầu tour | JourneyGo",
};

export default async function TourRequestDetailPage({ params }) {
  const { id } = await params;
  return <TourRequestDetailScreen requestId={id} />;
}
