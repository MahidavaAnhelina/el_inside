"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { products, type ProductId } from "@/lib/products";
import { FILE_TYPES, MAX_FILES, MAX_FILE_BYTES } from "@/lib/order-limits";
import { useWorkshop } from "./workshop-provider";
import { Icon } from "./icon";

function AttachmentPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Local object URLs must not pass through the Next.js image optimizer.
  return file.type.startsWith("image/") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={image} alt="" width={40} height={40} />
  ) : (
    <span className="file-type">PDF</span>
  );
}

export function OrderForm({ t, locale }: { t: Dictionary; locale: Locale }) {
  const { selection, select } = useWorkshop();
  const [version, setVersion] = useState("same");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [error, setError] = useState("");
  const requestId = useRef("");
  const [sentId, setSentId] = useState("");
  const summary = useRef<HTMLElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const selected = products.find((product) => product.id === selection.product);
  const requiredDetails = selection.kind === "custom" || version === "changes";
  useEffect(() => {
    if (status === "success") summary.current?.focus();
  }, [status]);

  function addFiles(incoming: File[]) {
    const merged = [...files];
    for (const file of incoming)
      if (
        !merged.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        )
      )
        merged.push(file);
    if (
      merged.length > MAX_FILES ||
      merged.some((file) => !FILE_TYPES.includes(file.type) || !file.size) ||
      merged.reduce((total, file) => total + file.size, 0) > MAX_FILE_BYTES
    ) {
      setFileError(true);
      return;
    }
    requestId.current = "";
    setFileError(false);
    setFiles(merged);
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const data = new FormData(event.currentTarget);
    data.set("locale", locale);
    data.set("kind", selection.kind);
    data.set("product", selection.kind === "catalog" ? selection.product : "");
    data.set("version", selection.kind === "catalog" ? version : "same");
    requestId.current ||= crypto.randomUUID();
    data.set("requestId", requestId.current);
    files.forEach((file) => data.append("files", file));
    setError("");
    setStatus("sending");
    try {
      const response = await fetch("/api/orders/", {
        method: "POST",
        body: data,
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        const message =
          response.status === 413
            ? t.tooLarge
            : response.status === 400
              ? t.invalid
              : response.status === 503
                ? t.unavailable
                : t.sendError;
        setError(message);
        setStatus("idle");
        return;
      }
      setSentId(requestId.current);
      setStatus("success");
      setFiles([]);
    } catch {
      setError(t.sendError);
      setStatus("idle");
    }
  }
  function reset() {
    form.current?.reset();
    requestId.current = "";
    setFiles([]);
    setFileError(false);
    setError("");
    setVersion("same");
    select({ kind: "catalog", product: "" });
    setStatus("idle");
    requestAnimationFrame(() =>
      form.current?.querySelector<HTMLInputElement>("input")?.focus(),
    );
  }
  return (
    <div className="form-shell">
      <form
        ref={form}
        onSubmit={submit}
        hidden={status === "success"}
        onChange={() => {
          requestId.current = "";
          setError("");
        }}
      >
        <fieldset disabled={status === "sending"} className="form-fields">
          <fieldset className="request-kind">
            <legend>{t.kindLegend}</legend>
            <div className="kind-options">
              {(
                [
                  ["catalog", t.kindCatalog, t.kindCatalogSub],
                  ["custom", t.kindCustom, t.kindCustomSub],
                ] as const
              ).map(([kind, title, subtitle]) => (
                <label key={kind}>
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={selection.kind === kind}
                    onChange={() => select({ ...selection, kind })}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{subtitle}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {selection.kind === "catalog" && (
            <div>
              <label className="field">
                <span>{t.selectWork}</span>
                <select
                  name="product"
                  required
                  value={selection.product}
                  onChange={(event) =>
                    select({
                      ...selection,
                      product: event.target.value as ProductId | "",
                    })
                  }
                >
                  <option value="">{t.selectPlaceholder}</option>
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {t[product.id]}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <div className="selected-product">
                  <Image
                    src={`/assets/${selected.image}`}
                    alt=""
                    width={48}
                    height={60}
                  />
                  <div>
                    <strong>{t[selected.id]}</strong>
                    <small>{t.selectedHint}</small>
                  </div>
                </div>
              )}
              <fieldset className="version">
                <legend>{t.versionLegend}</legend>
                {(
                  [
                    ["same", t.versionSame],
                    ["changes", t.versionChanges],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="version"
                      value={value}
                      checked={version === value}
                      onChange={() => setVersion(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          <label className="field">
            <span>
              {selection.kind === "custom"
                ? t.customDetails
                : requiredDetails
                  ? t.changesDetails
                  : t.details}
            </span>
            <textarea
              name="details"
              rows={4}
              maxLength={3000}
              required={requiredDetails}
              placeholder={t.detailsPlaceholder}
            />
          </label>
          <div className="field">
            <span id="references-label">{t.references}</span>
            <label
              className={`upload-area${dragging ? " dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (status !== "sending") setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (status !== "sending")
                  addFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <Icon name="upload" />
              <strong>{t.uploadTitle}</strong>
              <small>{t.uploadHint}</small>
              <input
                type="file"
                accept={FILE_TYPES.join(",")}
                multiple
                aria-labelledby="references-label"
                aria-describedby="file-error"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
            <p id="file-error" className="error" role="alert">
              {fileError ? t.fileError : ""}
            </p>
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${file.size}`}>
                  <AttachmentPreview file={file} />
                  <span className="file-name">
                    {file.name}
                    <small>{Math.ceil(file.size / 1024)} KB</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`${t.remove}: ${file.name}`}
                    onClick={() => {
                      setFiles(files.filter((_, i) => i !== index));
                      setFileError(false);
                      requestId.current = "";
                    }}
                  >
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <label className="field">
            <span>{t.linksLabel}</span>
            <textarea
              name="links"
              rows={2}
              maxLength={2000}
              placeholder={t.linksPlaceholder}
            />
          </label>
          <div className="field-pair">
            <label className="field">
              <span>{t.nameLabel}</span>
              <input
                name="name"
                autoComplete="given-name"
                required
                maxLength={80}
                placeholder={t.namePlaceholder}
              />
            </label>
            <label className="field">
              <span>{t.emailLabel}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                placeholder="you@example.com"
              />
            </label>
          </div>
          <label className="field">
            <span>{t.dateLabel}</span>
            <input name="date" type="date" />
            <small className="field-help">{t.dateHint}</small>
          </label>
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <details className="privacy-note">
            <summary>{t.privacyTitle}</summary>
            <p>{t.privacyText}</p>
          </details>
          <button className="button primary submit" type="submit">
            <span>{status === "sending" ? t.sending : t.send}</span>
            <Icon name="arrow" />
          </button>
          <p className="required-note">{t.required}</p>
        </fieldset>
        <p className="error" role="alert">
          {error}
        </p>
        <p className="sending-note" role="status">
          {status === "sending" ? t.sendingHint : ""}
        </p>
      </form>
      {status === "success" && (
        <section
          ref={summary}
          className="summary"
          tabIndex={-1}
          aria-labelledby="summary-title"
        >
          <Icon name="check" />
          <h3 id="summary-title">{t.summaryTitle}</h3>
          <p className="summary-notice">{t.summaryNotice}</p>
          <p>
            {t.requestId}: <code>{sentId}</code>
          </p>
          <button className="button primary" onClick={reset} type="button">
            {t.sendAnother}
          </button>
        </section>
      )}
    </div>
  );
}
