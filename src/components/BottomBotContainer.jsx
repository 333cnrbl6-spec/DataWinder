import AssistantPanel from '@/components/AssistantPanel';
import FeedbackBot from '@/components/FeedbackBot';

export default function BottomBotContainer({ currentPageName }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none">
      <div className="grid grid-cols-3 w-full max-w-7xl px-6 items-end">
        {/* Left col — FeedbackBot */}
        <div className="pointer-events-auto flex justify-start">
          <FeedbackBot currentPageName={currentPageName} />
        </div>

        {/* Centre col — empty */}
        <div />

        {/* Right col — AssistantPanel (Ollie) */}
        <div className="pointer-events-auto flex justify-end">
          <AssistantPanel currentPageName={currentPageName} />
        </div>
      </div>
    </div>
  );
}