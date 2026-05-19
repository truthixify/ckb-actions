# CKB Action Links Specification

**Status:** Draft

## 1. Overview

CKB Action Links are a protocol for sharing CKB transactions as URLs. A user clicks a link, their wallet renders a preview of the transaction, the user signs, and the transaction is submitted to CKB. No dApp navigation, no separate wallet-to-dApp connection flow.

Inspired by Solana Actions, adapted for CKB's Cell model. Instead of a fully-formed transaction signed by the recipient wallet, action links use OTX (Open Transactions) so the publisher can express transaction intent without knowing the consumer's input cells.

## 2. Goals

- Share any CKB transaction intent as a single URL.
- Work across any surface that renders URLs: web pages, chat, email, QR codes.
- No dApp required at consumption time. The wallet is the dApp.
- Wallet-agnostic via CCC.

## 3. Non-goals

- Real-time multi-party coordination. Action links are unicast: one publisher, one signer.
- Replacing dApps for complex workflows. Action links are for atomic intents.
- Mandatory unfurling in social apps. Unfurling is optional and depends on each platform.

## 4. Terminology

- **Action URL:** a URL that, when fetched, returns a CKB Action Manifest.
- **Action Manifest:** JSON document describing the action (title, icon, buttons, etc).
- **Action Endpoint:** the HTTP endpoint that returns Manifests and OTX payloads.
- **OTX:** Open Transaction, a partial CKB transaction the consumer's wallet completes.
- **Action Client:** software that fetches an Action URL, renders the Manifest, and invokes a wallet.
- **Action Publisher:** the party hosting the Action Endpoint.
- **Consumer:** the user whose wallet completes and signs the transaction.

## 5. URL Scheme

Two acceptable forms:

```
ckb-action:https://example.com/actions/tip/truth
https://example.com/actions/tip/truth
```

The `ckb-action:` prefix is preferred for explicit handling. Bare HTTPS URLs work if the Endpoint serves the manifest content type.

Action Endpoints MUST be served over HTTPS in production. HTTP is permitted for `localhost` only.

## 6. Action API

### 6.1 GET request

A GET request to the Action URL MUST return a JSON Manifest with content type `application/json` and the header `X-CKB-Action: true`.

**Manifest schema:**

```json
{
  "type": "action",
  "title": "Tip Truth",
  "description": "Send a tip in CKB or USDI",
  "icon": "https://example.com/icons/tip.png",
  "label": "Send tip",
  "network": "mainnet",
  "links": {
    "actions": [
      {
        "label": "Tip 100 CKB",
        "href": "/actions/tip/truth?amount=100&asset=CKB"
      },
      {
        "label": "Tip custom amount",
        "href": "/actions/tip/truth?amount={amount}&asset={asset}",
        "parameters": [
          { "name": "amount", "label": "Amount", "type": "number", "required": true },
          { "name": "asset", "label": "Asset", "type": "select", "options": ["CKB", "USDI"], "required": true }
        ]
      }
    ]
  }
}
```

**Fields:**

- `type` (required): MUST be `"action"`.
- `title`, `description`, `icon`, `label` (required): human-readable metadata.
- `network` (required): `"mainnet"` or `"testnet"`.
- `links.actions` (required): one or more action buttons. Each entry produces a button in the client UI.
- `parameters` (optional): user-supplied inputs. Templated into `href` using `{name}` placeholders.

### 6.2 POST request

When the user selects an action and submits, the Client sends a POST request to the resolved `href`.

**Request body:**

```json
{
  "address": "ckb1qzda0cr08m85hc8jlnfp3...",
  "params": {
    "amount": 100,
    "asset": "CKB"
  }
}
```

- `address` (required): the consumer's CKB address. Used by the Publisher to compose outputs and capacity calculations.
- `params` (optional): values for any user-supplied parameters declared in the Manifest.

**Response body:**

```json
{
  "type": "transaction",
  "otx": "0x...",
  "encoding": "molecule",
  "message": "Tip 100 CKB to Truth",
  "callback": "https://example.com/actions/tip/truth/confirm"
}
```

- `type` (required): MUST be `"transaction"`.
- `otx` (required): the partial transaction, serialized.
- `encoding` (required): `"molecule"` for binary OTX. `"json"` is allowed for legibility but molecule is canonical.
- `message` (optional): human-readable summary the wallet displays before signing.
- `callback` (optional): URL the Client may POST to after submission, with the transaction hash.

### 6.3 Errors

Error responses use HTTP status codes and a JSON body:

```json
{
  "error": "INSUFFICIENT_CAPACITY",
  "message": "Address has insufficient CKB capacity for this action."
}
```

Defined error codes:

- `INVALID_ADDRESS`
- `INSUFFICIENT_CAPACITY`
- `INVALID_PARAMS`
- `UNSUPPORTED_NETWORK`
- `EXPIRED`
- `INTERNAL`

## 7. OTX Payload Requirements

The returned OTX MUST be a valid Open Transaction per the CoBuild RFC. At minimum:

- All outputs the Publisher controls SHOULD be fully specified.
- Inputs MAY be empty if the consumer provides all capacity.
- If the Publisher contributes inputs (e.g. minting a DOB from a publisher-owned cell), those inputs MUST be signed by the Publisher before transmission.
- Witnesses for consumer inputs MUST be left as placeholders.

The consumer wallet is responsible for:

