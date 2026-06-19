import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, f as useComposedRefs, s as reactDomExports, h as cn, b as useNavigate, a as useAuth, t as usePermissions, c as useQueryClient, v as useCreateSlot, i as useMyActiveNfts, w as useSearchNfts, d as useQuery, x as useNotifications, y as useGenerateClaimLink, z as useMutation, L as LoaderCircle, I as Info, X, B as Button, A as ue, T as TriangleAlert, E as ExternalBlob } from "./main-NqEFbe9E.js";
import { P as Portal$1, h as hideOthers, u as useFocusGuards, R as ReactRemoveScroll, F as FocusScope, D as DismissableLayer, N as NftDetailModal, a as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription, f as DialogFooter } from "./NftDetailModal-BJeV6AD5.js";
import { b as Primitive, f as useControllableState, g as useId, c as composeEventHandlers, h as useLayoutEffect2, u as useCallbackRef, a as createContextScope, e as createSlot, P as Presence } from "./index-Dg0dg0_-.js";
import { I as Input } from "./input-BVzQQ5xW.js";
import { C as Check, a as Copy, L as Label } from "./label-f3K4DGEC.js";
import { u as useDirection, c as createCollection } from "./index-vdb8UDIJ.js";
import { R as Root2$1, A as Anchor, c as createPopperScope, C as Content, a as Arrow, P as Plus } from "./index-ctQY016_.js";
import { u as usePrevious, C as ChevronDown, a as ChevronUp } from "./index-By6BziLa.js";
import { S as Skeleton } from "./skeleton-D7SF3OWg.js";
import { B as BrandedAuthGate } from "./BrandedAuthGate-B-QVzGYi.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9", key: "eefl8a" }],
  ["path", { d: "m18 15 4-4", key: "16gjal" }],
  [
    "path",
    {
      d: "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",
      key: "b7pghm"
    }
  ]
];
const Hammer = createLucideIcon("hammer", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M10.41 10.41a2 2 0 1 1-2.83-2.83", key: "1bzlo9" }],
  ["line", { x1: "13.5", x2: "6", y1: "13.5", y2: "21", key: "1q0aeu" }],
  ["line", { x1: "18", x2: "21", y1: "12", y2: "15", key: "5mozeu" }],
  [
    "path",
    {
      d: "M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",
      key: "mmje98"
    }
  ],
  ["path", { d: "M21 15V5a2 2 0 0 0-2-2H9", key: "43el77" }]
];
const ImageOff = createLucideIcon("image-off", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }],
  ["circle", { cx: "6", cy: "12", r: "3", key: "w7nqdw" }],
  ["circle", { cx: "18", cy: "19", r: "3", key: "1xt0gg" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49", key: "47mynk" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49", key: "1n3mei" }]
];
const Share2 = createLucideIcon("share-2", __iconNode);
function clamp(value, [min, max]) {
  return Math.min(max, Math.max(min, value));
}
var VISUALLY_HIDDEN_STYLES = Object.freeze({
  // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
  position: "absolute",
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal"
});
var NAME = "VisuallyHidden";
var VisuallyHidden = reactExports.forwardRef(
  (props, forwardedRef) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...props,
        ref: forwardedRef,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style }
      }
    );
  }
);
VisuallyHidden.displayName = NAME;
var OPEN_KEYS = [" ", "Enter", "ArrowUp", "ArrowDown"];
var SELECTION_KEYS = [" ", "Enter"];
var SELECT_NAME = "Select";
var [Collection, useCollection, createCollectionScope] = createCollection(SELECT_NAME);
var [createSelectContext] = createContextScope(SELECT_NAME, [
  createCollectionScope,
  createPopperScope
]);
var usePopperScope = createPopperScope();
var [SelectProvider, useSelectContext] = createSelectContext(SELECT_NAME);
var [SelectNativeOptionsProvider, useSelectNativeOptionsContext] = createSelectContext(SELECT_NAME);
var Select$1 = (props) => {
  const {
    __scopeSelect,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    dir,
    name,
    autoComplete,
    disabled,
    required,
    form
  } = props;
  const popperScope = usePopperScope(__scopeSelect);
  const [trigger, setTrigger] = reactExports.useState(null);
  const [valueNode, setValueNode] = reactExports.useState(null);
  const [valueNodeHasChildren, setValueNodeHasChildren] = reactExports.useState(false);
  const direction = useDirection(dir);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: SELECT_NAME
  });
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
    caller: SELECT_NAME
  });
  const triggerPointerDownPosRef = reactExports.useRef(null);
  const isFormControl = trigger ? form || !!trigger.closest("form") : true;
  const [nativeOptionsSet, setNativeOptionsSet] = reactExports.useState(/* @__PURE__ */ new Set());
  const nativeSelectKey = Array.from(nativeOptionsSet).map((option) => option.props.value).join(";");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2$1, { ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    SelectProvider,
    {
      required,
      scope: __scopeSelect,
      trigger,
      onTriggerChange: setTrigger,
      valueNode,
      onValueNodeChange: setValueNode,
      valueNodeHasChildren,
      onValueNodeHasChildrenChange: setValueNodeHasChildren,
      contentId: useId(),
      value,
      onValueChange: setValue,
      open,
      onOpenChange: setOpen,
      dir: direction,
      triggerPointerDownPosRef,
      disabled,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: __scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectNativeOptionsProvider,
          {
            scope: props.__scopeSelect,
            onNativeOptionAdd: reactExports.useCallback((option) => {
              setNativeOptionsSet((prev) => new Set(prev).add(option));
            }, []),
            onNativeOptionRemove: reactExports.useCallback((option) => {
              setNativeOptionsSet((prev) => {
                const optionsSet = new Set(prev);
                optionsSet.delete(option);
                return optionsSet;
              });
            }, []),
            children
          }
        ) }),
        isFormControl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          SelectBubbleInput,
          {
            "aria-hidden": true,
            required,
            tabIndex: -1,
            name,
            autoComplete,
            value,
            onChange: (event) => setValue(event.target.value),
            disabled,
            form,
            children: [
              value === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "" }) : null,
              Array.from(nativeOptionsSet)
            ]
          },
          nativeSelectKey
        ) : null
      ]
    }
  ) });
};
Select$1.displayName = SELECT_NAME;
var TRIGGER_NAME$1 = "SelectTrigger";
var SelectTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, disabled = false, ...triggerProps } = props;
    const popperScope = usePopperScope(__scopeSelect);
    const context = useSelectContext(TRIGGER_NAME$1, __scopeSelect);
    const isDisabled = context.disabled || disabled;
    const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange);
    const getItems = useCollection(__scopeSelect);
    const pointerTypeRef = reactExports.useRef("touch");
    const [searchRef, handleTypeaheadSearch, resetTypeahead] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.value === context.value);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem !== void 0) {
        context.onValueChange(nextItem.value);
      }
    });
    const handleOpen = (pointerEvent) => {
      if (!isDisabled) {
        context.onOpenChange(true);
        resetTypeahead();
      }
      if (pointerEvent) {
        context.triggerPointerDownPosRef.current = {
          x: Math.round(pointerEvent.pageX),
          y: Math.round(pointerEvent.pageY)
        };
      }
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor, { asChild: true, ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        role: "combobox",
        "aria-controls": context.contentId,
        "aria-expanded": context.open,
        "aria-required": context.required,
        "aria-autocomplete": "none",
        dir: context.dir,
        "data-state": context.open ? "open" : "closed",
        disabled: isDisabled,
        "data-disabled": isDisabled ? "" : void 0,
        "data-placeholder": shouldShowPlaceholder(context.value) ? "" : void 0,
        ...triggerProps,
        ref: composedRefs,
        onClick: composeEventHandlers(triggerProps.onClick, (event) => {
          event.currentTarget.focus();
          if (pointerTypeRef.current !== "mouse") {
            handleOpen(event);
          }
        }),
        onPointerDown: composeEventHandlers(triggerProps.onPointerDown, (event) => {
          pointerTypeRef.current = event.pointerType;
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
          }
          if (event.button === 0 && event.ctrlKey === false && event.pointerType === "mouse") {
            handleOpen(event);
            event.preventDefault();
          }
        }),
        onKeyDown: composeEventHandlers(triggerProps.onKeyDown, (event) => {
          const isTypingAhead = searchRef.current !== "";
          const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
          if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);
          if (isTypingAhead && event.key === " ") return;
          if (OPEN_KEYS.includes(event.key)) {
            handleOpen();
            event.preventDefault();
          }
        })
      }
    ) });
  }
);
SelectTrigger$1.displayName = TRIGGER_NAME$1;
var VALUE_NAME = "SelectValue";
var SelectValue$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, className, style, children, placeholder = "", ...valueProps } = props;
    const context = useSelectContext(VALUE_NAME, __scopeSelect);
    const { onValueNodeHasChildrenChange } = context;
    const hasChildren = children !== void 0;
    const composedRefs = useComposedRefs(forwardedRef, context.onValueNodeChange);
    useLayoutEffect2(() => {
      onValueNodeHasChildrenChange(hasChildren);
    }, [onValueNodeHasChildrenChange, hasChildren]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...valueProps,
        ref: composedRefs,
        style: { pointerEvents: "none" },
        children: shouldShowPlaceholder(context.value) ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: placeholder }) : children
      }
    );
  }
);
SelectValue$1.displayName = VALUE_NAME;
var ICON_NAME = "SelectIcon";
var SelectIcon = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, children, ...iconProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { "aria-hidden": true, ...iconProps, ref: forwardedRef, children: children || "▼" });
  }
);
SelectIcon.displayName = ICON_NAME;
var PORTAL_NAME = "SelectPortal";
var SelectPortal = (props) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, { asChild: true, ...props });
};
SelectPortal.displayName = PORTAL_NAME;
var CONTENT_NAME$1 = "SelectContent";
var SelectContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useSelectContext(CONTENT_NAME$1, props.__scopeSelect);
    const [fragment, setFragment] = reactExports.useState();
    useLayoutEffect2(() => {
      setFragment(new DocumentFragment());
    }, []);
    if (!context.open) {
      const frag = fragment;
      return frag ? reactDomExports.createPortal(
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContentProvider, { scope: props.__scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: props.children }) }) }),
        frag
      ) : null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContentImpl, { ...props, ref: forwardedRef });
  }
);
SelectContent$1.displayName = CONTENT_NAME$1;
var CONTENT_MARGIN = 10;
var [SelectContentProvider, useSelectContentContext] = createSelectContext(CONTENT_NAME$1);
var CONTENT_IMPL_NAME = "SelectContentImpl";
var Slot = createSlot("SelectContent.RemoveScroll");
var SelectContentImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSelect,
      position = "item-aligned",
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      //
      // PopperContent props
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions,
      //
      ...contentProps
    } = props;
    const context = useSelectContext(CONTENT_NAME$1, __scopeSelect);
    const [content, setContent] = reactExports.useState(null);
    const [viewport, setViewport] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
    const [selectedItem, setSelectedItem] = reactExports.useState(null);
    const [selectedItemText, setSelectedItemText] = reactExports.useState(
      null
    );
    const getItems = useCollection(__scopeSelect);
    const [isPositioned, setIsPositioned] = reactExports.useState(false);
    const firstValidItemFoundRef = reactExports.useRef(false);
    reactExports.useEffect(() => {
      if (content) return hideOthers(content);
    }, [content]);
    useFocusGuards();
    const focusFirst = reactExports.useCallback(
      (candidates) => {
        const [firstItem, ...restItems] = getItems().map((item) => item.ref.current);
        const [lastItem] = restItems.slice(-1);
        const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
        for (const candidate of candidates) {
          if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
          candidate == null ? void 0 : candidate.scrollIntoView({ block: "nearest" });
          if (candidate === firstItem && viewport) viewport.scrollTop = 0;
          if (candidate === lastItem && viewport) viewport.scrollTop = viewport.scrollHeight;
          candidate == null ? void 0 : candidate.focus();
          if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
        }
      },
      [getItems, viewport]
    );
    const focusSelectedItem = reactExports.useCallback(
      () => focusFirst([selectedItem, content]),
      [focusFirst, selectedItem, content]
    );
    reactExports.useEffect(() => {
      if (isPositioned) {
        focusSelectedItem();
      }
    }, [isPositioned, focusSelectedItem]);
    const { onOpenChange, triggerPointerDownPosRef } = context;
    reactExports.useEffect(() => {
      if (content) {
        let pointerMoveDelta = { x: 0, y: 0 };
        const handlePointerMove = (event) => {
          var _a, _b;
          pointerMoveDelta = {
            x: Math.abs(Math.round(event.pageX) - (((_a = triggerPointerDownPosRef.current) == null ? void 0 : _a.x) ?? 0)),
            y: Math.abs(Math.round(event.pageY) - (((_b = triggerPointerDownPosRef.current) == null ? void 0 : _b.y) ?? 0))
          };
        };
        const handlePointerUp = (event) => {
          if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) {
            event.preventDefault();
          } else {
            if (!content.contains(event.target)) {
              onOpenChange(false);
            }
          }
          document.removeEventListener("pointermove", handlePointerMove);
          triggerPointerDownPosRef.current = null;
        };
        if (triggerPointerDownPosRef.current !== null) {
          document.addEventListener("pointermove", handlePointerMove);
          document.addEventListener("pointerup", handlePointerUp, { capture: true, once: true });
        }
        return () => {
          document.removeEventListener("pointermove", handlePointerMove);
          document.removeEventListener("pointerup", handlePointerUp, { capture: true });
        };
      }
    }, [content, onOpenChange, triggerPointerDownPosRef]);
    reactExports.useEffect(() => {
      const close = () => onOpenChange(false);
      window.addEventListener("blur", close);
      window.addEventListener("resize", close);
      return () => {
        window.removeEventListener("blur", close);
        window.removeEventListener("resize", close);
      };
    }, [onOpenChange]);
    const [searchRef, handleTypeaheadSearch] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.ref.current === document.activeElement);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem) {
        setTimeout(() => nextItem.ref.current.focus());
      }
    });
    const itemRefCallback = reactExports.useCallback(
      (node, value, disabled) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isSelectedItem = context.value !== void 0 && context.value === value;
        if (isSelectedItem || isFirstValidItem) {
          setSelectedItem(node);
          if (isFirstValidItem) firstValidItemFoundRef.current = true;
        }
      },
      [context.value]
    );
    const handleItemLeave = reactExports.useCallback(() => content == null ? void 0 : content.focus(), [content]);
    const itemTextRefCallback = reactExports.useCallback(
      (node, value, disabled) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isSelectedItem = context.value !== void 0 && context.value === value;
        if (isSelectedItem || isFirstValidItem) {
          setSelectedItemText(node);
        }
      },
      [context.value]
    );
    const SelectPosition = position === "popper" ? SelectPopperPosition : SelectItemAlignedPosition;
    const popperContentProps = SelectPosition === SelectPopperPosition ? {
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions
    } : {};
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectContentProvider,
      {
        scope: __scopeSelect,
        content,
        viewport,
        onViewportChange: setViewport,
        itemRefCallback,
        selectedItem,
        onItemLeave: handleItemLeave,
        itemTextRefCallback,
        focusSelectedItem,
        selectedItemText,
        position,
        isPositioned,
        searchRef,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReactRemoveScroll, { as: Slot, allowPinchZoom: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          FocusScope,
          {
            asChild: true,
            trapped: context.open,
            onMountAutoFocus: (event) => {
              event.preventDefault();
            },
            onUnmountAutoFocus: composeEventHandlers(onCloseAutoFocus, (event) => {
              var _a;
              (_a = context.trigger) == null ? void 0 : _a.focus({ preventScroll: true });
              event.preventDefault();
            }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              DismissableLayer,
              {
                asChild: true,
                disableOutsidePointerEvents: true,
                onEscapeKeyDown,
                onPointerDownOutside,
                onFocusOutside: (event) => event.preventDefault(),
                onDismiss: () => context.onOpenChange(false),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectPosition,
                  {
                    role: "listbox",
                    id: context.contentId,
                    "data-state": context.open ? "open" : "closed",
                    dir: context.dir,
                    onContextMenu: (event) => event.preventDefault(),
                    ...contentProps,
                    ...popperContentProps,
                    onPlaced: () => setIsPositioned(true),
                    ref: composedRefs,
                    style: {
                      // flex layout so we can place the scroll buttons properly
                      display: "flex",
                      flexDirection: "column",
                      // reset the outline by default as the content MAY get focused
                      outline: "none",
                      ...contentProps.style
                    },
                    onKeyDown: composeEventHandlers(contentProps.onKeyDown, (event) => {
                      const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
                      if (event.key === "Tab") event.preventDefault();
                      if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);
                      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                        const items = getItems().filter((item) => !item.disabled);
                        let candidateNodes = items.map((item) => item.ref.current);
                        if (["ArrowUp", "End"].includes(event.key)) {
                          candidateNodes = candidateNodes.slice().reverse();
                        }
                        if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                          const currentElement = event.target;
                          const currentIndex = candidateNodes.indexOf(currentElement);
                          candidateNodes = candidateNodes.slice(currentIndex + 1);
                        }
                        setTimeout(() => focusFirst(candidateNodes));
                        event.preventDefault();
                      }
                    })
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
SelectContentImpl.displayName = CONTENT_IMPL_NAME;
var ITEM_ALIGNED_POSITION_NAME = "SelectItemAlignedPosition";
var SelectItemAlignedPosition = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeSelect, onPlaced, ...popperProps } = props;
  const context = useSelectContext(CONTENT_NAME$1, __scopeSelect);
  const contentContext = useSelectContentContext(CONTENT_NAME$1, __scopeSelect);
  const [contentWrapper, setContentWrapper] = reactExports.useState(null);
  const [content, setContent] = reactExports.useState(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
  const getItems = useCollection(__scopeSelect);
  const shouldExpandOnScrollRef = reactExports.useRef(false);
  const shouldRepositionRef = reactExports.useRef(true);
  const { viewport, selectedItem, selectedItemText, focusSelectedItem } = contentContext;
  const position = reactExports.useCallback(() => {
    if (context.trigger && context.valueNode && contentWrapper && content && viewport && selectedItem && selectedItemText) {
      const triggerRect = context.trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const valueNodeRect = context.valueNode.getBoundingClientRect();
      const itemTextRect = selectedItemText.getBoundingClientRect();
      if (context.dir !== "rtl") {
        const itemTextOffset = itemTextRect.left - contentRect.left;
        const left = valueNodeRect.left - itemTextOffset;
        const leftDelta = triggerRect.left - left;
        const minContentWidth = triggerRect.width + leftDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const rightEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedLeft = clamp(left, [
          CONTENT_MARGIN,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(CONTENT_MARGIN, rightEdge - contentWidth)
        ]);
        contentWrapper.style.minWidth = minContentWidth + "px";
        contentWrapper.style.left = clampedLeft + "px";
      } else {
        const itemTextOffset = contentRect.right - itemTextRect.right;
        const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
        const rightDelta = window.innerWidth - triggerRect.right - right;
        const minContentWidth = triggerRect.width + rightDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const leftEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedRight = clamp(right, [
          CONTENT_MARGIN,
          Math.max(CONTENT_MARGIN, leftEdge - contentWidth)
        ]);
        contentWrapper.style.minWidth = minContentWidth + "px";
        contentWrapper.style.right = clampedRight + "px";
      }
      const items = getItems();
      const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
      const itemsHeight = viewport.scrollHeight;
      const contentStyles = window.getComputedStyle(content);
      const contentBorderTopWidth = parseInt(contentStyles.borderTopWidth, 10);
      const contentPaddingTop = parseInt(contentStyles.paddingTop, 10);
      const contentBorderBottomWidth = parseInt(contentStyles.borderBottomWidth, 10);
      const contentPaddingBottom = parseInt(contentStyles.paddingBottom, 10);
      const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth;
      const minContentHeight = Math.min(selectedItem.offsetHeight * 5, fullContentHeight);
      const viewportStyles = window.getComputedStyle(viewport);
      const viewportPaddingTop = parseInt(viewportStyles.paddingTop, 10);
      const viewportPaddingBottom = parseInt(viewportStyles.paddingBottom, 10);
      const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
      const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;
      const selectedItemHalfHeight = selectedItem.offsetHeight / 2;
      const itemOffsetMiddle = selectedItem.offsetTop + selectedItemHalfHeight;
      const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
      const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;
      const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;
      if (willAlignWithoutTopOverflow) {
        const isLastItem = items.length > 0 && selectedItem === items[items.length - 1].ref.current;
        contentWrapper.style.bottom = "0px";
        const viewportOffsetBottom = content.clientHeight - viewport.offsetTop - viewport.offsetHeight;
        const clampedTriggerMiddleToBottomEdge = Math.max(
          triggerMiddleToBottomEdge,
          selectedItemHalfHeight + // viewport might have padding bottom, include it to avoid a scrollable viewport
          (isLastItem ? viewportPaddingBottom : 0) + viewportOffsetBottom + contentBorderBottomWidth
        );
        const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
        contentWrapper.style.height = height + "px";
      } else {
        const isFirstItem = items.length > 0 && selectedItem === items[0].ref.current;
        contentWrapper.style.top = "0px";
        const clampedTopEdgeToTriggerMiddle = Math.max(
          topEdgeToTriggerMiddle,
          contentBorderTopWidth + viewport.offsetTop + // viewport might have padding top, include it to avoid a scrollable viewport
          (isFirstItem ? viewportPaddingTop : 0) + selectedItemHalfHeight
        );
        const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
        contentWrapper.style.height = height + "px";
        viewport.scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewport.offsetTop;
      }
      contentWrapper.style.margin = `${CONTENT_MARGIN}px 0`;
      contentWrapper.style.minHeight = minContentHeight + "px";
      contentWrapper.style.maxHeight = availableHeight + "px";
      onPlaced == null ? void 0 : onPlaced();
      requestAnimationFrame(() => shouldExpandOnScrollRef.current = true);
    }
  }, [
    getItems,
    context.trigger,
    context.valueNode,
    contentWrapper,
    content,
    viewport,
    selectedItem,
    selectedItemText,
    context.dir,
    onPlaced
  ]);
  useLayoutEffect2(() => position(), [position]);
  const [contentZIndex, setContentZIndex] = reactExports.useState();
  useLayoutEffect2(() => {
    if (content) setContentZIndex(window.getComputedStyle(content).zIndex);
  }, [content]);
  const handleScrollButtonChange = reactExports.useCallback(
    (node) => {
      if (node && shouldRepositionRef.current === true) {
        position();
        focusSelectedItem == null ? void 0 : focusSelectedItem();
        shouldRepositionRef.current = false;
      }
    },
    [position, focusSelectedItem]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectViewportProvider,
    {
      scope: __scopeSelect,
      contentWrapper,
      shouldExpandOnScrollRef,
      onScrollButtonChange: handleScrollButtonChange,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: setContentWrapper,
          style: {
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            zIndex: contentZIndex
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Primitive.div,
            {
              ...popperProps,
              ref: composedRefs,
              style: {
                // When we get the height of the content, it includes borders. If we were to set
                // the height without having `boxSizing: 'border-box'` it would be too big.
                boxSizing: "border-box",
                // We need to ensure the content doesn't get taller than the wrapper
                maxHeight: "100%",
                ...popperProps.style
              }
            }
          )
        }
      )
    }
  );
});
SelectItemAlignedPosition.displayName = ITEM_ALIGNED_POSITION_NAME;
var POPPER_POSITION_NAME = "SelectPopperPosition";
var SelectPopperPosition = reactExports.forwardRef((props, forwardedRef) => {
  const {
    __scopeSelect,
    align = "start",
    collisionPadding = CONTENT_MARGIN,
    ...popperProps
  } = props;
  const popperScope = usePopperScope(__scopeSelect);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Content,
    {
      ...popperScope,
      ...popperProps,
      ref: forwardedRef,
      align,
      collisionPadding,
      style: {
        // Ensure border-box for floating-ui calculations
        boxSizing: "border-box",
        ...popperProps.style,
        // re-namespace exposed content custom properties
        ...{
          "--radix-select-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-select-content-available-width": "var(--radix-popper-available-width)",
          "--radix-select-content-available-height": "var(--radix-popper-available-height)",
          "--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-select-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    }
  );
});
SelectPopperPosition.displayName = POPPER_POSITION_NAME;
var [SelectViewportProvider, useSelectViewportContext] = createSelectContext(CONTENT_NAME$1, {});
var VIEWPORT_NAME = "SelectViewport";
var SelectViewport = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, nonce, ...viewportProps } = props;
    const contentContext = useSelectContentContext(VIEWPORT_NAME, __scopeSelect);
    const viewportContext = useSelectViewportContext(VIEWPORT_NAME, __scopeSelect);
    const composedRefs = useComposedRefs(forwardedRef, contentContext.onViewportChange);
    const prevScrollTopRef = reactExports.useRef(0);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: `[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}`
          },
          nonce
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: __scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          "data-radix-select-viewport": "",
          role: "presentation",
          ...viewportProps,
          ref: composedRefs,
          style: {
            // we use position: 'relative' here on the `viewport` so that when we call
            // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
            // (independent of the scrollUpButton).
            position: "relative",
            flex: 1,
            // Viewport should only be scrollable in the vertical direction.
            // This won't work in vertical writing modes, so we'll need to
            // revisit this if/when that is supported
            // https://developer.chrome.com/blog/vertical-form-controls
            overflow: "hidden auto",
            ...viewportProps.style
          },
          onScroll: composeEventHandlers(viewportProps.onScroll, (event) => {
            const viewport = event.currentTarget;
            const { contentWrapper, shouldExpandOnScrollRef } = viewportContext;
            if ((shouldExpandOnScrollRef == null ? void 0 : shouldExpandOnScrollRef.current) && contentWrapper) {
              const scrolledBy = Math.abs(prevScrollTopRef.current - viewport.scrollTop);
              if (scrolledBy > 0) {
                const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
                const cssMinHeight = parseFloat(contentWrapper.style.minHeight);
                const cssHeight = parseFloat(contentWrapper.style.height);
                const prevHeight = Math.max(cssMinHeight, cssHeight);
                if (prevHeight < availableHeight) {
                  const nextHeight = prevHeight + scrolledBy;
                  const clampedNextHeight = Math.min(availableHeight, nextHeight);
                  const heightDiff = nextHeight - clampedNextHeight;
                  contentWrapper.style.height = clampedNextHeight + "px";
                  if (contentWrapper.style.bottom === "0px") {
                    viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
                    contentWrapper.style.justifyContent = "flex-end";
                  }
                }
              }
            }
            prevScrollTopRef.current = viewport.scrollTop;
          })
        }
      ) })
    ] });
  }
);
SelectViewport.displayName = VIEWPORT_NAME;
var GROUP_NAME = "SelectGroup";
var [SelectGroupContextProvider, useSelectGroupContext] = createSelectContext(GROUP_NAME);
var SelectGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...groupProps } = props;
    const groupId = useId();
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SelectGroupContextProvider, { scope: __scopeSelect, id: groupId, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { role: "group", "aria-labelledby": groupId, ...groupProps, ref: forwardedRef }) });
  }
);
SelectGroup.displayName = GROUP_NAME;
var LABEL_NAME = "SelectLabel";
var SelectLabel = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...labelProps } = props;
    const groupContext = useSelectGroupContext(LABEL_NAME, __scopeSelect);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { id: groupContext.id, ...labelProps, ref: forwardedRef });
  }
);
SelectLabel.displayName = LABEL_NAME;
var ITEM_NAME = "SelectItem";
var [SelectItemContextProvider, useSelectItemContext] = createSelectContext(ITEM_NAME);
var SelectItem$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSelect,
      value,
      disabled = false,
      textValue: textValueProp,
      ...itemProps
    } = props;
    const context = useSelectContext(ITEM_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ITEM_NAME, __scopeSelect);
    const isSelected = context.value === value;
    const [textValue, setTextValue] = reactExports.useState(textValueProp ?? "");
    const [isFocused, setIsFocused] = reactExports.useState(false);
    const composedRefs = useComposedRefs(
      forwardedRef,
      (node) => {
        var _a;
        return (_a = contentContext.itemRefCallback) == null ? void 0 : _a.call(contentContext, node, value, disabled);
      }
    );
    const textId = useId();
    const pointerTypeRef = reactExports.useRef("touch");
    const handleSelect = () => {
      if (!disabled) {
        context.onValueChange(value);
        context.onOpenChange(false);
      }
    };
    if (value === "") {
      throw new Error(
        "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectItemContextProvider,
      {
        scope: __scopeSelect,
        value,
        disabled,
        textId,
        isSelected,
        onItemTextChange: reactExports.useCallback((node) => {
          setTextValue((prevTextValue) => prevTextValue || ((node == null ? void 0 : node.textContent) ?? "").trim());
        }, []),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Collection.ItemSlot,
          {
            scope: __scopeSelect,
            value,
            disabled,
            textValue,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Primitive.div,
              {
                role: "option",
                "aria-labelledby": textId,
                "data-highlighted": isFocused ? "" : void 0,
                "aria-selected": isSelected && isFocused,
                "data-state": isSelected ? "checked" : "unchecked",
                "aria-disabled": disabled || void 0,
                "data-disabled": disabled ? "" : void 0,
                tabIndex: disabled ? void 0 : -1,
                ...itemProps,
                ref: composedRefs,
                onFocus: composeEventHandlers(itemProps.onFocus, () => setIsFocused(true)),
                onBlur: composeEventHandlers(itemProps.onBlur, () => setIsFocused(false)),
                onClick: composeEventHandlers(itemProps.onClick, () => {
                  if (pointerTypeRef.current !== "mouse") handleSelect();
                }),
                onPointerUp: composeEventHandlers(itemProps.onPointerUp, () => {
                  if (pointerTypeRef.current === "mouse") handleSelect();
                }),
                onPointerDown: composeEventHandlers(itemProps.onPointerDown, (event) => {
                  pointerTypeRef.current = event.pointerType;
                }),
                onPointerMove: composeEventHandlers(itemProps.onPointerMove, (event) => {
                  var _a;
                  pointerTypeRef.current = event.pointerType;
                  if (disabled) {
                    (_a = contentContext.onItemLeave) == null ? void 0 : _a.call(contentContext);
                  } else if (pointerTypeRef.current === "mouse") {
                    event.currentTarget.focus({ preventScroll: true });
                  }
                }),
                onPointerLeave: composeEventHandlers(itemProps.onPointerLeave, (event) => {
                  var _a;
                  if (event.currentTarget === document.activeElement) {
                    (_a = contentContext.onItemLeave) == null ? void 0 : _a.call(contentContext);
                  }
                }),
                onKeyDown: composeEventHandlers(itemProps.onKeyDown, (event) => {
                  var _a;
                  const isTypingAhead = ((_a = contentContext.searchRef) == null ? void 0 : _a.current) !== "";
                  if (isTypingAhead && event.key === " ") return;
                  if (SELECTION_KEYS.includes(event.key)) handleSelect();
                  if (event.key === " ") event.preventDefault();
                })
              }
            )
          }
        )
      }
    );
  }
);
SelectItem$1.displayName = ITEM_NAME;
var ITEM_TEXT_NAME = "SelectItemText";
var SelectItemText = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, className, style, ...itemTextProps } = props;
    const context = useSelectContext(ITEM_TEXT_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ITEM_TEXT_NAME, __scopeSelect);
    const itemContext = useSelectItemContext(ITEM_TEXT_NAME, __scopeSelect);
    const nativeOptionsContext = useSelectNativeOptionsContext(ITEM_TEXT_NAME, __scopeSelect);
    const [itemTextNode, setItemTextNode] = reactExports.useState(null);
    const composedRefs = useComposedRefs(
      forwardedRef,
      (node) => setItemTextNode(node),
      itemContext.onItemTextChange,
      (node) => {
        var _a;
        return (_a = contentContext.itemTextRefCallback) == null ? void 0 : _a.call(contentContext, node, itemContext.value, itemContext.disabled);
      }
    );
    const textContent = itemTextNode == null ? void 0 : itemTextNode.textContent;
    const nativeOption = reactExports.useMemo(
      () => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: itemContext.value, disabled: itemContext.disabled, children: textContent }, itemContext.value),
      [itemContext.disabled, itemContext.value, textContent]
    );
    const { onNativeOptionAdd, onNativeOptionRemove } = nativeOptionsContext;
    useLayoutEffect2(() => {
      onNativeOptionAdd(nativeOption);
      return () => onNativeOptionRemove(nativeOption);
    }, [onNativeOptionAdd, onNativeOptionRemove, nativeOption]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { id: itemContext.textId, ...itemTextProps, ref: composedRefs }),
      itemContext.isSelected && context.valueNode && !context.valueNodeHasChildren ? reactDomExports.createPortal(itemTextProps.children, context.valueNode) : null
    ] });
  }
);
SelectItemText.displayName = ITEM_TEXT_NAME;
var ITEM_INDICATOR_NAME = "SelectItemIndicator";
var SelectItemIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...itemIndicatorProps } = props;
    const itemContext = useSelectItemContext(ITEM_INDICATOR_NAME, __scopeSelect);
    return itemContext.isSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { "aria-hidden": true, ...itemIndicatorProps, ref: forwardedRef }) : null;
  }
);
SelectItemIndicator.displayName = ITEM_INDICATOR_NAME;
var SCROLL_UP_BUTTON_NAME = "SelectScrollUpButton";
var SelectScrollUpButton$1 = reactExports.forwardRef((props, forwardedRef) => {
  const contentContext = useSelectContentContext(SCROLL_UP_BUTTON_NAME, props.__scopeSelect);
  const viewportContext = useSelectViewportContext(SCROLL_UP_BUTTON_NAME, props.__scopeSelect);
  const [canScrollUp, setCanScrollUp] = reactExports.useState(false);
  const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);
  useLayoutEffect2(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      let handleScroll2 = function() {
        const canScrollUp2 = viewport.scrollTop > 0;
        setCanScrollUp(canScrollUp2);
      };
      const viewport = contentContext.viewport;
      handleScroll2();
      viewport.addEventListener("scroll", handleScroll2);
      return () => viewport.removeEventListener("scroll", handleScroll2);
    }
  }, [contentContext.viewport, contentContext.isPositioned]);
  return canScrollUp ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectScrollButtonImpl,
    {
      ...props,
      ref: composedRefs,
      onAutoScroll: () => {
        const { viewport, selectedItem } = contentContext;
        if (viewport && selectedItem) {
          viewport.scrollTop = viewport.scrollTop - selectedItem.offsetHeight;
        }
      }
    }
  ) : null;
});
SelectScrollUpButton$1.displayName = SCROLL_UP_BUTTON_NAME;
var SCROLL_DOWN_BUTTON_NAME = "SelectScrollDownButton";
var SelectScrollDownButton$1 = reactExports.forwardRef((props, forwardedRef) => {
  const contentContext = useSelectContentContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeSelect);
  const viewportContext = useSelectViewportContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeSelect);
  const [canScrollDown, setCanScrollDown] = reactExports.useState(false);
  const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);
  useLayoutEffect2(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      let handleScroll2 = function() {
        const maxScroll = viewport.scrollHeight - viewport.clientHeight;
        const canScrollDown2 = Math.ceil(viewport.scrollTop) < maxScroll;
        setCanScrollDown(canScrollDown2);
      };
      const viewport = contentContext.viewport;
      handleScroll2();
      viewport.addEventListener("scroll", handleScroll2);
      return () => viewport.removeEventListener("scroll", handleScroll2);
    }
  }, [contentContext.viewport, contentContext.isPositioned]);
  return canScrollDown ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectScrollButtonImpl,
    {
      ...props,
      ref: composedRefs,
      onAutoScroll: () => {
        const { viewport, selectedItem } = contentContext;
        if (viewport && selectedItem) {
          viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
        }
      }
    }
  ) : null;
});
SelectScrollDownButton$1.displayName = SCROLL_DOWN_BUTTON_NAME;
var SelectScrollButtonImpl = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeSelect, onAutoScroll, ...scrollIndicatorProps } = props;
  const contentContext = useSelectContentContext("SelectScrollButton", __scopeSelect);
  const autoScrollTimerRef = reactExports.useRef(null);
  const getItems = useCollection(__scopeSelect);
  const clearAutoScrollTimer = reactExports.useCallback(() => {
    if (autoScrollTimerRef.current !== null) {
      window.clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    return () => clearAutoScrollTimer();
  }, [clearAutoScrollTimer]);
  useLayoutEffect2(() => {
    var _a;
    const activeItem = getItems().find((item) => item.ref.current === document.activeElement);
    (_a = activeItem == null ? void 0 : activeItem.ref.current) == null ? void 0 : _a.scrollIntoView({ block: "nearest" });
  }, [getItems]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "aria-hidden": true,
      ...scrollIndicatorProps,
      ref: forwardedRef,
      style: { flexShrink: 0, ...scrollIndicatorProps.style },
      onPointerDown: composeEventHandlers(scrollIndicatorProps.onPointerDown, () => {
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
        }
      }),
      onPointerMove: composeEventHandlers(scrollIndicatorProps.onPointerMove, () => {
        var _a;
        (_a = contentContext.onItemLeave) == null ? void 0 : _a.call(contentContext);
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
        }
      }),
      onPointerLeave: composeEventHandlers(scrollIndicatorProps.onPointerLeave, () => {
        clearAutoScrollTimer();
      })
    }
  );
});
var SEPARATOR_NAME = "SelectSeparator";
var SelectSeparator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...separatorProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { "aria-hidden": true, ...separatorProps, ref: forwardedRef });
  }
);
SelectSeparator.displayName = SEPARATOR_NAME;
var ARROW_NAME = "SelectArrow";
var SelectArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeSelect);
    const context = useSelectContext(ARROW_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ARROW_NAME, __scopeSelect);
    return context.open && contentContext.position === "popper" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow, { ...popperScope, ...arrowProps, ref: forwardedRef }) : null;
  }
);
SelectArrow.displayName = ARROW_NAME;
var BUBBLE_INPUT_NAME = "SelectBubbleInput";
var SelectBubbleInput = reactExports.forwardRef(
  ({ __scopeSelect, value, ...props }, forwardedRef) => {
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const prevValue = usePrevious(value);
    reactExports.useEffect(() => {
      const select = ref.current;
      if (!select) return;
      const selectProto = window.HTMLSelectElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        selectProto,
        "value"
      );
      const setValue = descriptor.set;
      if (prevValue !== value && setValue) {
        const event = new Event("change", { bubbles: true });
        setValue.call(select, value);
        select.dispatchEvent(event);
      }
    }, [prevValue, value]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.select,
      {
        ...props,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style },
        ref: composedRefs,
        defaultValue: value
      }
    );
  }
);
SelectBubbleInput.displayName = BUBBLE_INPUT_NAME;
function shouldShowPlaceholder(value) {
  return value === "" || value === void 0;
}
function useTypeaheadSearch(onSearchChange) {
  const handleSearchChange = useCallbackRef(onSearchChange);
  const searchRef = reactExports.useRef("");
  const timerRef = reactExports.useRef(0);
  const handleTypeaheadSearch = reactExports.useCallback(
    (key) => {
      const search = searchRef.current + key;
      handleSearchChange(search);
      (function updateSearch(value) {
        searchRef.current = value;
        window.clearTimeout(timerRef.current);
        if (value !== "") timerRef.current = window.setTimeout(() => updateSearch(""), 1e3);
      })(search);
    },
    [handleSearchChange]
  );
  const resetTypeahead = reactExports.useCallback(() => {
    searchRef.current = "";
    window.clearTimeout(timerRef.current);
  }, []);
  reactExports.useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);
  return [searchRef, handleTypeaheadSearch, resetTypeahead];
}
function findNextItem(items, search, currentItem) {
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0]);
  const normalizedSearch = isRepeated ? search[0] : search;
  const currentItemIndex = currentItem ? items.indexOf(currentItem) : -1;
  let wrappedItems = wrapArray(items, Math.max(currentItemIndex, 0));
  const excludeCurrentItem = normalizedSearch.length === 1;
  if (excludeCurrentItem) wrappedItems = wrappedItems.filter((v) => v !== currentItem);
  const nextItem = wrappedItems.find(
    (item) => item.textValue.toLowerCase().startsWith(normalizedSearch.toLowerCase())
  );
  return nextItem !== currentItem ? nextItem : void 0;
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
var Root2 = Select$1;
var Trigger = SelectTrigger$1;
var Value = SelectValue$1;
var Icon = SelectIcon;
var Portal = SelectPortal;
var Content2 = SelectContent$1;
var Viewport = SelectViewport;
var Item = SelectItem$1;
var ItemText = SelectItemText;
var ItemIndicator = SelectItemIndicator;
var ScrollUpButton = SelectScrollUpButton$1;
var ScrollDownButton = SelectScrollDownButton$1;
function Select({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2, { "data-slot": "select", ...props });
}
function SelectValue({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Value, { "data-slot": "select-value", ...props });
}
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Trigger,
    {
      "data-slot": "select-trigger",
      "data-size": size,
      className: cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-4 opacity-50" }) })
      ]
    }
  );
}
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Content2,
    {
      "data-slot": "select-content",
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      ),
      position,
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollUpButton, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Viewport,
          {
            className: cn(
              "p-1",
              position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
            ),
            children
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollDownButton, {})
      ]
    }
  ) });
}
function SelectItem({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Item,
    {
      "data-slot": "select-item",
      className: cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute right-2 flex size-3.5 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ItemText, { children })
      ]
    }
  );
}
function SelectScrollUpButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollUpButton,
    {
      "data-slot": "select-scroll-up-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "size-4" })
    }
  );
}
function SelectScrollDownButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollDownButton,
    {
      "data-slot": "select-scroll-down-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-4" })
    }
  );
}
function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "textarea",
    {
      "data-slot": "textarea",
      className: cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    }
  );
}
var COLLAPSIBLE_NAME = "Collapsible";
var [createCollapsibleContext] = createContextScope(COLLAPSIBLE_NAME);
var [CollapsibleProvider, useCollapsibleContext] = createCollapsibleContext(COLLAPSIBLE_NAME);
var Collapsible$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeCollapsible,
      open: openProp,
      defaultOpen,
      disabled,
      onOpenChange,
      ...collapsibleProps
    } = props;
    const [open, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen ?? false,
      onChange: onOpenChange,
      caller: COLLAPSIBLE_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CollapsibleProvider,
      {
        scope: __scopeCollapsible,
        disabled,
        contentId: useId(),
        open,
        onOpenToggle: reactExports.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            "data-state": getState(open),
            "data-disabled": disabled ? "" : void 0,
            ...collapsibleProps,
            ref: forwardedRef
          }
        )
      }
    );
  }
);
Collapsible$1.displayName = COLLAPSIBLE_NAME;
var TRIGGER_NAME = "CollapsibleTrigger";
var CollapsibleTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeCollapsible, ...triggerProps } = props;
    const context = useCollapsibleContext(TRIGGER_NAME, __scopeCollapsible);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        "aria-controls": context.contentId,
        "aria-expanded": context.open || false,
        "data-state": getState(context.open),
        "data-disabled": context.disabled ? "" : void 0,
        disabled: context.disabled,
        ...triggerProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }
);
CollapsibleTrigger$1.displayName = TRIGGER_NAME;
var CONTENT_NAME = "CollapsibleContent";
var CollapsibleContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { forceMount, ...contentProps } = props;
    const context = useCollapsibleContext(CONTENT_NAME, props.__scopeCollapsible);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: ({ present }) => /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContentImpl, { ...contentProps, ref: forwardedRef, present }) });
  }
);
CollapsibleContent$1.displayName = CONTENT_NAME;
var CollapsibleContentImpl = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeCollapsible, present, children, ...contentProps } = props;
  const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible);
  const [isPresent, setIsPresent] = reactExports.useState(present);
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const heightRef = reactExports.useRef(0);
  const height = heightRef.current;
  const widthRef = reactExports.useRef(0);
  const width = widthRef.current;
  const isOpen = context.open || isPresent;
  const isMountAnimationPreventedRef = reactExports.useRef(isOpen);
  const originalStylesRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
    return () => cancelAnimationFrame(rAF);
  }, []);
  useLayoutEffect2(() => {
    const node = ref.current;
    if (node) {
      originalStylesRef.current = originalStylesRef.current || {
        transitionDuration: node.style.transitionDuration,
        animationName: node.style.animationName
      };
      node.style.transitionDuration = "0s";
      node.style.animationName = "none";
      const rect = node.getBoundingClientRect();
      heightRef.current = rect.height;
      widthRef.current = rect.width;
      if (!isMountAnimationPreventedRef.current) {
        node.style.transitionDuration = originalStylesRef.current.transitionDuration;
        node.style.animationName = originalStylesRef.current.animationName;
      }
      setIsPresent(present);
    }
  }, [context.open, present]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "data-state": getState(context.open),
      "data-disabled": context.disabled ? "" : void 0,
      id: context.contentId,
      hidden: !isOpen,
      ...contentProps,
      ref: composedRefs,
      style: {
        [`--radix-collapsible-content-height`]: height ? `${height}px` : void 0,
        [`--radix-collapsible-content-width`]: width ? `${width}px` : void 0,
        ...props.style
      },
      children: isOpen && children
    }
  );
});
function getState(open) {
  return open ? "open" : "closed";
}
var Root = Collapsible$1;
function Collapsible({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, { "data-slot": "collapsible", ...props });
}
function CollapsibleTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CollapsibleTrigger$1,
    {
      "data-slot": "collapsible-trigger",
      ...props
    }
  );
}
function CollapsibleContent({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CollapsibleContent$1,
    {
      "data-slot": "collapsible-content",
      ...props
    }
  );
}
const MAX_NFTS = 8;
const UPLOAD_SLOT_IDX = 4;
function buildAdminGrid(nfts) {
  if (!Array.isArray(nfts)) {
    console.error("INVALID NFT INPUT:", nfts);
    return [];
  }
  const safeNfts = nfts.filter((item) => item != null);
  const slots = [];
  let nftIdx = 0;
  for (let i = 0; i < safeNfts.length + 1; i++) {
    if (i === 0) {
      slots.push({ kind: "upload" });
    } else if (nftIdx < safeNfts.length) {
      slots.push({ kind: "nft", nft: safeNfts[nftIdx++] });
    }
  }
  return slots;
}
async function computeSha256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function buildGrid(nfts) {
  const safeNfts = nfts.filter((item) => item != null);
  const slots = [];
  let nftIdx = 0;
  for (let i = 0; i < 9; i++) {
    if (i === UPLOAD_SLOT_IDX) {
      slots.push({ kind: "upload" });
    } else if (nftIdx < safeNfts.length) {
      slots.push({ kind: "nft", nft: safeNfts[nftIdx++] });
    } else {
      slots.push({ kind: "empty" });
    }
  }
  return slots;
}
function EmptySlot({ idx }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "aspect-square rounded-xl border-2 border-dashed border-border/40 bg-muted/20",
      "data-ocid": `home.empty_slot.${idx}`
    }
  );
}
function NftGridCard({
  nft,
  slotNumber,
  onSelect,
  isDeleting,
  isBurning,
  isNewlyMinted
}) {
  var _a;
  const [imgError, setImgError] = reactExports.useState(false);
  const imgUrl = ((_a = nft.imageBlob) == null ? void 0 : _a.getDirectURL()) ?? "";
  const handleClick = reactExports.useCallback(() => onSelect(nft), [onSelect, nft]);
  const deleting = isDeleting ?? false;
  const burning = isBurning ?? false;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: `aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out ${deleting || burning ? "opacity-0 scale-95" : isNewlyMinted ? "animate-nft-enter" : ""} ${burning ? "ring-2 ring-red-500" : ""}`,
      onClick: handleClick,
      "aria-label": `View NFT: ${nft.title}`,
      "data-ocid": `home.nft_card.item.${slotNumber}`,
      children: [
        burning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-red-500/30 z-10 pointer-events-none transition-opacity duration-300" }),
        imgError ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ImageOff, { className: "text-muted-foreground text-xl" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "No image" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: imgUrl,
            alt: nft.title,
            className: "absolute inset-0 w-full h-full object-contain transition-transform duration-200 group-hover:scale-105",
            onError: () => setImgError(true)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-white truncate", children: nft.title }) })
      ]
    }
  );
}
function UploadCard({
  collections,
  onMint,
  isMinting,
  mintError,
  setMintError,
  mintSuccessSignal,
  mintDialogOpen,
  setMintDialogOpen,
  isAuthenticated,
  actor,
  profileReady
}) {
  const fileInputRef = reactExports.useRef(null);
  const [file, setFile] = reactExports.useState(null);
  const [preview, setPreview] = reactExports.useState(null);
  const [title, setTitle] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [edition, setEdition] = reactExports.useState("1/1");
  const [collectionId, setCollectionId] = reactExports.useState("");
  const [businessName, setBusinessName] = reactExports.useState("");
  const [website, setWebsite] = reactExports.useState("");
  const [discountCode, setDiscountCode] = reactExports.useState("");
  const [membershipId, setMembershipId] = reactExports.useState("");
  const [showAdvanced, setShowAdvanced] = reactExports.useState(false);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    if (mintSuccessSignal > 0) {
      setMintDialogOpen(false);
      setFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      setEdition("1/1");
      setCollectionId("");
      setBusinessName("");
      setWebsite("");
      setDiscountCode("");
      setMembershipId("");
      setShowAdvanced(false);
      setMintError(null);
    }
  }, [mintSuccessSignal, setMintError, setMintDialogOpen]);
  const handleFile = reactExports.useCallback(
    (f) => {
      if (isMinting) return;
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(f.type)) {
        ue.error("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        ue.error("File must be under 5MB.");
        return;
      }
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setMintDialogOpen(true);
    },
    [setMintDialogOpen, isMinting]
  );
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOver(false);
    if (isMinting) return;
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isMinting) return;
    dragCounterRef.current += 1;
    setDragOver(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragOver(false);
    }
  }
  function handleMint() {
    if (!file || !title.trim()) return;
    if (!isAuthenticated || !actor || !profileReady) {
      ue.error("Connect your wallet to mint NFTs.");
      return;
    }
    onMint({
      file,
      title,
      description,
      edition: edition || "1/1",
      collectionId: collectionId ? BigInt(collectionId) : void 0,
      businessName: businessName.trim() || void 0,
      website: website.trim() || void 0,
      discountCode: discountCode.trim() || void 0,
      membershipId: membershipId.trim() || void 0
    });
  }
  function resetForm() {
    setMintDialogOpen(false);
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setEdition("1/1");
    setCollectionId("");
    setBusinessName("");
    setWebsite("");
    setDiscountCode("");
    setMembershipId("");
    setShowAdvanced(false);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: `aspect-square rounded-xl border-2 border-dashed transition-colors duration-200 flex flex-col items-center justify-center gap-1.5 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isMinting ? "opacity-50 cursor-not-allowed border-muted bg-muted/20" : dragOver ? "border-primary bg-primary/10" : "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"}`,
        onClick: () => {
          var _a;
          return !isMinting && ((_a = fileInputRef.current) == null ? void 0 : _a.click());
        },
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        "aria-label": "Upload and mint NFT",
        "data-ocid": "home.upload_card",
        children: isMinting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin text-muted-foreground text-lg" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Minting..." })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "text-primary text-lg" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-primary font-medium text-center leading-tight", children: [
            "Drag & Drop",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "to Mint"
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: "image/png,image/jpeg,image/webp",
        className: "hidden",
        onChange: (e) => {
          var _a;
          const f = (_a = e.target.files) == null ? void 0 : _a[0];
          if (f) handleFile(f);
          e.target.value = "";
        },
        "data-ocid": "home.file_input"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: mintDialogOpen,
        onOpenChange: (v) => {
          if (!v) {
            setMintDialogOpen(false);
            setFile(null);
            setPreview(null);
            setTitle("");
            setDescription("");
            setEdition("1/1");
            setCollectionId("");
            setBusinessName("");
            setWebsite("");
            setDiscountCode("");
            setMembershipId("");
            setShowAdvanced(false);
            setMintError(null);
          }
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DialogContent,
          {
            className: "max-w-sm mx-4 rounded-2xl max-h-[90vh] overflow-y-auto",
            "data-ocid": "home.mint_dialog",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Mint New NFT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "sr-only", children: "Fill in the details below to mint your NFT on-chain." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
                preview && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-video rounded-xl overflow-hidden bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: preview,
                    alt: "Preview",
                    className: "w-full h-full object-contain"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: "mint-title", children: [
                    "Title ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      id: "mint-title",
                      value: title,
                      onChange: (e) => setTitle(e.target.value.slice(0, 100)),
                      placeholder: "NFT title",
                      maxLength: 100,
                      "data-ocid": "home.mint_title_input"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-edition", children: "Edition" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      id: "mint-edition",
                      value: edition,
                      onChange: (e) => setEdition(e.target.value.slice(0, 20)),
                      placeholder: "1/1",
                      maxLength: 20,
                      "data-ocid": "home.mint_edition_input"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-desc", children: "Description" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Textarea,
                    {
                      id: "mint-desc",
                      value: description,
                      onChange: (e) => setDescription(e.target.value.slice(0, 1e3)),
                      placeholder: "Optional description",
                      rows: 2,
                      maxLength: 1e3,
                      "data-ocid": "home.mint_desc_input"
                    }
                  )
                ] }),
                collections.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Collection (optional)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: collectionId, onValueChange: setCollectionId, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "data-ocid": "home.mint_collection_select", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select collection" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "None" }),
                      collections.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: c.id.toString(), children: [
                        c.name,
                        " (",
                        c.nftCount.toString(),
                        "/",
                        c.maxSize.toString(),
                        ")"
                      ] }, c.id.toString()))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Collapsible, { open: showAdvanced, onOpenChange: setShowAdvanced, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: "flex items-center gap-1.5 text-xs text-primary hover:underline",
                      "data-ocid": "home.mint_advanced_toggle",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          ChevronDown,
                          {
                            className: `transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`
                          }
                        ),
                        showAdvanced ? "Hide Advanced Metadata" : "Advanced Metadata"
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(CollapsibleContent, { className: "space-y-3 pt-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-business", children: "Business Name" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          id: "mint-business",
                          value: businessName,
                          onChange: (e) => setBusinessName(e.target.value.slice(0, 100)),
                          placeholder: "Optional business name",
                          maxLength: 100,
                          "data-ocid": "home.mint_business_input"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-website", children: "Website / URL" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          id: "mint-website",
                          value: website,
                          onChange: (e) => setWebsite(e.target.value.slice(0, 500)),
                          placeholder: "https://example.com",
                          maxLength: 500,
                          "data-ocid": "home.mint_website_input"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-discount", children: "Discount Code" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          id: "mint-discount",
                          value: discountCode,
                          onChange: (e) => setDiscountCode(e.target.value.slice(0, 50)),
                          placeholder: "Optional discount code",
                          maxLength: 50,
                          "data-ocid": "home.mint_discount_input"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "mint-membership", children: "Membership / Receipt / Ticket ID" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Input,
                        {
                          id: "mint-membership",
                          value: membershipId,
                          onChange: (e) => setMembershipId(e.target.value.slice(0, 100)),
                          placeholder: "Optional membership ID",
                          maxLength: 100,
                          "data-ocid": "home.mint_membership_input"
                        }
                      )
                    ] })
                  ] })
                ] }),
                mintError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "rounded-lg border border-destructive/30 bg-destructive/5 p-2.5",
                    "data-ocid": "home.mint_error_state",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive font-medium", children: mintError })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    onClick: resetForm,
                    disabled: isMinting,
                    "data-ocid": "home.mint_cancel_button",
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    onClick: handleMint,
                    disabled: !title.trim() || isMinting || !isAuthenticated || !actor || !profileReady,
                    "data-ocid": "home.mint_submit_button",
                    children: isMinting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin mr-2" }),
                      "Minting..."
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Hammer, { className: "mr-2" }),
                      "Mint"
                    ] })
                  }
                )
              ] })
            ]
          }
        )
      }
    )
  ] });
}
function HomePage() {
  var _a;
  useNavigate();
  const {
    isAuthenticated,
    actor,
    principal,
    authState,
    profileReady,
    creatorId
  } = useAuth();
  const { isAdmin, isAdminLoading, canMint } = usePermissions();
  const queryClient = useQueryClient();
  useCreateSlot();
  const [mintDialogOpen, setMintDialogOpen] = reactExports.useState(false);
  const [selectedNft, setSelectedNft] = reactExports.useState(null);
  const [uploadProgress, setUploadProgress] = reactExports.useState(0);
  const [mintError, setMintError] = reactExports.useState(null);
  const [mintSuccessSignal, setMintSuccessSignal] = reactExports.useState(0);
  const [mintTransition, setMintTransition] = reactExports.useState({ stage: "idle" });
  const [mintedClaimUrl, setMintedClaimUrl] = reactExports.useState(null);
  const [mintOverlayDismissVisible, setMintOverlayDismissVisible] = reactExports.useState(false);
  const [deletingTokenIds, setDeletingTokenIds] = reactExports.useState(
    /* @__PURE__ */ new Set()
  );
  const [burningTokenIds, setBurningTokenIds] = reactExports.useState(
    /* @__PURE__ */ new Set()
  );
  const [newlyMintedTokenId, setNewlyMintedTokenId] = reactExports.useState(
    null
  );
  const [slotFlash, setSlotFlash] = reactExports.useState(null);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [debouncedSearch, setDebouncedSearch] = reactExports.useState("");
  const isSearchActive = debouncedSearch.trim().length > 0;
  reactExports.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  reactExports.useEffect(() => {
    if (mintTransition.stage === "minting") {
      const t1 = setTimeout(() => setMintOverlayDismissVisible(true), 1e4);
      const t2 = setTimeout(() => {
        setMintTransition({ stage: "idle" });
        setMintOverlayDismissVisible(false);
      }, 95e3);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    setMintOverlayDismissVisible(false);
  }, [mintTransition.stage]);
  const { data: nfts = [], isLoading } = useMyActiveNfts();
  const { data: searchResults = [], isLoading: isSearchLoading } = useSearchNfts(debouncedSearch.trim(), isAdmin && isSearchActive);
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listMyCollections();
      return result;
    },
    enabled: !!actor && isAuthenticated && mintDialogOpen
  });
  useQuery({
    queryKey: ["slotsStatus"],
    queryFn: async () => {
      if (!actor) return null;
      const act = actor;
      return act.getSlotsStatus ? act.getSlotsStatus() : null;
    },
    enabled: !!actor && isAuthenticated
  });
  const { data: canisterId } = useQuery({
    queryKey: ["canisterId"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getCanisterId();
    },
    enabled: !!actor && isAuthenticated
  });
  const { addNotification } = useNotifications();
  const generateClaimLinkForAdmin = useGenerateClaimLink();
  const mintMutation = useMutation({
    mutationFn: async (params) => {
      var _a2;
      if (!actor) throw new Error("Not authenticated");
      const bytes = new Uint8Array(await params.file.arrayBuffer());
      const assetHash = await computeSha256(params.file);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
        (pct) => setUploadProgress(pct)
      );
      const mintPromise = actor.mintNft(
        blob,
        assetHash,
        params.title.trim(),
        params.description.trim(),
        params.edition.trim() || "1/1",
        params.collectionId ?? null,
        params.businessName ?? null,
        params.website ?? null,
        params.discountCode ?? null,
        params.membershipId ?? null
      );
      const timeout = new Promise(
        (_, reject) => setTimeout(
          () => reject(
            new Error(
              "Upload timed out. Please try a smaller file or check your connection."
            )
          ),
          9e4
        )
      );
      const result = await Promise.race([mintPromise, timeout]);
      if (result && typeof result === "object" && "__kind__" in result && result.__kind__ === "err") {
        throw new Error(
          ((_a2 = result.err) == null ? void 0 : _a2.message) || result.err || "Mint failed"
        );
      }
      return result;
    },
    onMutate: () => {
      setMintError(null);
      setMintTransition({
        stage: "minting",
        message: "Minting your NFT on-chain..."
      });
    },
    onSuccess: (result) => {
      const ok = result == null ? void 0 : result.ok;
      const tokenId = (ok == null ? void 0 : ok.tokenId) ?? (ok == null ? void 0 : ok.id);
      const tokenIdNum = tokenId !== void 0 && tokenId !== 0n ? Number(tokenId) : null;
      const tokenIdStr = tokenIdNum !== null ? tokenIdNum.toString() : void 0;
      const nftUniqueId = ok == null ? void 0 : ok.nftUniqueId;
      setMintTransition({
        stage: "success",
        message: tokenIdStr ? `Token ID: ${tokenIdStr} minted successfully!` : "NFT minted successfully!"
      });
      addNotification({
        type: "info",
        title: "NFT Minted",
        message: tokenIdStr ? `Token ID: ${tokenIdStr} created successfully${nftUniqueId ? ` (Unique ID: ${nftUniqueId})` : ""}` : "NFT created successfully"
      });
      setUploadProgress(0);
      setMintError(null);
      setMintSuccessSignal((n) => n + 1);
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      queryClient.invalidateQueries({ queryKey: ["allMyNfts"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      if (tokenIdNum !== null) {
        setNewlyMintedTokenId(tokenIdNum);
        setSlotFlash("mint");
        setTimeout(() => setNewlyMintedTokenId(null), 1e3);
        setTimeout(() => setSlotFlash(null), 600);
      }
      if (canMint && nftUniqueId && (ok == null ? void 0 : ok.id) !== void 0) {
        generateClaimLinkForAdmin.mutateAsync(ok.id).then((url) => {
          setMintedClaimUrl(url);
        }).catch((err) => {
          console.warn(
            "[Admin] Auto-generate claim link failed (non-critical):",
            err
          );
          setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
        });
      } else {
        setTimeout(() => setMintTransition({ stage: "idle" }), 2500);
      }
    },
    onError: (err) => {
      addNotification({
        type: "critical",
        title: "Mint Failed",
        message: err.message || "Mint failed. Please try again."
      });
      setUploadProgress(0);
      setMintError(err.message || "Mint failed. Please try again.");
      setMintTransition({
        stage: "error",
        message: err.message || "Mint failed. Please try again."
      });
      setTimeout(() => setMintTransition({ stage: "idle" }), 4e3);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteNft(id);
    },
    onMutate: (id) => {
      const tokenIdNum = Number(id);
      setDeletingTokenIds((prev) => new Set(prev).add(tokenIdNum));
    },
    onSuccess: (_data, id) => {
      addNotification({
        type: "info",
        title: "NFT Deleted",
        message: "NFT has been deleted successfully."
      });
      setSelectedNft(null);
      queryClient.setQueryData(["myActiveNfts"], (old) => {
        if (!old) return old;
        return old.filter((nft) => nft.id !== id);
      });
      const tokenIdNum = Number(id);
      setTimeout(() => {
        setDeletingTokenIds((prev) => {
          const next = new Set(prev);
          next.delete(tokenIdNum);
          return next;
        });
      }, 300);
    },
    onError: (err, id) => {
      addNotification({
        type: "critical",
        title: "Delete Failed",
        message: err.message || "Failed to delete NFT."
      });
      const tokenIdNum = Number(id);
      setDeletingTokenIds((prev) => {
        const next = new Set(prev);
        next.delete(tokenIdNum);
        return next;
      });
    }
  });
  const burnMutation = useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.burnNft(id);
    },
    onMutate: (id) => {
      const tokenIdNum = Number(id);
      setBurningTokenIds((prev) => new Set(prev).add(tokenIdNum));
    },
    onSuccess: (_data, id) => {
      addNotification({
        type: "critical",
        title: "NFT Burned",
        message: "NFT has been permanently destroyed."
      });
      setSelectedNft(null);
      queryClient.setQueryData(["myActiveNfts"], (old) => {
        if (!old) return old;
        return old.filter((nft) => nft.id !== id);
      });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["slotsStatus"] });
      const tokenIdNum = Number(id);
      setSlotFlash("burn");
      setTimeout(() => {
        setBurningTokenIds((prev) => {
          const next = new Set(prev);
          next.delete(tokenIdNum);
          return next;
        });
      }, 300);
      setTimeout(() => setSlotFlash(null), 600);
    },
    onError: (err, id) => {
      addNotification({
        type: "critical",
        title: "Burn Failed",
        message: err.message || "Failed to burn NFT."
      });
      const tokenIdNum = Number(id);
      setBurningTokenIds((prev) => {
        const next = new Set(prev);
        next.delete(tokenIdNum);
        return next;
      });
    }
  });
  const displayNfts = isAdmin && isSearchActive ? searchResults : nfts;
  const displayLoading = isAdmin && isSearchActive ? isSearchLoading : isLoading;
  const stableNfts = reactExports.useMemo(() => displayNfts ?? [], [displayNfts]);
  const gridSlots = reactExports.useMemo(() => {
    if (isAdmin) {
      return buildAdminGrid(stableNfts);
    }
    return buildGrid(stableNfts.slice(0, MAX_NFTS));
  }, [stableNfts, isAdmin]);
  if (authState === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(BrandedAuthGate, { subtitle: "Mint, claim, and collect NFTs on the Internet Computer." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center py-20 gap-3",
          "data-ocid": "home.auth_loading_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Syncing wallet..." })
          ]
        }
      )
    ] });
  }
  if (authState === "unauthenticated") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(BrandedAuthGate, { subtitle: "Mint, claim, and collect NFTs on the Internet Computer." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center py-20 gap-3",
          "data-ocid": "home.unauthenticated_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "w-8 h-8 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center", children: "Please connect your Internet Identity to mint NFTs." })
          ]
        }
      )
    ] });
  }
  if (!profileReady) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(BrandedAuthGate, { subtitle: "Mint, claim, and collect NFTs on the Internet Computer." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center py-20 gap-3",
          "data-ocid": "home.profile_loading_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Creating profile..." })
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-3 max-w-xl mx-auto w-full pb-24", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(BrandedAuthGate, { subtitle: "Mint, claim, and collect NFTs on the Internet Computer." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "bg-card border border-border rounded-xl p-3",
        "data-ocid": "home.start_here_section",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Start Here" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "Mint NFT" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "Verify NFT" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-1 rounded-lg bg-primary/5 border border-primary/10 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold", children: "3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground text-center leading-tight", children: "View Profile" })
            ] })
          ] })
        ]
      }
    ),
    isAuthenticated && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between -mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: `text-xs transition-colors duration-600 ${slotFlash === "mint" ? "text-green-400" : slotFlash === "burn" ? "text-amber-400" : "text-muted-foreground"}`,
        children: isAdmin ? "Admin Mode — Unlimited Slots" : "NFTs are organized by Slots (Collections)"
      }
    ) }),
    isAuthenticated && isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", "data-ocid": "home.search_bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          type: "text",
          placeholder: "Search NFTs by title, business, or tags...",
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          className: "pl-9 pr-9 rounded-lg",
          "data-ocid": "home.search_input"
        }
      ),
      searchTerm && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setSearchTerm(""),
          className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
          "aria-label": "Clear search",
          "data-ocid": "home.search_clear_button",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-4 h-4" })
        }
      )
    ] }),
    isAdminLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-20 gap-3",
        "data-ocid": "home.admin_loading_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-8 h-8 animate-spin text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Loading..." })
        ]
      }
    ) : displayLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `gap-2 ${isAdmin ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid grid-cols-3"}`,
        "data-ocid": "home.loading_state",
        children: Array.from({ length: isAdmin ? 12 : 9 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "aspect-square rounded-xl" }, i)
        ))
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `gap-2 ${isAdmin ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid grid-cols-3"}`,
        "data-ocid": "home.grid",
        children: gridSlots.map((slot, i) => {
          const nftSlotNumber = isAdmin ? i : i < UPLOAD_SLOT_IDX ? i + 1 : i;
          if (slot.kind === "upload") {
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              UploadCard,
              {
                collections,
                onMint: (params) => mintMutation.mutate(params),
                isMinting: mintMutation.isPending,
                uploadProgress,
                mintError,
                setMintError,
                mintDialogOpen,
                setMintDialogOpen,
                mintSuccessSignal,
                isAuthenticated,
                actor,
                profileReady
              },
              "upload"
            );
          }
          if (slot.kind === "nft") {
            const tokenIdNum = Number(slot.nft.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              NftGridCard,
              {
                nft: slot.nft,
                slotNumber: nftSlotNumber,
                onSelect: setSelectedNft,
                isDeleting: deletingTokenIds.has(tokenIdNum),
                isBurning: burningTokenIds.has(tokenIdNum),
                isNewlyMinted: newlyMintedTokenId === tokenIdNum
              },
              slot.nft.id.toString()
            );
          }
          return /* @__PURE__ */ jsxRuntimeExports.jsx(EmptySlot, { idx: i + 1 }, `grid-empty-${i}`);
        })
      }
    ),
    mintTransition.stage !== "idle" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card border border-border rounded-2xl p-6 max-w-xs w-full mx-4 shadow-lg text-center space-y-4", children: [
      mintTransition.stage === "minting" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: mintTransition.message }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Please wait while your NFT is being minted on-chain..." }),
        mintOverlayDismissVisible && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "text-xs text-muted-foreground underline hover:text-foreground transition-colors",
            onClick: () => {
              setMintTransition({ stage: "idle" });
              setMintOverlayDismissVisible(false);
            },
            children: "Taking too long? Dismiss"
          }
        )
      ] }),
      mintTransition.stage === "success" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "text-green-500 text-xl" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: mintTransition.message }),
        mintedClaimUrl && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-2 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wide", children: "Claim Link" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 bg-muted/60 rounded-lg px-2 py-1.5 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-xs text-foreground truncate flex-1 font-mono",
              "data-ocid": "mint.claim_url",
              children: mintedClaimUrl
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "outline",
                size: "sm",
                className: "flex-1 text-xs",
                "data-ocid": "mint.copy_claim_url_button",
                onClick: () => {
                  navigator.clipboard.writeText(mintedClaimUrl).then(() => {
                    ue.success("Claim link copied!");
                  });
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "mr-1 h-3 w-3" }),
                  "Copy"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "default",
                size: "sm",
                className: "flex-1 text-xs",
                "data-ocid": "mint.open_claim_page_button",
                onClick: () => window.open(mintedClaimUrl, "_blank"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "mr-1 h-3 w-3" }),
                  "Open"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              className: "w-full text-xs text-muted-foreground",
              "data-ocid": "mint.success_dismiss_button",
              onClick: () => {
                setMintTransition({ stage: "idle" });
                setMintedClaimUrl(null);
              },
              children: "Done"
            }
          )
        ] }),
        !mintedClaimUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Redirecting…" })
      ] }),
      mintTransition.stage === "error" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "text-destructive text-xl" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-destructive", children: mintTransition.message }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            onClick: () => setMintTransition({ stage: "idle" }),
            children: "Dismiss"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NftDetailModal,
      {
        nft: selectedNft,
        open: !!selectedNft,
        onClose: () => setSelectedNft(null),
        onDelete: (id) => deleteMutation.mutate(id),
        onBurn: async (id) => {
          burnMutation.mutate(id);
        },
        isDeleting: deleteMutation.isPending,
        isBurning: burnMutation.isPending,
        callerPrincipal: principal ?? "",
        canisterId: canisterId ?? ""
      },
      ((_a = selectedNft == null ? void 0 : selectedNft.id) == null ? void 0 : _a.toString()) ?? "none"
    )
  ] });
}
export {
  HomePage as default
};
