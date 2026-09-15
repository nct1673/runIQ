import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";

/** Blueprint §10-13: trends, personal baseline, similar-run engine. */
export default function AnalyticsPage() {
  return (
    <div>
      <Header title="Analytics" subtitle="What is happening to my running?" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Pace Trend">
          <EmptyPlaceholder label="No data yet" />
        </Card>
        <Card title="Weekly Mileage">
          <EmptyPlaceholder label="No data yet" />
        </Card>
        <Card title="Personal Baseline">
          <EmptyPlaceholder label="No baseline computed yet" />
        </Card>
        <Card title="Similar Runs">
          <EmptyPlaceholder label="No data yet" />
        </Card>
      </div>
    </div>
  );
}
