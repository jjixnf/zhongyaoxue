// Field-level provenance is independent of the whole herb's review status.
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const positivePage = value => Number.isInteger(value) && value > 0;
const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const fields = new Set(["indications","usage","cautions","pairings","differentiation","processing","toxicity","specialNotes"]);

export const detailText = items => items.map(item => item.label + "：" + item.text).join("\n");

export function validateSource(source, label, check) {
  check(object(source) && nonempty(source.title), "source title missing " + label);
  check(positivePage(source?.printPage), "source printPage must be positive " + label);
  if (source?.pdfPage !== undefined) check(positivePage(source.pdfPage), "source pdfPage must be positive " + label);
  if (source?.verification !== undefined) {
    const verification = source.verification;
    check(object(verification) && verification.method === "pdf-visual", "invalid verification method " + label);
    check(date(verification?.verifiedAt), "invalid verification date " + label);
    check(nonempty(verification?.scope), "verification scope missing " + label);
    check(positivePage(source.pdfPage), "visual verification needs pdfPage " + label);
  }
}

function validateReview(status, source, label, check) {
  if (status !== undefined) check(nonempty(status), "reviewStatus must be nonempty " + label);
  if (status === "已复核") check(object(source?.verification) && positivePage(source.pdfPage), "reviewed field needs visual verification " + label);
}

export function validateDetails(details, herbId, check) {
  check(object(details), "details must be object " + herbId);
  if (!object(details)) return;
  for (const [field, entry] of Object.entries(details)) {
    const label = field + " for " + herbId;
    check(fields.has(field), "unknown details field " + label);
    check(object(entry) && nonempty(entry.text), "details text missing " + label);
    validateSource(entry?.source, label, check);
    validateReview(entry?.reviewStatus, entry?.source, label, check);
    if (entry?.items === undefined) continue;
    const validItems = Array.isArray(entry.items) && entry.items.length > 0;
    check(validItems, "items must be a nonempty array " + label);
    if (!validItems) continue;
    for (const [index, item] of entry.items.entries()) {
      const itemLabel = "item " + index + " in " + label;
      check(object(item) && nonempty(item.label) && nonempty(item.text), "item label/text missing " + itemLabel);
      if (item?.source !== undefined) validateSource(item.source, itemLabel, check);
      validateReview(item?.reviewStatus ?? entry.reviewStatus, item?.source ?? entry.source, itemLabel, check);
    }
    if (entry.items.every(item => object(item) && nonempty(item.label) && nonempty(item.text))) {
      check(entry.text === detailText(entry.items), "text must preserve every item " + label);
    }
  }
}
