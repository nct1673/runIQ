import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";

/** Blueprint §29-33: AI Running Coach chat interface. */
export default function CoachPage() {
  return (
    <div>
      <Header title="AI Coach" subtitle="Ask a question about your training -- answers come with evidence." />
      <Card>
        <EmptyPlaceholder label="Chat UI not built yet" />
      </Card>
    </div>
  );
}
