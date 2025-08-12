import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { useParams } from "react-router-dom";
import { getTrips } from "@/lib/storage";
import { Button } from "@/components/ui/button";

const ShareItinerary = () => {
  const { tripId } = useParams();
  const trip = tripId ? getTrips()[tripId] : undefined;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied!');
    } catch {
      /* noop */
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Shared Itinerary – GlobeTrotter" description="View a public trip itinerary." />
      <Header />
      <main className="container py-12">
        {!trip ? (
          <p className="text-muted-foreground">Trip not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-poppins text-2xl font-semibold">{trip.name}</h1>
                <p className="text-muted-foreground">{trip.startDate} – {trip.endDate}</p>
              </div>
              <Button variant="hero" onClick={copyLink}>Copy Trip</Button>
            </div>
            {trip.coverPhotoDataUrl && (
              <img src={trip.coverPhotoDataUrl} alt="Cover" className="w-full max-h-72 object-cover rounded-xl border border-border" />
            )}
            <section>
              <h2 className="font-poppins text-xl font-semibold mb-2">Itinerary</h2>
              <div className="space-y-3">
                {trip.itinerary.length === 0 && (
                  <p className="text-muted-foreground">No activities yet.</p>
                )}
                {trip.itinerary.map((day) => (
                  <div key={day.date} className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">{day.date}</h3>
                    <ul className="list-disc pl-5 mt-2">
                      {day.activityIds.map((aid) => (
                        <li key={aid}>{trip.activities[aid]?.title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShareItinerary;


