import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, a as useAuth, s as usePermissions, V as useSearch, L as LoaderCircle, Q as CircleX, W as NftStatus } from "./main-C0o3ev26.js";
import { B as Button } from "./button-CMSvFEdG.js";
import { C as Card, a as CardContent } from "./card-DIYvOmDF.js";
import { I as Input } from "./input-Cn8mVYmY.js";
import { L as Label, a as Copy, C as Check } from "./label-wwVqLVHJ.js";
import { S as Skeleton } from "./skeleton-BSczkJxI.js";
import { f as useControllableState, b as Primitive, c as composeEventHandlers, a as createContextScope, g as useId, P as Presence, E as ExternalLink } from "./index-EfdsvFKY.js";
import { u as useComposedRefs, a as cn } from "./utils-DR9wOthu.js";
import { u as usePrevious, a as ChevronUp, C as ChevronDown } from "./index-8R11dm0v.js";
import { a as useSize, u as useDirection } from "./index-CVAcnCDi.js";
import { R as Root$1, I as Item, c as createRovingFocusGroupScope } from "./index-BtOyEtQP.js";
import { F as Fingerprint } from "./fingerprint-BtMRmRRO.js";
import { S as ShieldCheck } from "./shield-check-BGK1a3VR.js";
import { C as CircleAlert } from "./circle-alert-CQ_uOq7g.js";
import { C as CircleCheck } from "./circle-check-7QucFnTN.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["line", { x1: "4", x2: "20", y1: "9", y2: "9", key: "4lhtct" }],
  ["line", { x1: "4", x2: "20", y1: "15", y2: "15", key: "vyu0kd" }],
  ["line", { x1: "10", x2: "8", y1: "3", y2: "21", key: "1ggp8o" }],
  ["line", { x1: "16", x2: "14", y1: "3", y2: "21", key: "weycgp" }]
];
const Hash = createLucideIcon("hash", __iconNode);
var SWITCH_NAME = "Switch";
var [createSwitchContext] = createContextScope(SWITCH_NAME);
var [SwitchProvider, useSwitchContext] = createSwitchContext(SWITCH_NAME);
var Switch$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSwitch,
      name,
      checked: checkedProp,
      defaultChecked,
      required,
      disabled,
      value = "on",
      onCheckedChange,
      form,
      ...switchProps
    } = props;
    const [button, setButton] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setButton(node));
    const hasConsumerStoppedPropagationRef = reactExports.useRef(false);
    const isFormControl = button ? form || !!button.closest("form") : true;
    const [checked, setChecked] = useControllableState({
      prop: checkedProp,
      defaultProp: defaultChecked ?? false,
      onChange: onCheckedChange,
      caller: SWITCH_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(SwitchProvider, { scope: __scopeSwitch, checked, disabled, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.button,
        {
          type: "button",
          role: "switch",
          "aria-checked": checked,
          "aria-required": required,
          "data-state": getState(checked),
          "data-disabled": disabled ? "" : void 0,
          disabled,
          value,
          ...switchProps,
          ref: composedRefs,
          onClick: composeEventHandlers(props.onClick, (event) => {
            setChecked((prevChecked) => !prevChecked);
            if (isFormControl) {
              hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
              if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
            }
          })
        }
      ),
      isFormControl && /* @__PURE__ */ jsxRuntimeExports.jsx(
        SwitchBubbleInput,
        {
          control: button,
          bubbles: !hasConsumerStoppedPropagationRef.current,
          name,
          value,
          checked,
          required,
          disabled,
          form,
          style: { transform: "translateX(-100%)" }
        }
      )
    ] });
  }
);
Switch$1.displayName = SWITCH_NAME;
var THUMB_NAME = "SwitchThumb";
var SwitchThumb = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSwitch, ...thumbProps } = props;
    const context = useSwitchContext(THUMB_NAME, __scopeSwitch);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        "data-state": getState(context.checked),
        "data-disabled": context.disabled ? "" : void 0,
        ...thumbProps,
        ref: forwardedRef
      }
    );
  }
);
SwitchThumb.displayName = THUMB_NAME;
var BUBBLE_INPUT_NAME = "SwitchBubbleInput";
var SwitchBubbleInput = reactExports.forwardRef(
  ({
    __scopeSwitch,
    control,
    checked,
    bubbles = true,
    ...props
  }, forwardedRef) => {
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(ref, forwardedRef);
    const prevChecked = usePrevious(checked);
    const controlSize = useSize(control);
    reactExports.useEffect(() => {
      const input = ref.current;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        inputProto,
        "checked"
      );
      const setChecked = descriptor.set;
      if (prevChecked !== checked && setChecked) {
        const event = new Event("click", { bubbles });
        setChecked.call(input, checked);
        input.dispatchEvent(event);
      }
    }, [prevChecked, checked, bubbles]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "checkbox",
        "aria-hidden": true,
        defaultChecked: checked,
        ...props,
        tabIndex: -1,
        ref: composedRefs,
        style: {
          ...props.style,
          ...controlSize,
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          margin: 0
        }
      }
    );
  }
);
SwitchBubbleInput.displayName = BUBBLE_INPUT_NAME;
function getState(checked) {
  return checked ? "checked" : "unchecked";
}
var Root = Switch$1;
var Thumb = SwitchThumb;
function Switch({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "switch",
      className: cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Thumb,
        {
          "data-slot": "switch-thumb",
          className: cn(
            "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
          )
        }
      )
    }
  );
}
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
      Root$1,
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
function StatusBadge({ status }) {
  if (status === NftStatus.active) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 border border-green-500/20", children: "Active" });
  }
  if (status === NftStatus.burned) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-600 border border-orange-500/20", children: "Burned" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border", children: "Deleted" });
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
      "NFT Verified",
      result.status && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: result.status })
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
function CollapsibleNftCard({
  result,
  expanded,
  onToggle
}) {
  const nftUniqueId = typeof result.nftUniqueId === "string" && result.nftUniqueId.trim().length > 0 ? result.nftUniqueId : "Invalid NFT Record";
  const isInactive = result.status === NftStatus.burned || result.status === NftStatus.deleted;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Card,
    {
      className: `rounded-xl overflow-hidden transition-opacity duration-200 ${isInactive ? "opacity-60" : ""}`,
      "data-ocid": "verify.creator_nft_card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: onToggle,
            className: "w-full text-left p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors",
            "aria-expanded": expanded,
            "data-ocid": "verify.creator_nft_toggle",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-primary shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-foreground truncate", children: nftUniqueId }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                    "Token ",
                    result.tokenId.toString()
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary", children: result.edition }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600", children: "Verified" }),
                result.status && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: result.status }),
                expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "w-4 h-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4 text-muted-foreground" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "pt-2 pb-3 px-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifyResultCard, { result }) })
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
  const { actor } = useAuth();
  const { isAdmin } = usePermissions();
  const search = useSearch({ strict: false });
  const urlNftUniqueId = search.id ?? "";
  const [creatorId, setCreatorId] = reactExports.useState("");
  const [creatorLoading, setCreatorLoading] = reactExports.useState(false);
  const [creatorResult, setCreatorResult] = reactExports.useState(void 0);
  const [creatorError, setCreatorError] = reactExports.useState(null);
  const [expandedCardId, setExpandedCardId] = reactExports.useState(null);
  const [showAllHistory, setShowAllHistory] = reactExports.useState(false);
  const [nftUniqueIdInput, setNftUniqueIdInput] = reactExports.useState(urlNftUniqueId);
  const [nftLoading, setNftLoading] = reactExports.useState(false);
  const [nftResult, setNftResult] = reactExports.useState(
    void 0
  );
  const [nftError, setNftError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!urlNftUniqueId || !actor) return;
    setNftLoading(true);
    setNftResult(void 0);
    setNftError(null);
    actor.verifyNftPublic(urlNftUniqueId).then((res) => {
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
  }, [urlNftUniqueId, actor]);
  async function handleVerifyByCreatorId(e, forceHistory) {
    e.preventDefault();
    if (!actor) {
      setCreatorError("Please log in to verify by Creator ID.");
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
    setExpandedCardId(null);
    const useHistory = forceHistory !== void 0 ? forceHistory : showAllHistory;
    try {
      const res = useHistory ? await actor.verifyNftByCreatorIdWithHistory(trimmed) : await actor.verifyNftByCreatorId(trimmed);
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
    if (!actor) {
      setNftError("Please log in to verify NFTs.");
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
      const res = await actor.verifyNftPublic(trimmed);
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Confirm authenticity of any minted NFT. Log in to verify." })
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
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2",
            "data-ocid": "verify.all_history_toggle_row",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-foreground", children: "Show All History" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Include burned & deleted NFTs" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  checked: showAllHistory,
                  onCheckedChange: (checked) => {
                    setShowAllHistory(checked);
                    if (creatorId.trim()) {
                      setCreatorLoading(true);
                      setCreatorResult(void 0);
                      setCreatorError(null);
                      setExpandedCardId(null);
                      if (!actor) {
                        setCreatorLoading(false);
                        return;
                      }
                      const trimmed = creatorId.trim();
                      (checked ? actor.verifyNftByCreatorIdWithHistory(trimmed) : actor.verifyNftByCreatorId(trimmed)).then((res) => {
                        if (res.__kind__ === "ok") {
                          setCreatorResult(res.ok.length > 0 ? res.ok : null);
                        } else {
                          setCreatorResult(null);
                        }
                      }).catch(
                        () => setCreatorError(
                          "Verification failed. Please try again."
                        )
                      ).finally(() => setCreatorLoading(false));
                    }
                  },
                  id: "all-history-toggle",
                  "aria-label": "Show all NFT history including burned and deleted",
                  "data-ocid": "verify.all_history_toggle"
                }
              )
            ]
          }
        ),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: showAllHistory ? `${creatorResult.length} NFT(s) total (including burned and deleted)` : `${creatorResult.length} active NFT(s) found` }),
          Array.from(
            new Map(
              creatorResult.map((r) => [r.nftUniqueId ?? r.assetHash, r])
            ).values()
          ).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            CollapsibleNftCard,
            {
              result: r,
              expanded: expandedCardId === (r.nftUniqueId ?? r.assetHash),
              onToggle: () => setExpandedCardId(
                (prev) => prev === (r.nftUniqueId ?? r.assetHash) ? null : r.nftUniqueId ?? r.assetHash
              )
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
