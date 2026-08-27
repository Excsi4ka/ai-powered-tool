import dns from "node:dns/promises";
import net from "node:net";
import { AppError } from "../middleware/error.middleware.js";

export interface JobPostingContent {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
  sourceUrl: string;
}

export interface JobPostingServiceContract {
  extractFromUrl(jobUrl: string): Promise<JobPostingContent>;
}

const MAX_JOB_POSTING_BYTES = 2 * 1024 * 1024;
const MAX_JOB_DESCRIPTION_LENGTH = 30000;
const JOB_FETCH_TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 4;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, rawEntity: string) => {
    const lowerEntity = rawEntity.toLowerCase();
    const namedEntities: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    };

    if (lowerEntity in namedEntities) {
      return namedEntities[lowerEntity];
    }

    if (lowerEntity.startsWith("#x")) {
      const codePoint = Number.parseInt(lowerEntity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (lowerEntity.startsWith("#")) {
      const codePoint = Number.parseInt(lowerEntity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return entity;
  });

const stripHtmlToText = (html: string): string => {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|p|div|li|tr|td|th|h[1-6]|section|article|main)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(decodeHtmlEntities(text));
};

const truncateDescription = (value: string): string => value.slice(0, MAX_JOB_DESCRIPTION_LENGTH).trim();

const getMetaContent = (html: string, names: string[]): string | undefined => {
  for (const name of names) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const metaTag = html.match(new RegExp(`<meta\\b[^>]*(?:name|property)=["']${escapedName}["'][^>]*>`, "i"))?.[0];
    const content = metaTag?.match(/\scontent=["']([^"']+)["']/i)?.[1];

    if (content) {
      return normalizeWhitespace(decodeHtmlEntities(content));
    }
  }

  return undefined;
};

const getTitle = (html: string): string | undefined => {
  const metaTitle = getMetaContent(html, ["og:title", "twitter:title", "title"]);

  if (metaTitle) {
    return metaTitle;
  }

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? stripHtmlToText(title) : undefined;
};

const getCompany = (html: string): string | undefined => getMetaContent(html, ["og:site_name", "twitter:site"]);

const findJobPostingNode = (value: unknown): Record<string, unknown> | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findJobPostingNode(item);
      if (result) {
        return result;
      }
    }
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const objectValue = value as Record<string, unknown>;
  const typeValue = objectValue["@type"];
  const typeList = Array.isArray(typeValue) ? typeValue : [typeValue];
  const isJobPosting = typeList.some((type) => String(type).toLowerCase() === "jobposting");

  if (isJobPosting) {
    return objectValue;
  }

  for (const child of Object.values(objectValue)) {
    const result = findJobPostingNode(child);
    if (result) {
      return result;
    }
  }

  return undefined;
};

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  return normalizeWhitespace(decodeHtmlEntities(value));
};

const getOrganizationName = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return getOrganizationName(value[0]);
  }

  if (typeof value === "string") {
    return normalizeWhitespace(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  return getStringValue((value as Record<string, unknown>).name);
};

const extractStructuredJobPosting = (html: string): Partial<JobPostingContent> => {
  const scriptPattern = /<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1].trim()));
      const jobPosting = findJobPostingNode(parsed);

      if (!jobPosting) {
        continue;
      }

      const rawDescription = getStringValue(jobPosting.description);
      const jobDescription = rawDescription ? stripHtmlToText(rawDescription) : undefined;

      return {
        jobDescription,
        jobTitle: getStringValue(jobPosting.title),
        company: getOrganizationName(jobPosting.hiringOrganization),
      };
    } catch {
      continue;
    }
  }

  return {};
};

const getLargestContentBlock = (html: string): string => {
  const blocks = [...html.matchAll(/<(main|article|section)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);

  if (blocks.length === 0) {
    return html;
  }

  return blocks.reduce((largest, current) => (stripHtmlToText(current).length > stripHtmlToText(largest).length ? current : largest));
};

const isPrivateIpv4 = (ip: string): boolean => {
  const octets = ip.split(".").map((part) => Number.parseInt(part, 10));

  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
};

const isPrivateIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::" || normalized.startsWith("::ffff:")) {
    return true;
  }

  const firstGroup = Number.parseInt(normalized.split(":")[0], 16);

  if (!Number.isFinite(firstGroup)) {
    return true;
  }

  return (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
};

const isPrivateAddress = (address: string): boolean => {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }

  return true;
};

export class JobPostingService implements JobPostingServiceContract {
  async extractFromUrl(jobUrl: string): Promise<JobPostingContent> {
    let currentUrl = await this.validateJobUrl(jobUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(JOB_FETCH_TIMEOUT_MS),
        headers: {
          accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
          "user-agent": "HireLensAI/1.0 job-url-parser",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location) {
          throw new AppError("JOB_URL_FETCH_FAILED", "Job URL redirected without a location.", 400);
        }

        currentUrl = await this.validateJobUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) {
        throw new AppError("JOB_URL_FETCH_FAILED", "Unable to fetch the job URL.", 400);
      }

      return this.parseResponse(response, currentUrl.toString());
    }

    throw new AppError("JOB_URL_FETCH_FAILED", "Job URL redirected too many times.", 400);
  }

  private async parseResponse(response: Response, sourceUrl: string): Promise<JobPostingContent> {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml");
    const isText = contentType.includes("text/plain") || contentType.length === 0;

    if (!isHtml && !isText) {
      throw new AppError("JOB_URL_UNSUPPORTED_CONTENT", "Job URL must return an HTML or plain-text job posting.", 400);
    }

    const rawBody = await this.readLimitedBody(response);
    const structured = isHtml ? extractStructuredJobPosting(rawBody) : {};
    const fallbackDescription = isHtml ? stripHtmlToText(getLargestContentBlock(rawBody)) : normalizeWhitespace(rawBody);
    const jobDescription = truncateDescription(structured.jobDescription || fallbackDescription);

    if (jobDescription.length < 80) {
      throw new AppError("JOB_DESCRIPTION_NOT_FOUND", "Could not extract a usable job description from that URL.", 400);
    }

    return {
      sourceUrl,
      jobDescription,
      jobTitle: structured.jobTitle || (isHtml ? getTitle(rawBody) : undefined),
      company: structured.company || (isHtml ? getCompany(rawBody) : undefined),
    };
  }

  private async validateJobUrl(value: string): Promise<URL> {
    let parsed: URL;

    try {
      parsed = new URL(value);
    } catch {
      throw new AppError("INVALID_JOB_URL", "Job URL must be a valid URL.", 400);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new AppError("INVALID_JOB_URL", "Job URL must use HTTP or HTTPS.", 400);
    }

    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
      throw new AppError("INVALID_JOB_URL", "Job URL cannot point to a local or private host.", 400);
    }

    let addresses: Array<{ address: string; family: number }>;

    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch {
      throw new AppError("JOB_URL_FETCH_FAILED", "Unable to resolve the job URL host.", 400);
    }

    if (addresses.length === 0 || addresses.some((address) => isPrivateAddress(address.address))) {
      throw new AppError("INVALID_JOB_URL", "Job URL cannot point to a local or private host.", 400);
    }

    return parsed;
  }

  private async readLimitedBody(response: Response): Promise<string> {
    if (!response.body) {
      return "";
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        totalBytes += value.byteLength;

        if (totalBytes > MAX_JOB_POSTING_BYTES) {
          throw new AppError("JOB_URL_TOO_LARGE", "Job URL response is too large to process.", 413);
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks).toString("utf8");
  }
}

export const jobPostingService = new JobPostingService();
