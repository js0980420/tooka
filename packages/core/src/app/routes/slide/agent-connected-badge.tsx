import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgentSocketConnected } from '@/lib/use-agent-socket';
import { useLocale } from '@/lib/use-locale';

export function AgentConnectedBadge() {
  const t = useLocale();
  const connected = useAgentSocketConnected();
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="ml-1 flex shrink-0 cursor-help items-center gap-1.5 rounded-[3px] border border-hairline bg-card px-1.5 py-0.5 text-[10.5px] text-foreground/85 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span aria-hidden className="relative flex size-1.5 items-center justify-center">
                {connected ? (
                  <>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
                )}
              </span>
              {connected ? t.slide.agentConnected : t.slide.agentDisconnected}
            </button>
          }
        />
        <TooltipContent
          side="bottom"
          align="start"
          className="w-max max-w-[min(520px,calc(100vw-2rem))] text-center leading-relaxed"
        >
          {connected ? t.slide.agentConnectedTooltip : t.slide.agentDisconnectedTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
