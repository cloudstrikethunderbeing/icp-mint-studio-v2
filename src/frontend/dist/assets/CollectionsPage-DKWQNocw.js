import { c as createLucideIcon, j as jsxRuntimeExports, r as reactExports, u as useComposedRefs, a as cn, b as buttonVariants, d as useAuth, e as useActor, f as useQueryClient, g as useQuery, B as Button, h as createActor } from "./index-C9MKyHwp.js";
import { c as composeEventHandlers, a as createSlottable, b as createContextScope } from "./index-DNcLgC-N.js";
import { R as Root, T as Trigger, W as WarningProvider, C as Content, a as Title, D as Description, b as Close, c as createDialogScope, P as Portal, O as Overlay, d as Dialog, e as DialogTrigger, f as Plus, g as DialogContent, h as DialogHeader, i as DialogTitle, j as DialogDescription, k as Textarea, l as DialogFooter, m as Trash2 } from "./textarea-2b4gyuvS.js";
import { C as Card, a as CardHeader, b as CardTitle, c as CardContent } from "./card-CVA11SiX.js";
import { I as Input } from "./input-C9Z1-ixA.js";
import { L as Label } from "./label-zgvlRdbO.js";
import { S as Skeleton } from "./skeleton-C6h9J8B3.js";
import { u as useMutation } from "./useMutation-TMkDmjUs.js";
import { L as Lock, u as ue } from "./index-Bz8oZrta.js";
import { L as Layers } from "./layers-CsaM3TAT.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
];
const Image = createLucideIcon("image", __iconNode);
var ROOT_NAME = "AlertDialog";
var [createAlertDialogContext] = createContextScope(ROOT_NAME, [
  createDialogScope
]);
var useDialogScope = createDialogScope();
var AlertDialog$1 = (props) => {
  const { __scopeAlertDialog, ...alertDialogProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, { ...dialogScope, ...alertDialogProps, modal: true });
};
AlertDialog$1.displayName = ROOT_NAME;
var TRIGGER_NAME = "AlertDialogTrigger";
var AlertDialogTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...triggerProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Trigger, { ...dialogScope, ...triggerProps, ref: forwardedRef });
  }
);
AlertDialogTrigger$1.displayName = TRIGGER_NAME;
var PORTAL_NAME = "AlertDialogPortal";
var AlertDialogPortal$1 = (props) => {
  const { __scopeAlertDialog, ...portalProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { ...dialogScope, ...portalProps });
};
AlertDialogPortal$1.displayName = PORTAL_NAME;
var OVERLAY_NAME = "AlertDialogOverlay";
var AlertDialogOverlay$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...overlayProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Overlay, { ...dialogScope, ...overlayProps, ref: forwardedRef });
  }
);
AlertDialogOverlay$1.displayName = OVERLAY_NAME;
var CONTENT_NAME = "AlertDialogContent";
var [AlertDialogContentProvider, useAlertDialogContentContext] = createAlertDialogContext(CONTENT_NAME);
var Slottable = createSlottable("AlertDialogContent");
var AlertDialogContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, children, ...contentProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    const cancelRef = reactExports.useRef(null);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WarningProvider,
      {
        contentName: CONTENT_NAME,
        titleName: TITLE_NAME,
        docsSlug: "alert-dialog",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogContentProvider, { scope: __scopeAlertDialog, cancelRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Content,
          {
            role: "alertdialog",
            ...dialogScope,
            ...contentProps,
            ref: composedRefs,
            onOpenAutoFocus: composeEventHandlers(contentProps.onOpenAutoFocus, (event) => {
              var _a;
              event.preventDefault();
              (_a = cancelRef.current) == null ? void 0 : _a.focus({ preventScroll: true });
            }),
            onPointerDownOutside: (event) => event.preventDefault(),
            onInteractOutside: (event) => event.preventDefault(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Slottable, { children }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DescriptionWarning, { contentRef })
            ]
          }
        ) })
      }
    );
  }
);
AlertDialogContent$1.displayName = CONTENT_NAME;
var TITLE_NAME = "AlertDialogTitle";
var AlertDialogTitle$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...titleProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { ...dialogScope, ...titleProps, ref: forwardedRef });
  }
);
AlertDialogTitle$1.displayName = TITLE_NAME;
var DESCRIPTION_NAME = "AlertDialogDescription";
var AlertDialogDescription$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeAlertDialog, ...descriptionProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { ...dialogScope, ...descriptionProps, ref: forwardedRef });
});
AlertDialogDescription$1.displayName = DESCRIPTION_NAME;
var ACTION_NAME = "AlertDialogAction";
var AlertDialogAction$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...actionProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...actionProps, ref: forwardedRef });
  }
);
AlertDialogAction$1.displayName = ACTION_NAME;
var CANCEL_NAME = "AlertDialogCancel";
var AlertDialogCancel$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...cancelProps } = props;
    const { cancelRef } = useAlertDialogContentContext(CANCEL_NAME, __scopeAlertDialog);
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const ref = useComposedRefs(forwardedRef, cancelRef);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...cancelProps, ref });
  }
);
AlertDialogCancel$1.displayName = CANCEL_NAME;
var DescriptionWarning = ({ contentRef }) => {
  const MESSAGE = `\`${CONTENT_NAME}\` requires a description for the component to be accessible for screen reader users.

You can add a description to the \`${CONTENT_NAME}\` by passing a \`${DESCRIPTION_NAME}\` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an \`id\` and passing the same value to the \`aria-describedby\` prop in \`${CONTENT_NAME}\`. If the description is confusing or duplicative for sighted users, you can use the \`@radix-ui/react-visually-hidden\` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog`;
  reactExports.useEffect(() => {
    var _a;
    const hasDescription = document.getElementById(
      (_a = contentRef.current) == null ? void 0 : _a.getAttribute("aria-describedby")
    );
    if (!hasDescription) console.warn(MESSAGE);
  }, [MESSAGE, contentRef]);
  return null;
};
var Root2 = AlertDialog$1;
var Trigger2 = AlertDialogTrigger$1;
var Portal2 = AlertDialogPortal$1;
var Overlay2 = AlertDialogOverlay$1;
var Content2 = AlertDialogContent$1;
var Action = AlertDialogAction$1;
var Cancel = AlertDialogCancel$1;
var Title2 = AlertDialogTitle$1;
var Description2 = AlertDialogDescription$1;
function AlertDialog({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2, { "data-slot": "alert-dialog", ...props });
}
function AlertDialogTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Trigger2, { "data-slot": "alert-dialog-trigger", ...props });
}
function AlertDialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal2, { "data-slot": "alert-dialog-portal", ...props });
}
function AlertDialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Overlay2,
    {
      "data-slot": "alert-dialog-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function AlertDialogContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogPortal, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogOverlay, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Content2,
      {
        "data-slot": "alert-dialog-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        ),
        ...props
      }
    )
  ] });
}
function AlertDialogHeader({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "alert-dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    }
  );
}
function AlertDialogFooter({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "alert-dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props
    }
  );
}
function AlertDialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Title2,
    {
      "data-slot": "alert-dialog-title",
      className: cn("text-lg font-semibold", className),
      ...props
    }
  );
}
function AlertDialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Description2,
    {
      "data-slot": "alert-dialog-description",
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}
function AlertDialogAction({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Action,
    {
      className: cn(buttonVariants(), className),
      ...props
    }
  );
}
function AlertDialogCancel({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Cancel,
    {
      className: cn(buttonVariants({ variant: "outline" }), className),
      ...props
    }
  );
}
const TIER_META = {
  free: { label: "Free", cls: "bg-muted text-muted-foreground" },
  creator: { label: "Creator", cls: "bg-primary/20 text-primary" },
  pro: { label: "Pro", cls: "bg-accent/20 text-accent-foreground" },
  org: { label: "Org", cls: "bg-secondary text-secondary-foreground" },
  admin: { label: "Admin", cls: "bg-destructive/20 text-destructive" }
};
function TierBadge({ tier }) {
  const m = TIER_META[tier] ?? {
    label: tier,
    cls: "bg-muted text-muted-foreground"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`, children: m.label });
}
function CollectionsPage() {
  const { isAuthenticated, actor } = useAuth();
  const { actor: anonActor } = useActor(createActor);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [newDesc, setNewDesc] = reactExports.useState("");
  const [expandedId, setExpandedId] = reactExports.useState(null);
  const effectiveActor = actor ?? anonActor;
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      if (!effectiveActor) return [];
      return effectiveActor.listMyCollections();
    },
    enabled: !!effectiveActor && isAuthenticated
  });
  const { data: myNfts } = useQuery({
    queryKey: ["myActiveNfts"],
    queryFn: async () => {
      if (!effectiveActor) return [];
      return effectiveActor.listMyActiveNfts();
    },
    enabled: !!effectiveActor && isAuthenticated
  });
  const createMutation = useMutation({
    mutationFn: async ({ name, desc }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createCollection(name, desc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      ue.success("Collection created");
    },
    onError: () => ue.error("Failed to create collection")
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteCollection(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myActiveNfts"] });
      queryClient.invalidateQueries({ queryKey: ["nftRegistry"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      ue.success("Collection deleted");
    },
    onError: () => ue.error("Failed to delete collection")
  });
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4",
        "data-ocid": "collections.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-10 h-10 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-center text-sm", children: "Connect your Internet Identity to view your collections." })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto px-4 py-6 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold text-foreground", children: "Collections" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: collections ? `${collections.length} of 8 collections` : "Loading..." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onOpenChange: setCreateOpen, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            disabled: !!(collections && collections.length >= 8),
            "data-ocid": "collections.open_modal_button",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
              " Create"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { "data-ocid": "collections.dialog", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "New Collection" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "sr-only", children: "Create a new collection to organise your NFTs." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "col-name", children: "Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "col-name",
                  value: newName,
                  onChange: (e) => setNewName(e.target.value),
                  placeholder: "Collection name",
                  "data-ocid": "collections.input"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "col-desc", children: "Description" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  id: "col-desc",
                  value: newDesc,
                  onChange: (e) => setNewDesc(e.target.value.slice(0, 500)),
                  placeholder: "Optional description",
                  rows: 3,
                  maxLength: 500,
                  "data-ocid": "collections.desc_input"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                type: "button",
                onClick: () => setCreateOpen(false),
                "data-ocid": "collections.cancel_button",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                onClick: () => createMutation.mutate({ name: newName, desc: newDesc }),
                disabled: !newName.trim() || createMutation.isPending,
                "data-ocid": "collections.submit_button",
                children: createMutation.isPending ? "Creating..." : "Create"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", "data-ocid": "collections.loading_state", children: [1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-24 w-full rounded-xl" }, i)) }),
    !isLoading && (!collections || collections.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-16 gap-3",
        "data-ocid": "collections.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-8 h-8 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "No collections yet. Create your first one." })
        ]
      }
    ),
    collections == null ? void 0 : collections.map((col, idx) => {
      const colNfts = (myNfts ?? []).filter(
        (n) => n.status === "active" && n.collectionId === col.id
      );
      const isExpanded = expandedId === col.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Card,
        {
          className: "rounded-2xl border border-border",
          "data-ocid": `collections.item.${idx + 1}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base font-semibold truncate", children: col.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TierBadge, { tier: col.tier })
                ] }),
                col.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5 truncate", children: col.description })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialog, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "shrink-0 text-destructive hover:text-destructive",
                    "data-ocid": `collections.delete_button.${idx + 1}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Delete Collection" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogDescription, { children: [
                      "Delete ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: col.name }),
                      "? This will remove the collection and all nested NFTs permanently."
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { "data-ocid": "collections.cancel_button", children: "Cancel" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      AlertDialogAction,
                      {
                        onClick: () => deleteMutation.mutate(col.id),
                        className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                        "data-ocid": "collections.confirm_button",
                        children: "Delete"
                      }
                    )
                  ] })
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-3 h-3 mr-1 inline" }),
                  col.nftCount.toString(),
                  " / ",
                  col.maxSize.toString(),
                  " NFTs"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "text-xs text-primary underline-offset-2 hover:underline",
                    onClick: () => setExpandedId(isExpanded ? null : col.id),
                    "data-ocid": `collections.toggle.${idx + 1}`,
                    children: isExpanded ? "Hide NFTs" : "Show NFTs"
                  }
                )
              ] }),
              isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-2", children: colNfts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "No active NFTs in this collection." }) : colNfts.map((nft, ni) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex items-center gap-2 p-2 rounded-lg bg-muted/40",
                  "data-ocid": `collections.nft.${ni + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-4 h-4 text-primary" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium truncate flex-1", children: nft.title }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: nft.edition })
                  ]
                },
                nft.id.toString()
              )) })
            ] })
          ]
        },
        col.id.toString()
      );
    })
  ] });
}
export {
  CollectionsPage as default
};
