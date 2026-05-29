import AssistantPanel from '@/components/AssistantPanel';
import FeedbackBot from '@/components/FeedbackBot';

export default function BottomBotContainer({ currentPageName }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none">
      <div className="grid grid-cols-3 gap-8 w-full max-w-7xl px-6">
        {/* Row 1: Left column = FeedbackBot, Center & Right = empty */}
        <div className="pointer-events-auto">
          <FeedbackBot currentPageName={currentPageName} />
        </div>
        <div />
        <div />

        {/* Row 2: Left & Center = empty, Right column = AssistantPanel */}
        <div />
        <div />
        <div className="pointer-events-auto">
          <AssistantPanel currentPageName={currentPageName} />
        </div>
      </div>
    </div>
  );
}