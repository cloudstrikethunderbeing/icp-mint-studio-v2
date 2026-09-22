import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type HelpCard,
  collectorCards,
  helpHero,
  helpTabs,
  minterCards,
} from "@/constants/helpCopy";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { devLog } from "../utils/devLog";

type HelpTabValue = "collector" | "minter";

const VALID_TABS: ReadonlyArray<HelpTabValue> = ["collector", "minter"];
const DEFAULT_TAB: HelpTabValue = "collector";

function resolveTab(value: unknown): HelpTabValue {
  return typeof value === "string" &&
    (VALID_TABS as readonly string[]).includes(value)
    ? (value as HelpTabValue)
    : DEFAULT_TAB;
}

function HelpCardItem({
  card,
  index,
  accentClass,
}: {
  card: HelpCard;
  index: number;
  accentClass: "help-card-collector-accent" | "help-card-minter-accent";
}) {
  return (
    <article
      className={`help-card ${accentClass} animate-help-card-enter`}
      style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
      data-ocid={`howitworks.card.${card.id}`}
    >
      <span
        className="help-card-icon"
        aria-hidden="true"
        data-ocid={`howitworks.card.${card.id}.icon`}
      >
        {card.icon}
      </span>
      <h3
        className="help-card-title text-foreground"
        data-ocid={`howitworks.card.${card.id}.title`}
      >
        {card.title}
      </h3>
      <ul
        className="help-card-bullets"
        data-ocid={`howitworks.card.${card.id}.bullets`}
      >
        {card.bullets.map((bullet, bulletIndex) => (
          <li
            key={`${card.id}-bullet-${bulletIndex}`}
            data-ocid={`howitworks.card.${card.id}.bullet.${bulletIndex + 1}`}
          >
            {bullet}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function HowItWorksPage() {
  devLog("[RENDER] HowItWorksPage render:", {});

  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const activeTab = resolveTab(search.tab);

  // Keep the URL in sync if an invalid/missing tab param was supplied.
  useEffect(() => {
    if (search.tab !== activeTab) {
      navigate({
        to: "/how-it-works",
        search: (prev) => ({ ...prev, tab: activeTab }),
        replace: true,
      });
    }
  }, [activeTab, navigate, search.tab]);

  function handleTabChange(value: string) {
    const next = resolveTab(value);
    navigate({
      to: "/how-it-works",
      search: (prev) => ({ ...prev, tab: next }),
    });
  }

  const collectorCardsRendered = useMemo(
    () =>
      collectorCards.map((card, index) => (
        <HelpCardItem
          key={card.id}
          card={card}
          index={index}
          accentClass="help-card-collector-accent"
        />
      )),
    [],
  );

  const minterCardsRendered = useMemo(
    () =>
      minterCards.map((card, index) => (
        <HelpCardItem
          key={card.id}
          card={card}
          index={index}
          accentClass="help-card-minter-accent"
        />
      )),
    [],
  );

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      data-ocid="howitworks.page"
    >
      {/* Hero */}
      <header
        className="mx-auto max-w-3xl text-center"
        data-ocid="howitworks.hero"
      >
        <h1
          className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          data-ocid="howitworks.hero.title"
        >
          {helpHero.title}
        </h1>
        <p
          className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg"
          data-ocid="howitworks.hero.subtitle"
        >
          {helpHero.subtitle}
        </p>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-10 sm:mt-12"
        data-ocid="howitworks.tabs"
      >
        <div className="flex justify-center">
          <TabsList
            className="h-auto rounded-full p-1.5"
            data-ocid="howitworks.tabs.list"
          >
            <TabsTrigger
              value="collector"
              className="help-tab-collector rounded-full px-5 py-2 text-sm font-medium"
              data-ocid="howitworks.tab.collector"
            >
              {helpTabs.collector}
            </TabsTrigger>
            <TabsTrigger
              value="minter"
              className="help-tab-minter rounded-full px-5 py-2 text-sm font-medium"
              data-ocid="howitworks.tab.minter"
            >
              {helpTabs.minter}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Collector tab */}
        <TabsContent
          value="collector"
          className="mt-8 sm:mt-10"
          data-ocid="howitworks.tab.collector.content"
        >
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
            data-ocid="howitworks.collector.grid"
          >
            {collectorCardsRendered}
          </div>
        </TabsContent>

        {/* Minter tab */}
        <TabsContent
          value="minter"
          className="mt-8 sm:mt-10"
          data-ocid="howitworks.tab.minter.content"
        >
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
            data-ocid="howitworks.minter.grid"
          >
            {minterCardsRendered}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
