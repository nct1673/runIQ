import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";

/** Blueprint §21-25: race-performance predictions with range + drivers. */
export default function PredictionsPage() {
  return (
    <div>
      <Header title="Predictions" subtitle="5K / 10K / half-marathon, with uncertainty and explainability." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="5K">
          <EmptyPlaceholder label="No prediction yet" />
        </Card>
        <Card title="10K">
          <EmptyPlaceholder label="No prediction yet" />
        </Card>
        <Card title="Half Marathon">
          <EmptyPlaceholder label="No prediction yet" />
        </Card>
      </div>
      <Card title="Prediction Drivers" className="mt-4">
        <EmptyPlaceholder label="No explainability data yet" />
      </Card>
    </div>
  );
}
