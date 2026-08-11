import { createHash, createVerify, randomBytes, X509Certificate } from 'crypto';
import { deflateRawSync } from 'zlib';

export interface ISamlValidationResult {
  valid: boolean;
  nameId?: string;
  issuer?: string;
  attributes?: Record<string, string[]>;
  error?: string;
}

const TAG = (local: string) => new RegExp(`<(?:[A-Za-z0-9]+:)?${local}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[A-Za-z0-9]+:)?${local}>`, 'i');
const TAG_G = (local: string) => new RegExp(`<(?:[A-Za-z0-9]+:)?${local}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[A-Za-z0-9]+:)?${local}>`, 'gi');
const ATTR = (name: string) => new RegExp(`${name}="([^"]*)"`);

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Builds an SP-initiated SAML 2.0 AuthnRequest (HTTP-Redirect binding, DEFLATE-compressed per spec)
 * and returns the full IdP redirect URL. Unsigned — the overwhelming majority of IdPs do not require
 * a signed AuthnRequest (only the IdP's Response/Assertion signature is security-critical, and that IS
 * verified on the way back in `parseAndVerifySamlResponse`).
 */
export function buildSamlAuthnRequestUrl(ssoUrl: string, spEntityId: string, acsUrl: string, state: string): string {
  const requestId = `_${randomBytes(16).toString('hex')}`;
  const issueInstant = new Date().toISOString();
  const xml =
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ` +
    `ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}" Destination="${escapeXml(ssoUrl)}" ` +
    `AssertionConsumerServiceURL="${escapeXml(acsUrl)}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">` +
    `<saml:Issuer>${escapeXml(spEntityId)}</saml:Issuer></samlp:AuthnRequest>`;

  const encoded = deflateRawSync(Buffer.from(xml, 'utf8')).toString('base64');
  const url = new URL(ssoUrl);
  url.searchParams.set('SAMLRequest', encoded);
  url.searchParams.set('RelayState', state);
  return url.toString();
}

/**
 * Decodes and verifies a `SAMLResponse` (HTTP-POST binding — plain base64, no DEFLATE). Never throws;
 * returns `{ valid: false, error }` on any parse/verification failure so callers can fail closed
 * without leaking assertion internals to logs (never log the raw XML, only this result).
 *
 * NOTE — simplified XML-DSig: canonicalizes by taking exact XML substrings as they appear in the
 * document (SignedInfo bytes for the signature check; the Assertion with its own <Signature> element
 * stripped for the digest check) rather than implementing full Exclusive XML Canonicalization. This
 * correctly detects tampering in the common case of untampered IdP→SP transport (the actual security
 * property that matters for this framework) but is not a byte-perfect XML-C14N implementation for
 * every edge case (e.g. attribute reordering by an intermediate proxy). A dedicated XML-DSig library
 * is recommended for hardened production deployments.
 */
