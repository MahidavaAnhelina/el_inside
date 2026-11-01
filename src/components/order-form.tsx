"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { Dictionary, Locale } from "@/lib/i18n";
import { products, type ProductId } from "@/lib/products";
import { FILE_TYPES, MAX_FILES, MAX_FILE_BYTES } from "@/lib/order-limits";
import { useWorkshop } from "./workshop-provider";
import { Icon } from "./icon";
import { Turnstile } from "./turnstile";
import { BrandText } from "./brand-name";
import {
  orderSchema,
  fieldErrorsFromIssues,
  orderFields,
  todayInPoland,
  type FieldErrors,
  type OrderField,
} from "@/lib/order-schema";

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [token, setToken] = useState("");
  const [resetCount, setResetCount] = useState(0);
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
    setFieldErrors((previous) => ({ ...previous, files: undefined }));
    setFiles(merged);
    setError("");
  }
  const messages: Record<OrderField, string> = {
    product: t.errorProduct,
    details: t.errorDetails,
    links: t.errorLinks,
    name: t.errorName,
    email: t.errorEmail,
    date: t.errorDate,
    files: t.errorFiles,
  };
  function fieldProps(name: OrderField) {
    return {
      id: `order-${name}`,
      "aria-invalid": !!fieldErrors[name],
      "aria-describedby": fieldErrors[name] ? `order-${name}-error` : undefined,
    };
  }
  function fieldError(name: OrderField) {
    return fieldErrors[name] ? (
      <span className="field-error" id={`order-${name}-error`}>
        {messages[name]}
      </span>
    ) : null;
  }
  function collectData(element: HTMLFormElement) {
    const data = new FormData(element);
    data.set("locale", locale);
    data.set("kind", selection.kind);
    data.set("product", selection.kind === "catalog" ? selection.product : "");
    data.set("version", selection.kind === "catalog" ? version : "same");
    data.set("requestId", requestId.current || crypto.randomUUID());
    return data;
  }
  function validate(element: HTMLFormElement, data: FormData) {
    const parsed = orderSchema.safeParse(Object.fromEntries(data));
    const errors = parsed.success
      ? {}
      : fieldErrorsFromIssues(parsed.error.issues);
    const date = element.elements.namedItem("date") as HTMLInputElement | null;
    if (date?.validity.badInput) errors.date = "invalid";
    return errors;
  }
  function focusField(name: OrderField) {
    const element = form.current?.querySelector<HTMLElement>(
      `[id="order-${name}"]`,
    );
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center", behavior: "instant" });
  }
  function showErrors(errors: FieldErrors) {
    flushSync(() => setFieldErrors(errors));
    const first = orderFields.find((name) => errors[name]);
    if (first) focusField(first);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    requestId.current ||= crypto.randomUUID();
    const data = collectData(event.currentTarget);
    const errors = validate(event.currentTarget, data);
    if (Object.keys(errors).length) {
      setError("");
      showErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token) {
      setError(t.verificationRequired);
      return;
    }
    data.set("cf-turnstile-response", token);
    files.forEach((file) => data.append("files", file));
    setError("");
    setStatus("sending");
    try {
      const response = await fetch("/api/orders/", {
        method: "POST",
        body: data,
        signal: AbortSignal.timeout(35000),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 413) {
          const result = await response.json().catch(() => null);
          const errors: FieldErrors = {};
          for (const field of orderFields)
            if (result?.fields?.[field]) errors[field] = "invalid";
          if (Object.keys(errors).length) {
            setStatus("idle");
            showErrors(errors);
            return;
          }
        }
        let uncertainId = requestId.current;
        if (response.status === 409) {
          const result = await response.json().catch(() => null);
          if (typeof result?.requestId === "string")
            uncertainId = result.requestId;
        }
        const message =
          response.status === 403
            ? t.verificationRequired
            : response.status === 429
              ? t.rateLimited
              : response.status === 409
                ? `${t.deliveryUncertain} ${uncertainId}`
                : response.status === 413
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
      const result = await response.json();
      setSentId(result.requestId);
      setStatus("success");
      setFiles([]);
    } catch {
      setError(`${t.deliveryUncertain} ${requestId.current}`);
      setStatus("idle");
    } finally {
      setToken("");
      setResetCount((value) => value + 1);
    }
  }
  function reset() {
    form.current?.reset();
    requestId.current = "";
    setFiles([]);
    setFileError(false);
    setError("");
    setFieldErrors({});
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
        noValidate
        onSubmit={submit}
        onBlur={(event) => {
          const name = event.target.getAttribute("name") as OrderField;
          if (!orderFields.includes(name) || name === "files") return;
          const errors = validate(
            event.currentTarget,
            collectData(event.currentTarget),
          );
          setFieldErrors((previous) => ({ ...previous, [name]: errors[name] }));
        }}
        hidden={status === "success"}
        onChange={(event) => {
          requestId.current = "";
          setError("");
          const name = event.target.getAttribute("name") || "";
          setFieldErrors((previous) => {
            const next = { ...previous };
            if (orderFields.includes(name as OrderField))
              delete next[name as OrderField];
            if (name === "kind" || name === "version") {
              delete next.product;
              delete next.details;
            }
            return next;
          });
        }}
      >
        {orderFields.some((name) => fieldErrors[name]) && (
          <div className="form-error-summary" role="alert">
            <strong>{t.errorSummary}</strong>
            <ul>
              {orderFields
                .filter((name) => fieldErrors[name])
                .map((name) => (
                  <li key={name}>
                    <a
                      href={`#order-${name}`}
                      onClick={(event) => {
                        event.preventDefault();
                        focusField(name);
                      }}
                    >
                      {messages[name]}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
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
                  {...fieldProps("product")}
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
                {fieldError("product")}
              </label>
              {selected && (
                <div className="selected-product">
                  <Image
                    unoptimized
                    src={`/assets/${selected.image.replace(".webp", "-thumb.webp")}`}
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
              {...fieldProps("details")}
              name="details"
              rows={4}
              maxLength={3000}
              required={requiredDetails}
              placeholder={t.detailsPlaceholder}
            />
            {fieldError("details")}
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
                {...fieldProps("files")}
                type="file"
                accept={FILE_TYPES.join(",")}
                multiple
                aria-labelledby="references-label"
                aria-describedby={`file-error${fieldErrors.files ? " order-files-error" : ""}`}
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
            <p id="file-error" className="error" role="alert">
              {fileError ? t.fileError : ""}
            </p>
            {fieldError("files")}
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
                      setFieldErrors((previous) => ({
                        ...previous,
                        files: undefined,
                      }));
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
              {...fieldProps("links")}
              name="links"
              rows={2}
              maxLength={2000}
              placeholder={t.linksPlaceholder}
            />
            {fieldError("links")}
          </label>
          <div className="field-pair">
            <label className="field">
              <span>{t.nameLabel}</span>
              <input
                {...fieldProps("name")}
                name="name"
                autoComplete="given-name"
                required
                maxLength={80}
                placeholder={t.namePlaceholder}
              />
              {fieldError("name")}
            </label>
            <label className="field">
              <span>{t.emailLabel}</span>
              <input
                {...fieldProps("email")}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                placeholder="you@example.com"
              />
              {fieldError("email")}
            </label>
          </div>
          <label className="field">
            <span>{t.dateLabel}</span>
            <input
              {...fieldProps("date")}
              name="date"
              type="date"
              min={todayInPoland()}
              max="9999-12-31"
              aria-describedby={`date-hint${fieldErrors.date ? " order-date-error" : ""}`}
            />
            {fieldError("date")}
            <small className="field-help" id="date-hint">
              {t.dateHint}
            </small>
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
            <p>
              <BrandText>{t.privacyText}</BrandText>
            </p>
          </details>
          {status !== "success" && (
            <Turnstile
              t={t}
              locale={locale}
              resetCount={resetCount}
              onToken={setToken}
            />
          )}
          <button
            className="button primary submit"
            type="submit"
            disabled={!token}
          >
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
