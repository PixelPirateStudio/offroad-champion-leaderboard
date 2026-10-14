import { useEffect, useRef, useState } from "react";
import { FaRegCopy, FaSyncAlt, FaTimes, FaWallet, FaArrowDown, FaArrowUp, FaArrowRight, FaCheck, FaClock, FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";
import { playerApi, type BitgoDeposit, type BitgoPayout, type BitgoQuote, type BitgoStatus } from "@/services/playerApi";
import styles from "@/styles/BitgoFlow.module.css";

type Props = { mode: "deposit" | "withdraw"; amount: string; onClose: () => void; onUpdate: () => void };
type WithdrawalRequest = { amount: string; address: string; requestKey: string; expectedFeeCents: number };
const message = (error: unknown) => error instanceof Error ? error.message : "BitGo could not be reached.";
const money = (cents: number) => (cents / 100).toFixed(2);

export default function BitgoFlow({ mode, amount: initialAmount, onClose, onUpdate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const update = useRef(onUpdate);
  update.current = onUpdate;
  const [status, setStatus] = useState<BitgoStatus | null>(null);
  const [deposit, setDeposit] = useState<BitgoDeposit | null>(null);
  const [payout, setPayout] = useState<BitgoPayout | null>(null);
  const [amount, setAmount] = useState(initialAmount || "1.00");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<BitgoQuote | null>(null);
  const [request, setRequest] = useState<WithdrawalRequest | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const depositId = deposit?.id;
  const creditedGains = deposit?.creditedGains;
  const payoutId = payout?.id;
  const payoutStatus = payout?.status;
  const storageKey = () => `bitgo-withdrawal:${localStorage.getItem("playerProfileId")}`;

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    async function start() {
      try {
        const state = await playerApi.getBitgoStatus();
        if (!active) return;
        setStatus(state);
        if (mode === "deposit") {
          const result = await playerApi.createBitgoDeposit();
          if (active) setDeposit(result);
        } else {
          const current = await playerApi.getCurrentBitgoPayout();
          if (active) {
            setPayout(current);
            const saved = sessionStorage.getItem(storageKey());
            if (!current && saved) {
              const pending = JSON.parse(saved) as WithdrawalRequest;
              setRequest(pending);
              setAmount(pending.amount);
              setAddress(pending.address);
            }
          }
        }
      } catch (err) { if (active) setError(message(err)); }
      finally { if (active) setBusy(false); }
    }
    void start();
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    if (!depositId && payoutStatus !== "processing") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (depositId) {
          const next = await playerApi.getBitgoDeposit();
          if (!active) return;
          setDeposit(next);
          if (next.creditedGains !== creditedGains) update.current();
        } else if (payoutId) {
          const next = await playerApi.getBitgoPayout(payoutId);
          if (!active) return;
          setPayout(next);
          if (next.status !== "processing") {
            sessionStorage.removeItem(storageKey());
            update.current();
          }
        }
        if (active) setError("");
      } catch (err) { if (active) setError(message(err)); }
      if (active) timer = setTimeout(poll, 8000);
    }
    timer = setTimeout(poll, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [depositId, creditedGains, payoutId, payoutStatus]);

  async function review() {
    setBusy(true); setError("");
    try {
      if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim()) || /^0x0{40}$/i.test(address.trim())) throw new Error("Enter a valid Arc Testnet receiving address.");
      setQuote(await playerApi.getBitgoQuote(amount));
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!request && !quote) return;
    setBusy(true); setError("");
    try {
      const body = request || { amount, address: address.trim(), requestKey: crypto.randomUUID(), expectedFeeCents: quote!.feeCents };
      // Keep the same key when a response is lost, including after a page reload.
      sessionStorage.setItem(storageKey(), JSON.stringify(body));
      setRequest(body);
      const result = await playerApi.createBitgoPayout(body);
      setPayout(result);
      update.current();
    } catch (err) {
      setError(message(err));
      const status = (err as { status?: number }).status;
      if (status && [400, 401, 403, 409, 503].includes(status)) {
        sessionStorage.removeItem(storageKey());
        setRequest(null);
        setQuote(null);
      }
    }
    finally { setBusy(false); }
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="bitgo-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <header className={styles.header}>
        <span className={styles.brandIcon}><FaWallet aria-hidden="true" /></span>
        <div className={styles.heading}><span className={styles.eyebrow}>ORC WALLET / BITGO</span><h2 id="bitgo-title">{mode === "deposit" ? "Add Cash" : "Withdraw"} with BitGo</h2></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close BitGo" title="Close"><FaTimes /></button>
      </header>
      <div className={styles.body}>
        <div className={styles.assetRow}><span className={styles.assetIcon} aria-hidden="true">{mode === "deposit" ? <FaArrowDown /> : <FaArrowUp />}</span><div><strong>USDC</strong><span>Arc Testnet</span></div><span className={styles.badge}>Test mode</span></div>
        <p className={styles.notice}><FaExclamationTriangle aria-hidden="true" /><span>Test funds only. Do not send real funds or use another network.</span></p>
        {busy && <p className={styles.loading} role="status"><FaSyncAlt className={styles.spin} aria-hidden="true" />{status ? "Please wait..." : "Connecting to BitGo..."}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {mode === "deposit" && deposit && <>
          <h3 className={styles.sectionTitle}>Send USDC to your wallet</h3>
          <p className={styles.muted}>Your balance updates after BitGo confirms the deposit.</p>
          <span className={styles.label} id="bitgo-address-label">Your deposit address</span>
          <div className={styles.addressRow}>
            <code aria-labelledby="bitgo-address-label">{deposit.address}</code>
            <button type="button" title="Copy deposit address" aria-label="Copy deposit address" onClick={async () => {
              try { await navigator.clipboard.writeText(deposit.address); setCopied(true); }
              catch { setError("Copy failed. Select the address and copy it manually."); }
            }}>{copied ? <FaCheck /> : <FaRegCopy />}</button>
          </div>
          <div className={styles.copyStatus} role="status">{copied ? "Address copied" : "Only USDC on Arc Testnet"}</div>
          <dl className={styles.summary}>
            <dt>Test conversion, before fees</dt><dd>1 USDC = 100 GM</dd>
            <dt>ORC deposit fee</dt><dd>{deposit.platformFeeBps / 100}%</dd>
            <dt>Test provider fee</dt><dd>{deposit.providerFeeAmount.toFixed(2)} USDC</dd>
            <dt>Total received here</dt><dd>{deposit.receivedAmount.toFixed(2)} USDC</dd>
            <dt>Total ORC fees charged</dt><dd>{deposit.platformFeeAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} USDC</dd>
            <dt>Total credited here</dt><dd>{deposit.creditedGains.toLocaleString()} GM</dd>
          </dl>
          <p className={styles.tracking}><FaClock aria-hidden="true" />{error ? "Deposit updates temporarily unavailable" : "Checking for deposits automatically"}</p>
          <p className={styles.muted}>The 2% ORC fee is deducted from new deposits. Sending-wallet network fees are separate. Fractions below one GM carry forward. Provider fees shown here are for testing only.</p>
          <a className={styles.faucet} href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Get free test USDC <FaExternalLinkAlt aria-hidden="true" /></a>
        </>}
        {mode === "withdraw" && status && !payout && <>
          {!status.payoutsEnabled && <p role="status">{status.payoutMessage}</p>}
          <h3 className={styles.sectionTitle}>{quote ? "Review your withdrawal" : "Where should we send it?"}</h3>
          <label className={styles.label} htmlFor="bitgo-amount">Amount from wallet (USD)</label>
          <div className={styles.amountInput}><span aria-hidden="true">$</span><input id="bitgo-amount" type="number" min="1" max="1000" step="0.01" value={amount} disabled={busy || !!request} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} /><span>USD</span></div>
          <label className={styles.label} htmlFor="bitgo-destination">External Arc Testnet address</label>
          <input id="bitgo-destination" className={styles.destination} value={address} autoComplete="off" spellCheck={false} disabled={busy || !!request} onChange={(e) => { setAddress(e.target.value); setQuote(null); }} placeholder="0x..." />
          <p className={styles.fieldHint}>Use a receiving address on Arc Testnet.</p>
          {quote && <dl className={styles.summary}>
            <dt>Wallet debit</dt><dd>${money(quote.amountCents)}</dd>
            <dt>ORC fee ({quote.platformFeeBps / 100}%)</dt><dd>{money(quote.platformFeeCents)} USDC</dd>
            <dt>Test provider fee</dt><dd>{money(quote.providerFeeCents)} USDC</dd>
            <dt>Total fees</dt><dd>{money(quote.feeCents)} USDC</dd>
            <dt className={styles.totalLabel}>You receive</dt><dd className={styles.total}>{money(quote.netCents)} <small>USDC</small></dd>
          </dl>}
          <p className={styles.muted}>The ORC fee is 2% of the withdrawal, rounded up to the nearest cent. Both fees are deducted from the amount sent. The test provider fee is simulated, not a live BitGo quote. Transfers cannot be reversed.</p>
          <button className={styles.primary} type="button" disabled={busy || !status.payoutsEnabled} onClick={() => void (request || quote ? submit() : review())}>
            {request ? "Check / retry same request" : quote ? "Confirm test withdrawal" : "Review withdrawal"}
            <FaArrowRight aria-hidden="true" />
          </button>
          {request && !payout && <p className={styles.muted}>This request is saved. Retrying uses the same withdrawal ID.</p>}
        </>}
        {payout && <>
          <div aria-hidden="true" className={`${styles.resultIcon} ${payout.status === "completed" ? styles.success : payout.status === "failed" ? styles.failure : styles.pending}`}>{payout.status === "completed" ? <FaCheck /> : payout.status === "failed" ? <FaExclamationTriangle /> : <FaClock />}</div>
          <h3 className={styles.sectionTitle}>{payout.status === "completed" ? "Withdrawal confirmed" : payout.status === "failed" ? "Withdrawal failed" : "Withdrawal processing"}</h3>
          <p role="status">{payout.message}</p>
          <dl className={styles.summary}>
            <dt>Amount</dt><dd>${money(payout.amountCents)}</dd>
            <dt>ORC fee ({payout.platformFeeBps / 100}%)</dt><dd>{money(payout.platformFeeCents)} USDC</dd>
            <dt>Test provider fee</dt><dd>{money(payout.providerFeeCents)} USDC</dd>
            <dt>Total fees</dt><dd>{money(payout.feeCents)} USDC</dd>
            <dt className={styles.totalLabel}>Recipient amount</dt><dd className={styles.total}>{money(payout.netCents)} <small>USDC</small></dd>
          </dl>
          <span className={styles.label}>Destination</span><p className={styles.hash}>{payout.address}</p>
          {payout.transactionHash && <><span className={styles.label}>Transaction ID</span><p className={styles.hash}>{payout.transactionHash}</p></>}
          <button className={styles.primary} type="button" disabled={busy} onClick={onClose}>Back to wallet <FaArrowRight aria-hidden="true" /></button>
        </>}
        {!busy && !status && <button type="button" onClick={onClose}><FaSyncAlt aria-hidden="true" /> Close and retry</button>}
      </div>
    </dialog>
  );
}
