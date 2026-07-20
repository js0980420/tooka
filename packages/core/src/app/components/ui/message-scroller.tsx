import { ArrowDownIcon } from 'lucide-react';
import {
  createContext,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useContext,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MessageScrollerContextValue = {
  autoScroll: boolean;
  atEnd: boolean;
  viewportRef: RefObject<HTMLDivElement>;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
  updatePosition: () => void;
};

const MessageScrollerContext = createContext<MessageScrollerContextValue | null>(null);

function useMessageScroller() {
  const context = useContext(MessageScrollerContext);
  if (!context) throw new Error('MessageScroller parts must be inside MessageScrollerProvider');
  return context;
}

function MessageScrollerProvider({
  autoScroll = false,
  children,
}: {
  autoScroll?: boolean;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);
  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setAtEnd(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 24);
  }, []);
  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  return (
    <MessageScrollerContext.Provider
      value={{ autoScroll, atEnd, viewportRef, scrollToEnd, updatePosition }}
    >
      {children}
    </MessageScrollerContext.Provider>
  );
}

function MessageScroller({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="message-scroller"
      className={cn('relative flex size-full min-h-0 flex-col overflow-hidden', className)}
      {...props}
    />
  );
}

function MessageScrollerViewport({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { viewportRef, updatePosition } = useMessageScroller();
  return (
    <div
      ref={viewportRef}
      data-slot="message-scroller-viewport"
      className={cn(
        'size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
        className,
      )}
      onScroll={updatePosition}
      {...props}
    />
  );
}

function MessageScrollerContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="message-scroller-content"
      className={cn('flex min-h-full flex-col gap-5', className)}
      {...props}
    />
  );
}

function MessageScrollerItem({
  className,
  messageId,
  scrollAnchor = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { messageId: string; scrollAnchor?: boolean }) {
  const { atEnd, autoScroll, scrollToEnd } = useMessageScroller();
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    const shouldAnchor = scrollAnchor && firstRender.current;
    firstRender.current = false;
    if (autoScroll && (atEnd || shouldAnchor)) scrollToEnd('auto');
  }, [atEnd, autoScroll, children, scrollAnchor, scrollToEnd]);

  return (
    <div
      data-slot="message-scroller-item"
      data-message-id={messageId}
      className={cn('min-w-0 shrink-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function MessageScrollerButton({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick'>) {
  const { atEnd, scrollToEnd } = useMessageScroller();
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      aria-label="捲動到最新訊息"
      className={cn(
        'absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background shadow-floating transition-[scale,opacity]',
        atEnd && 'pointer-events-none scale-90 opacity-0',
        className,
      )}
      onClick={() => scrollToEnd()}
      {...props}
    >
      <ArrowDownIcon />
    </Button>
  );
}

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
};
