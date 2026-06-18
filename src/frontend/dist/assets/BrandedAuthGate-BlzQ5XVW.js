import { _ as z, j as jsxRuntimeExports } from "./main-DYtxSk3m.js";
function BrandedAuthGate({ subtitle }) {
  const { resolvedTheme } = z();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "flex flex-col items-center justify-center min-h-[30vh] gap-3 px-4 text-center",
      "data-ocid": "branded_auth_gate.panel",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: resolvedTheme === "light" ? "/assets/logo-inverted.jpg" : "/assets/logo.jpg",
            alt: "ICP Mint Studio",
            className: "h-16 w-auto rounded-lg",
            loading: "eager"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "h2",
          {
            className: "text-xl font-bold text-foreground tracking-tight",
            "data-ocid": "branded_auth_gate.heading",
            children: "ICP Mint Studio"
          }
        ),
        subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "text-sm text-muted-foreground max-w-xs",
            "data-ocid": "branded_auth_gate.subtitle",
            children: subtitle
          }
        )
      ] })
    }
  );
}
export {
  BrandedAuthGate as B
};
