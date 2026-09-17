import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";
import MiniCalendar from "@/components/MiniCalendar";

/** Blueprint §26-28: race goals, progress gap, training-focus recommendations. */
export default function GoalsPage() {
  return (
    <div>
      <Header title="Goals" subtitle="Track progress toward your race goal." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Goal Progress" className="lg:col-span-2">
          <EmptyPlaceholder label="No goal set yet" />
        </Card>
        <Card title="Schedule">
          <MiniCalendar />
        </Card>
      </div>
    </div>
  );
}