1. Selecting input cells from the consumer's address to cover output capacity and fees.
2. Adding a change output if needed.
3. Signing all consumer inputs.
4. Submitting the completed transaction to a CKB node.

Lock scripts that support partial signing (Omni Lock with appropriate flags) are recommended for Publisher inputs.

## 8. Client Behavior

A conforming Client MUST:

1. Fetch the Action URL with GET.
2. Validate the Manifest schema.
3. Render the Manifest as a preview card with title, description, icon, and one button per `links.actions` entry.
4. For actions with `parameters`, render input fields and validate user input before enabling the submit button.
5. On submit:
   - Collect the consumer's address from the connected wallet via CCC.
   - POST to the resolved `href` with the address and any params.
   - Pass the returned OTX to the wallet for completion and signing.
6. Display the `message` field to the user before invoking the wallet signature prompt.
7. After signing and submission, optionally POST the transaction hash to the `callback` URL.

A Client SHOULD:

- Cache Manifests for short periods (60s recommended).
- Warn users when an Action URL is on a domain they have not used before.
- Provide a fallback preview page for URLs without a `ckb-action:` scheme.

A Client MUST NOT:

- Submit the transaction without explicit user confirmation.
- Sign on behalf of the consumer without invoking the wallet.

## 9. Wallet Behavior

A wallet that supports CKB Action Links MUST:

1. Accept an OTX via CCC's signing interface.
2. Complete the OTX by adding input cells, change outputs, and fees.
3. Validate that outputs match the Publisher's stated intent before prompting the user.
4. Display the OTX's effective consequences (assets transferred, cells created, scripts invoked) in human-readable form.
5. Prompt the user for explicit signature approval.

A wallet SHOULD:

- Simulate the transaction before display where feasible.
- Refuse OTXs that exceed the consumer's available capacity rather than silently failing.

## 10. Security

### 10.1 Domain trust

Clients SHOULD maintain a list of user-approved domains. First-time interactions with a new domain SHOULD trigger a "connect to site" style prompt.

### 10.2 Transaction simulation

Wallets SHOULD simulate the completed transaction before signing. Simulation reveals:

- Net asset changes for the consumer.
- Cells consumed and created.
- Scripts that will execute.

The wallet MUST display at least the net asset changes before signing.

### 10.3 Replay and expiration

Action Endpoints MAY include a `since` field in OTX inputs or use type-script-enforced expiration. Clients SHOULD honor any `EXPIRED` error from the Endpoint.

### 10.4 Publisher impersonation

The Manifest does not include cryptographic publisher identity. Trust is anchored to the HTTPS domain. A signed manifest mechanism is left as future work.

## 11. Reference flows

### 11.1 Tip jar

1. Publisher hosts an Endpoint at `https://tip.example.com/truth`.
2. User sees the link in a chat app, clicks it.
3. Client fetches the Manifest, renders three buttons: "Tip 10 CKB", "Tip 100 CKB", "Custom amount".
4. User clicks "Tip 100 CKB".
5. Client POSTs `{"address": "ckb1..."}` to `/truth?amount=100`.
6. Endpoint returns an OTX with one output of 100 CKB to Truth's address.
7. Wallet adds the user's input cells, change output, fee. User confirms.
8. Transaction submitted, hash returned.

### 11.2 Mint a DOB

1. Publisher (a DOB project) hosts `https://mint.example.com/series-1`.
2. Manifest declares a single action "Mint" with no parameters.
3. User clicks. Endpoint receives the address, composes an OTX that consumes a Publisher-owned cluster cell (signed by Publisher) and creates a new spore cell owned by the consumer.
4. Wallet adds the mint fee capacity, signs the spore creation. Transaction submitted.

### 11.3 Pay an invoice

1. Merchant generates an Action URL with a one-time invoice ID.
2. Customer scans the QR. Wallet acts as Client.
3. Manifest shows merchant name, amount, item description.
4. Customer confirms. OTX returned. Wallet signs and submits.
5. Endpoint receives the callback, marks invoice paid.

## 12. Open questions

- Whether to define a signed Manifest format for publisher identity verification.
- Whether to support batch actions (multiple transactions per link).
- How to handle Fiber Network payments alongside L1 actions, since Fiber payments are not on-chain transactions but channel state updates. A future companion spec may define `fiber-action:` URLs.
- Whether to support actions that require the consumer to provide a specific cell (e.g. "burn this NFT").
- Which parameter `type` values are normative beyond `number` and `select` shown in §6.1's example. The reference SDK currently accepts `text`, `number`, and `select`. Candidates for future inclusion: `email`, `url`, `boolean`, `date`, `textarea`.
- Whether to specify a normative encoding for binary OTX bodies (`encoding: "molecule"`). The reference SDK enforces `0x`-prefixed hex on the wire because JSON cannot carry raw bytes; alternatives (base64, base64url) would shrink payload at the cost of legibility. The spec's prose says "binary" without committing to an encoding.
- Whether the reference DOB mint example should pin canonical Spore protocol type-script code hashes for each network (mainnet, testnet, devnet) in the spec, or leave that to publishers and the Spore project's own documentation. The current reference uses placeholder hashes for illustration only.

## 13. References

- Solana Actions and Blinks specification: https://solana.com/docs/advanced/actions
- CKB CoBuild RFC: https://talk.nervos.org/t/ckb-open-transaction-otx-cobuild-protocol-overview/7739
- CCC documentation: https://github.com/ckb-devrel/ccc
- Omni Lock script: https://github.com/cryptape/omnilock