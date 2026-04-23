---
detected_roles: [frontend-agent]
override: false
---

## Detected Roles
- **frontend-agent**: Detected via React deps, TypeScript, dapp-kit in intent. However, the AGENTS.md frontend-agent template is specialized for Next.js 16 / shadcn/ui / gRPC, which doesn't match this project (React + Vite, minimal CSS, standard SuiClient). Using a **lighter domain injection** adapted for this simpler stack.

## Domain Injection Content

You are a frontend specialist building a React + Vite developer dashboard for the hashi-sdk.

**Stack**: React 18+, Vite, TypeScript, `@mysten/dapp-kit-react`, `@tanstack/react-query`, local `hashi-sdk` workspace package.

**Key conventions**:
- Strict TypeScript, no `any` types
- Use `@mysten/dapp-kit-react` (NOT `@mysten/dapp-kit`)
- Use `SuiClient` from `@mysten/sui/client` (standard JSON-RPC client, not gRPC)
- The SDK is consumed via local workspace link: `"hashi-sdk": "file:.."`
- Devnet only: hardcoded config in a constants file
- Minimal styling — this is a developer tool, not a polished product
- All transaction builders return `(tx: Transaction) => void` closures, composed via `tx.add()`
- HashiClient facade available but standalone imports preferred for tree-shaking

**Verification**: Run `npm run dev` in the dashboard directory. The app must start without TypeScript errors.