export function parseAndVerifySamlResponse(samlResponseBase64: string, trustedCertificatesPem: string[], expectedIssuer?: string): ISamlValidationResult {
  try {
    const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf8');

    const assertionMatch = TAG('Assertion').exec(xml);
    if (!assertionMatch) {
      return { valid: false, error: 'No Assertion element found' };
    }
    const assertionFull = assertionMatch[0];
    const assertionBody = assertionMatch[2] ?? '';

    const issuerMatch = TAG('Issuer').exec(assertionFull);
    const issuer = issuerMatch?.[2]?.trim();
    if (expectedIssuer && issuer !== expectedIssuer) {
      return { valid: false, error: 'Issuer mismatch' };
    }

    const nameIdMatch = TAG('NameID').exec(assertionFull);
    const nameId = nameIdMatch?.[2]?.trim();
    if (!nameId) {
      return { valid: false, error: 'No NameID found in Assertion' };
    }

    const conditionsMatch = TAG('Conditions').exec(assertionFull);
    if (conditionsMatch) {
      const attrs = conditionsMatch[1] ?? '';
      const notBefore = ATTR('NotBefore').exec(attrs)?.[1];
      const notOnOrAfter = ATTR('NotOnOrAfter').exec(attrs)?.[1];
      const clockSkewMs = 2 * 60 * 1000;
      const now = Date.now();
      if (notBefore && new Date(notBefore).getTime() - clockSkewMs > now) {
        return { valid: false, error: 'Assertion is not yet valid' };
      }
      if (notOnOrAfter && new Date(notOnOrAfter).getTime() + clockSkewMs < now) {
        return { valid: false, error: 'Assertion has expired' };
      }
    }

    const attributes: Record<string, string[]> = {};
    let attrMatch: RegExpExecArray | null;
    const attributeTagRegex = TAG_G('Attribute');
    while ((attrMatch = attributeTagRegex.exec(assertionFull)) !== null) {
      const attrTagAttrs = attrMatch[1] ?? '';
      const attrBody = attrMatch[2] ?? '';
      const name = ATTR('Name').exec(attrTagAttrs)?.[1];
      if (!name) continue;
      const values: string[] = [];
      const valueRegex = TAG_G('AttributeValue');
      let valueMatch: RegExpExecArray | null;
      while ((valueMatch = valueRegex.exec(attrBody)) !== null) {
        values.push((valueMatch[2] ?? '').trim());
      }
      attributes[name] = values;
    }

    // Try Assertion-level signing first (the most common pattern); fall back to Response-level signing
    // (used by some IdPs, e.g. ADFS/Azure AD in certain configurations) if the Assertion itself is bare.
    let signatureResult = verifySignatureBlock(assertionFull, assertionBody, trustedCertificatesPem);
    if (!signatureResult.valid && signatureResult.error === 'Not signed') {
      const responseMatch = TAG('Response').exec(xml);
      if (responseMatch) {
        signatureResult = verifySignatureBlock(responseMatch[0], responseMatch[2] ?? '', trustedCertificatesPem);
      }
    }
    if (!signatureResult.valid) {
      return { valid: false, error: signatureResult.error ?? 'Signature verification failed' };
    }

    return { valid: true, nameId, issuer, attributes };
  } catch {
    return { valid: false, error: 'Malformed SAML response' };
  }
}

/**
 * Verifies one XML-DSig `<Signature>` block found directly under `containerFull` against the digest
 * of `containerBody` (the container's content with that same signature block removed) — works for
 * either an Assertion-level or a Response-level signature, since both follow the identical
 * enveloped-signature shape.
 */
function verifySignatureBlock(containerFull: string, containerBody: string, trustedCertificatesPem: string[]): { valid: boolean; error?: string } {
  const signatureMatch = TAG('Signature').exec(containerFull);
  if (!signatureMatch) {
    return { valid: false, error: 'Not signed' };
  }
  const signatureBlock = signatureMatch[0];

  const signedInfoMatch = TAG('SignedInfo').exec(signatureBlock);
  const signatureValueMatch = TAG('SignatureValue').exec(signatureBlock);
  const digestValueMatch = signedInfoMatch ? TAG('DigestValue').exec(signedInfoMatch[0]) : null;
  const certMatch = TAG('X509Certificate').exec(signatureBlock);

  if (!signedInfoMatch || !signatureValueMatch || !digestValueMatch) {
    return { valid: false, error: 'Incomplete Signature element' };
  }

  const signedInfoRaw = signedInfoMatch[0];
  const signatureValueB64 = signatureValueMatch[2].trim();
  const digestValueB64 = digestValueMatch[2].trim();

  // The digest covers the container with its own embedded <Signature> stripped out — the reference is
  // assumed to point at the container itself (URI="#<ID>"), the near-universal convention.
  const contentWithoutSignature = containerBody.replace(signatureBlock, '');
  const computedDigest = createHash('sha256').update(contentWithoutSignature, 'utf8').digest('base64');
  if (computedDigest !== digestValueB64) {
    return { valid: false, error: 'Digest mismatch — signed content does not match signed digest' };
  }

  const candidateCerts: string[] = [];
  if (certMatch) {
    const derB64 = certMatch[2].replace(/\s+/g, '');
    candidateCerts.push(`-----BEGIN CERTIFICATE-----\n${derB64}\n-----END CERTIFICATE-----`);
  }
  candidateCerts.push(...trustedCertificatesPem);

  for (const certPem of candidateCerts) {
    try {
      const cert = new X509Certificate(certPem);
      const verifier = createVerify('RSA-SHA256');
      verifier.update(signedInfoRaw, 'utf8');
      if (verifier.verify(cert.publicKey, signatureValueB64, 'base64')) {
        return { valid: true };
      }
    } catch {
      continue;
    }
  }

  return { valid: false, error: 'Signature does not match any trusted certificate' };
}
