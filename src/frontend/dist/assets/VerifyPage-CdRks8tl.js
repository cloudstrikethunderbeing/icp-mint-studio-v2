import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, u as useComposedRefs, a as cn, d as useAuth, e as useActor, F as useSearch, B as Button, L as LoaderCircle, o as CircleX, h as createActor } from "./index-C9MKyHwp.js";
import { C as Card, c as CardContent } from "./card-CVA11SiX.js";
import { I as Input } from "./input-C9Z1-ixA.js";
import { L as Label } from "./label-zgvlRdbO.js";
import { S as Skeleton } from "./skeleton-C6h9J8B3.js";
import { f as useId, P as Primitive, c as composeEventHandlers, b as createContextScope, e as useControllableState, d as useCallbackRef, h as Presence } from "./index-DNcLgC-N.js";
import { c as createCollection, u as useDirection, a as ChevronUp, C as ChevronDown } from "./index-I2Akdcna.js";
import { F as Fingerprint } from "./fingerprint-By8J7AD5.js";
import { C as CircleAlert } from "./circle-alert-CJLEALxJ.js";
import { a as Copy, C as Check } from "./copy-hToGQ4qr.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const CircleCheck = createLucideIcon("circle-check", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
];
const ExternalLink = createLucideIcon("external-link", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["line", { x1: "4", x2: "20", y1: "9", y2: "9", key: "4lhtct" }],
  ["line", { x1: "4", x2: "20", y1: "15", y2: "15", key: "vyu0kd" }],
  ["line", { x1: "10", x2: "8", y1: "3", y2: "21", key: "1ggp8o" }],
  ["line", { x1: "16", x2: "14", y1: "3", y2: "21", key: "weycgp" }]
];
const Hash = createLucideIcon("hash", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const ShieldCheck = createLucideIcon("shield-check", __iconNode);
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var GROUP_NAME = "RovingFocusGroup";
var [Collection, useCollection, createCollectionScope] = createCollection(GROUP_NAME);
var [createRovingFocusGroupContext, createRovingFocusGroupScope] = createContextScope(
  GROUP_NAME,
  [createCollectionScope]
);
var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
var RovingFocusGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RovingFocusGroupImpl, { ...props, ref: forwardedRef }) }) });
  }
);
RovingFocusGroup.displayName = GROUP_NAME;
var RovingFocusGroupImpl = reactExports.forwardRef((props, forwardedRef) => {
  const {
    __scopeRovingFocusGroup,
    orientation,
    loop = false,
    dir,
    currentTabStopId: currentTabStopIdProp,
    defaultCurrentTabStopId,
    onCurrentTabStopIdChange,
    onEntryFocus,
    preventScrollOnEntryFocus = false,
    ...groupProps
  } = props;
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const direction = useDirection(dir);
  const [currentTabStopId, setCurrentTabStopId] = useControllableState({
    prop: currentTabStopIdProp,
    defaultProp: defaultCurrentTabStopId ?? null,
    onChange: onCurrentTabStopIdChange,
    caller: GROUP_NAME
  });
  const [isTabbingBackOut, setIsTabbingBackOut] = reactExports.useState(false);
  const handleEntryFocus = useCallbackRef(onEntryFocus);
  const getItems = useCollection(__scopeRovingFocusGroup);
  const isClickFocusRef = reactExports.useRef(false);
  const [focusableItemsCount, setFocusableItemsCount] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener(ENTRY_FOCUS, handleEntryFocus);
      return () => node.removeEventListener(ENTRY_FOCUS, handleEntryFocus);
    }
  }, [handleEntryFocus]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    RovingFocusProvider,
    {
      scope: __scopeRovingFocusGroup,
      orientation,
      dir: direction,
      loop,
      currentTabStopId,
      onItemFocus: reactExports.useCallback(
        (tabStopId) => setCurrentTabStopId(tabStopId),
        [setCurrentTabStopId]
      ),
      onItemShiftTab: reactExports.useCallback(() => setIsTabbingBackOut(true), []),
      onFocusableItemAdd: reactExports.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount + 1),
        []
      ),
      onFocusableItemRemove: reactExports.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount - 1),
        []
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
          "data-orientation": orientation,
          ...groupProps,
          ref: composedRefs,
          style: { outline: "none", ...props.style },
          onMouseDown: composeEventHandlers(props.onMouseDown, () => {
            isClickFocusRef.current = true;
          }),
          onFocus: composeEventHandlers(props.onFocus, (event) => {
            const isKeyboardFocus = !isClickFocusRef.current;
            if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
              const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
              event.currentTarget.dispatchEvent(entryFocusEvent);
              if (!entryFocusEvent.defaultPrevented) {
                const items = getItems().filter((item) => item.focusable);
                const activeItem = items.find((item) => item.active);
                const currentItem = items.find((item) => item.id === currentTabStopId);
                const candidateItems = [activeItem, currentItem, ...items].filter(
                  Boolean
                );
                const candidateNodes = candidateItems.map((item) => item.ref.current);
                focusFirst(candidateNodes, preventScrollOnEntryFocus);
              }
            }
            isClickFocusRef.current = false;
          }),
          onBlur: composeEventHandlers(props.onBlur, () => setIsTabbingBackOut(false))
        }
      )
    }
  );
});
var ITEM_NAME = "RovingFocusGroupItem";
var RovingFocusGroupItem = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeRovingFocusGroup,
      focusable = true,
      active = false,
      tabStopId,
      children,
      ...itemProps
    } = props;
    const autoId = useId();
    const id = tabStopId || autoId;
    const context = useRovingFocusContext(ITEM_NAME, __scopeRovingFocusGroup);
    const isCurrentTabStop = context.currentTabStopId === id;
    const getItems = useCollection(__scopeRovingFocusGroup);
    const { onFocusableItemAdd, onFocusableItemRemove, currentTabStopId } = context;
    reactExports.useEffect(() => {
      if (focusable) {
        onFocusableItemAdd();
        return () => onFocusableItemRemove();
      }
    }, [focusable, onFocusableItemAdd, onFocusableItemRemove]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Collection.ItemSlot,
      {
        scope: __scopeRovingFocusGroup,
        id,
        focusable,
        active,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            tabIndex: isCurrentTabStop ? 0 : -1,
            "data-orientation": context.orientation,
            ...itemProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!focusable) event.preventDefault();
              else context.onItemFocus(id);
            }),
            onFocus: composeEventHandlers(props.onFocus, () => context.onItemFocus(id)),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (event.key === "Tab" && event.shiftKey) {
                context.onItemShiftTab();
                return;
              }
              if (event.target !== event.currentTarget) return;
              const focusIntent = getFocusIntent(event, context.orientation, context.dir);
              if (focusIntent !== void 0) {
                if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                event.preventDefault();
                const items = getItems().filter((item) => item.focusable);
                let candidateNodes = items.map((item) => item.ref.current);
                if (focusIntent === "last") candidateNodes.reverse();
                else if (focusIntent === "prev" || focusIntent === "next") {
                  if (focusIntent === "prev") candidateNodes.reverse();
                  const currentIndex = candidateNodes.indexOf(event.currentTarget);
                  candidateNodes = context.loop ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
                }
                setTimeout(() => focusFirst(candidateNodes));
              }
            }),
            children: typeof children === "function" ? children({ isCurrentTabStop, hasTabStop: currentTabStopId != null }) : children
          }
        )
      }
    );
  }
);
RovingFocusGroupItem.displayName = ITEM_NAME;
var MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function getDirectionAwareKey(key, dir) {
  if (dir !== "rtl") return key;
  return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
var Root = RovingFocusGroup;
var Item = RovingFocusGroupItem;
var TABS_NAME = "Tabs";
var [createTabsContext] = createContextScope(TABS_NAME, [
  createRovingFocusGroupScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [TabsProvider, useTabsContext] = createTabsContext(TABS_NAME);
var Tabs$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeTabs,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = "horizontal",
      dir,
      activationMode = "automatic",
      ...tabsProps
    } = props;
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? "",
      caller: TABS_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      TabsProvider,
      {
        scope: __scopeTabs,
        baseId: useId(),
        value,
        onValueChange: setValue,
        orientation,
        dir: direction,
        activationMode,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            dir: direction,
            "data-orientation": orientation,
            ...tabsProps,
            ref: forwardedRef
          }
        )
      }
    );
  }
);
Tabs$1.displayName = TABS_NAME;
var TAB_LIST_NAME = "TabsList";
var TabsList$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeTabs, loop = true, ...listProps } = props;
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Root,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        orientation: context.orientation,
        dir: context.dir,
        loop,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            role: "tablist",
            "aria-orientation": context.orientation,
            ...listProps,
            ref: forwardedRef
          }
        )
      }
    );
  }
);
TabsList$1.displayName = TAB_LIST_NAME;
var TRIGGER_NAME = "TabsTrigger";
var TabsTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeTabs, value, disabled = false, ...triggerProps } = props;
    const context = useTabsContext(TRIGGER_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Item,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        focusable: !disabled,
        active: isSelected,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": isSelected,
            "aria-controls": contentId,
            "data-state": isSelected ? "active" : "inactive",
            "data-disabled": disabled ? "" : void 0,
            disabled,
            id: triggerId,
            ...triggerProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!disabled && event.button === 0 && event.ctrlKey === false) {
                context.onValueChange(value);
              } else {
                event.preventDefault();
              }
            }),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if ([" ", "Enter"].includes(event.key)) context.onValueChange(value);
            }),
            onFocus: composeEventHandlers(props.onFocus, () => {
              const isAutomaticActivation = context.activationMode !== "manual";
              if (!isSelected && !disabled && isAutomaticActivation) {
                context.onValueChange(value);
              }
            })
          }
        )
      }
    );
  }
);
TabsTrigger$1.displayName = TRIGGER_NAME;
var CONTENT_NAME = "TabsContent";
var TabsContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeTabs, value, forceMount, children, ...contentProps } = props;
    const context = useTabsContext(CONTENT_NAME, __scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    const isMountAnimationPreventedRef = reactExports.useRef(isSelected);
    reactExports.useEffect(() => {
      const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
      return () => cancelAnimationFrame(rAF);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || isSelected, children: ({ present }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "data-state": isSelected ? "active" : "inactive",
        "data-orientation": context.orientation,
        role: "tabpanel",
        "aria-labelledby": triggerId,
        hidden: !present,
        id: contentId,
        tabIndex: 0,
        ...contentProps,
        ref: forwardedRef,
        style: {
          ...props.style,
          animationDuration: isMountAnimationPreventedRef.current ? "0s" : void 0
        },
        children: present && children
      }
    ) });
  }
);
TabsContent$1.displayName = CONTENT_NAME;
function makeTriggerId(baseId, value) {
  return `${baseId}-trigger-${value}`;
}
function makeContentId(baseId, value) {
  return `${baseId}-content-${value}`;
}
var Root2 = Tabs$1;
var List = TabsList$1;
var Trigger = TabsTrigger$1;
var Content = TabsContent$1;
function Tabs({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root2,
    {
      "data-slot": "tabs",
      className: cn("flex flex-col gap-2", className),
      ...props
    }
  );
}
function TabsList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    List,
    {
      "data-slot": "tabs-list",
      className: cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      ),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Content,
    {
      "data-slot": "tabs-content",
      className: cn("flex-1 outline-none", className),
      ...props
    }
  );
}
function RowWithCopy({
  label,
  value,
  mono,
  copyable
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = () => {
    if (!value || value === "N/A" || value === "") return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: `text-foreground break-all ${mono ? "font-mono text-xs" : "text-sm"}`,
          children: value
        }
      ),
      copyable && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: handleCopy,
          className: "text-muted-foreground hover:text-primary transition-colors",
          "aria-label": `Copy ${label}`,
          "data-ocid": "verify.copy_button",
          children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-green-500", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3" }),
            " Copied"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3" })
        }
      )
    ] })
  ] });
}
function Row({
  label,
  value,
  mono
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "dd",
      {
        className: `text-foreground break-all ${mono ? "font-mono text-xs" : "text-sm"}`,
        children: value
      }
    )
  ] });
}
function VerifyResultCard({ result }) {
  const mintDate = new Date(
    Number(result.mintDate) / 1e6
  ).toLocaleString();
  const explorerUrl = `https://dashboard.internetcomputer.org/canister/${result.canisterId}`;
  const ownerPrincipalText = result.owner ? result.owner.toString() : "";
  const nftUniqueId = typeof result.nftUniqueId === "string" && result.nftUniqueId.trim().length > 0 ? result.nftUniqueId : "Invalid NFT Record";
  const nftReference = `${result.canisterId}:${result.tokenId.toString()}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "rounded-2xl", "data-ocid": "verify.success_state", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-3 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]", children: "NFT Unique ID" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-bold text-[#D4AF37] break-all font-mono", children: nftUniqueId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => navigator.clipboard.writeText(nftUniqueId),
            className: "text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors shrink-0",
            "aria-label": "Copy NFT Unique ID",
            "data-ocid": "verify.copy_nft_unique_id",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-primary" }),
      "NFT Verified"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Row,
        {
          label: "Token ID",
          value: (() => {
            if (result.tokenId === void 0 || result.tokenId === null || result.tokenId === 0n)
              return "Pending...";
            return result.tokenId.toString();
          })()
        }
      ),
      ownerPrincipalText && /* @__PURE__ */ jsxRuntimeExports.jsx(
        RowWithCopy,
        {
          label: "Owner Principal",
          value: ownerPrincipalText,
          mono: true,
          copyable: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Creator ID (metadata only)", value: result.creatorId }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Edition", value: result.edition }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Network", value: result.network || "ICP" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Canister ID", value: result.canisterId, mono: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Mint Date", value: mintDate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Asset Hash", value: result.assetHash, mono: true }),
      result.collectionId !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Collection ID", value: result.collectionId.toString() }),
      result.businessName && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Business Name", value: result.businessName }),
      result.website && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Website", value: result.website }),
      result.discountCode && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Discount Code", value: result.discountCode }),
      result.membershipId && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Membership / Ticket ID", value: result.membershipId })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-muted/30 p-3 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Wallet View (ICP Native)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "ICP wallets only need Canister ID + Token ID" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        RowWithCopy,
        {
          label: "Canister ID",
          value: result.canisterId,
          mono: true,
          copyable: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        RowWithCopy,
        {
          label: "Token ID",
          value: result.tokenId.toString(),
          mono: true,
          copyable: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-muted/30 p-3 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Copy for Wallet Import" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        RowWithCopy,
        {
          label: "Collection Import String",
          value: result.canisterId,
          mono: true,
          copyable: true
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        RowWithCopy,
        {
          label: "NFT Reference",
          value: nftReference,
          mono: true,
          copyable: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "a",
      {
        href: explorerUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "flex items-center gap-2 text-xs text-primary hover:underline mt-2",
        "data-ocid": "verify.explorer_link",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-4 h-4" }),
          "View on ICP Explorer"
        ]
      }
    )
  ] }) });
}
function CollapsibleNftCard({ result }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  const mintDate = new Date(
    Number(result.mintDate) / 1e6
  ).toLocaleString();
  const explorerUrl = `https://dashboard.internetcomputer.org/canister/${result.canisterId}`;
  const ownerPrincipalText = result.owner ? result.owner.toString() : "";
  const nftUniqueId = typeof result.nftUniqueId === "string" && result.nftUniqueId.trim().length > 0 ? result.nftUniqueId : "Invalid NFT Record";
  const nftReference = `${result.canisterId}:${result.tokenId.toString()}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Card,
    {
      className: "rounded-xl overflow-hidden",
      "data-ocid": "verify.creator_nft_card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setExpanded((v) => !v),
            className: "w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors",
            "aria-expanded": expanded,
            "data-ocid": "verify.creator_nft_toggle",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3 text-primary shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-foreground truncate", children: nftUniqueId })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                  "Token ",
                  result.tokenId.toString()
                ] }),
                expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "w-4 h-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4 text-muted-foreground" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0 pb-3 px-3 space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-primary" }),
                "NFT Verified"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Row,
                  {
                    label: "Token ID",
                    value: (() => {
                      if (result.tokenId === void 0 || result.tokenId === null || result.tokenId === 0n)
                        return "Pending...";
                      return result.tokenId.toString();
                    })()
                  }
                ),
                ownerPrincipalText && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RowWithCopy,
                  {
                    label: "Owner Principal",
                    value: ownerPrincipalText,
                    mono: true,
                    copyable: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Creator ID (metadata only)", value: result.creatorId }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Edition", value: result.edition }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Network", value: result.network || "ICP" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Canister ID", value: result.canisterId, mono: true }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Mint Date", value: mintDate }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Asset Hash", value: result.assetHash, mono: true }),
                result.collectionId !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Row,
                  {
                    label: "Collection ID",
                    value: result.collectionId.toString()
                  }
                ),
                result.businessName && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Business Name", value: result.businessName }),
                result.website && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Website", value: result.website }),
                result.discountCode && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Discount Code", value: result.discountCode }),
                result.membershipId && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Membership / Ticket ID", value: result.membershipId })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-muted/30 p-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Wallet View (ICP Native)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "ICP wallets only need Canister ID + Token ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RowWithCopy,
                  {
                    label: "Canister ID",
                    value: result.canisterId,
                    mono: true,
                    copyable: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RowWithCopy,
                  {
                    label: "Token ID",
                    value: result.tokenId.toString(),
                    mono: true,
                    copyable: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border bg-muted/30 p-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Copy for Wallet Import" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RowWithCopy,
                  {
                    label: "Collection Import String",
                    value: result.canisterId,
                    mono: true,
                    copyable: true
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RowWithCopy,
                  {
                    label: "NFT Reference",
                    value: nftReference,
                    mono: true,
                    copyable: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "a",
                {
                  href: explorerUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "flex items-center gap-2 text-xs text-primary hover:underline mt-2",
                  "data-ocid": "verify.explorer_link",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "w-4 h-4" }),
                    "View on ICP Explorer"
                  ]
                }
              )
            ] })
          }
        )
      ]
    }
  );
}
function VerifyErrorState({ message }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive",
      "data-ocid": "verify.error_state",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-4 h-4 mr-2 inline-block" }),
        message
      ]
    }
  );
}
function NotFoundState() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl bg-muted/40 border border-border p-6 text-center",
      "data-ocid": "verify.empty_state",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "w-8 h-8 text-muted-foreground mx-auto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-medium text-foreground", children: "NFT not found" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "No NFT matches this ID on the specified canister." })
      ]
    }
  );
}
function VerifyPage() {
  const { actor: authActor } = useAuth();
  const { actor: anonActor } = useActor(createActor);
  const effectiveActor = authActor ?? anonActor;
  const search = useSearch({ strict: false });
  const urlNftUniqueId = search.id ?? "";
  const [creatorId, setCreatorId] = reactExports.useState("");
  const [creatorLoading, setCreatorLoading] = reactExports.useState(false);
  const [creatorResult, setCreatorResult] = reactExports.useState(void 0);
  const [creatorError, setCreatorError] = reactExports.useState(null);
  const [nftUniqueIdInput, setNftUniqueIdInput] = reactExports.useState(urlNftUniqueId);
  const [nftLoading, setNftLoading] = reactExports.useState(false);
  const [nftResult, setNftResult] = reactExports.useState(
    void 0
  );
  const [nftError, setNftError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!urlNftUniqueId || !effectiveActor) return;
    setNftLoading(true);
    setNftResult(void 0);
    setNftError(null);
    effectiveActor.verifyNftPublic(urlNftUniqueId).then((res) => {
      if (res.__kind__ === "ok") {
        setNftResult(res.ok);
      } else {
        setNftResult(null);
      }
    }).catch(
      () => setNftError(
        "Verification failed. Please check the NFT Unique ID and try again."
      )
    ).finally(() => setNftLoading(false));
  }, [urlNftUniqueId, effectiveActor]);
  async function handleVerifyByCreatorId(e) {
    e.preventDefault();
    if (!effectiveActor) {
      setCreatorError("Actor unavailable. Please try again.");
      return;
    }
    const trimmed = creatorId.trim();
    if (!trimmed) {
      setCreatorError("Please enter a Creator ID.");
      return;
    }
    setCreatorLoading(true);
    setCreatorResult(void 0);
    setCreatorError(null);
    try {
      const res = await effectiveActor.verifyNftByCreatorId(trimmed);
      if (res.__kind__ === "ok") {
        setCreatorResult(res.ok.length > 0 ? res.ok : null);
      } else {
        setCreatorResult(null);
      }
    } catch {
      setCreatorError(
        "Verification failed. Please check the Creator ID and try again."
      );
    } finally {
      setCreatorLoading(false);
    }
  }
  async function handleVerifyByNftId(e) {
    e.preventDefault();
    if (!effectiveActor) {
      setNftError("Actor unavailable. Please try again.");
      return;
    }
    const trimmed = nftUniqueIdInput.trim();
    if (!trimmed) {
      setNftError("Please enter an NFT Unique ID.");
      return;
    }
    setNftLoading(true);
    setNftResult(void 0);
    setNftError(null);
    try {
      const res = await effectiveActor.verifyNftPublic(trimmed);
      if (res.__kind__ === "ok") {
        setNftResult(res.ok);
      } else {
        setNftResult(null);
      }
    } catch {
      setNftError(
        "Verification failed. Please check the NFT Unique ID and try again."
      );
    } finally {
      setNftLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-lg mx-auto px-4 py-8 space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold text-foreground", children: "Verify NFT" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Confirm authenticity of any minted NFT. No login required." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "bg-card border border-border rounded-xl p-3 space-y-2 mb-4",
        "data-ocid": "verify.steps_section",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Verify NFT" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "Enter NFT Unique ID" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "Fetch On-Chain Record" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "View Ownership Proof" })
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "creator-id", "data-ocid": "verify.tabs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TabsTrigger,
          {
            value: "creator-id",
            className: "flex-1",
            "data-ocid": "verify.tab.creator_id",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-4 h-4 mr-1.5" }),
              "Creator ID"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TabsTrigger,
          {
            value: "nft-id",
            className: "flex-1",
            "data-ocid": "verify.tab.nft_id",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { className: "w-4 h-4 mr-1.5" }),
              "NFT ID"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "creator-id", className: "space-y-4 mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "form",
          {
            onSubmit: handleVerifyByCreatorId,
            className: "space-y-3",
            "data-ocid": "verify.creator_form",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "creator-id-input", children: "Creator ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "creator-id-input",
                    value: creatorId,
                    onChange: (e) => setCreatorId(e.target.value),
                    placeholder: "ICPMS-XXXXXX-XXXX",
                    required: true,
                    "data-ocid": "verify.creator_id_input"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "submit",
                  className: "w-full",
                  disabled: creatorLoading || !creatorId.trim(),
                  "data-ocid": "verify.creator_submit_button",
                  children: creatorLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
                    "Verifying..."
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 mr-2" }),
                    "Verify by Creator ID"
                  ] })
                }
              )
            ]
          }
        ),
        creatorLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", "data-ocid": "verify.loading_state", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-1/2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-3/4" })
        ] }),
        creatorError && /* @__PURE__ */ jsxRuntimeExports.jsx(VerifyErrorState, { message: creatorError }),
        creatorResult === null && !creatorLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(NotFoundState, {}),
        creatorResult && creatorResult.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            creatorResult.length,
            " NFT(s) found for this Creator ID"
          ] }),
          Array.from(
            new Map(
              creatorResult.map((r) => [r.nftUniqueId ?? r.assetHash, r])
            ).values()
          ).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            CollapsibleNftCard,
            {
              result: r
            },
            r.nftUniqueId ?? r.assetHash
          ))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "nft-id", className: "space-y-4 mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "form",
          {
            onSubmit: handleVerifyByNftId,
            className: "space-y-3",
            "data-ocid": "verify.nft_form",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "nft-id-input", children: "NFT Unique ID" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "nft-id-input",
                    value: nftUniqueIdInput,
                    onChange: (e) => setNftUniqueIdInput(e.target.value),
                    placeholder: "e.g. vqlph-wyaaa-aaaap-qqkda-cai:0:5",
                    required: true,
                    "data-ocid": "verify.nft_id_input"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "submit",
                  className: "w-full",
                  disabled: nftLoading || !nftUniqueIdInput.trim(),
                  "data-ocid": "verify.nft_submit_button",
                  children: nftLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin mr-2" }),
                    "Verifying..."
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 mr-2" }),
                    "Verify by NFT Unique ID"
                  ] })
                }
              )
            ]
          }
        ),
        nftLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", "data-ocid": "verify.loading_state", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-1/2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-3/4" })
        ] }),
        nftError && /* @__PURE__ */ jsxRuntimeExports.jsx(VerifyErrorState, { message: nftError }),
        nftResult === null && !nftLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(NotFoundState, {}),
        (nftResult == null ? void 0 : nftResult.canisterId) && nftResult.nftUniqueId && /* @__PURE__ */ jsxRuntimeExports.jsx(VerifyResultCard, { result: nftResult }),
        nftResult && (!nftResult.canisterId || !nftResult.nftUniqueId) && /* @__PURE__ */ jsxRuntimeExports.jsx(NotFoundState, {})
      ] })
    ] })
  ] });
}
export {
  VerifyPage as default
};
